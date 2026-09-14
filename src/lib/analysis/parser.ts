/**
 * Static code parser used by the analyzer.
 *
 * Extracts functions, classes, methods, interfaces, types, imports, exports and
 * function calls with name / file / line / column / type / parent symbol, plus
 * cyclomatic complexity per function and per file.
 *
 * The edge analyzer runs this deterministic scanner (no native bindings are
 * available in the serverless runtime); the standalone worker in `backend/`
 * runs the same contract on top of Tree-sitter grammars.
 */

export type SymbolType =
  | "function"
  | "class"
  | "method"
  | "interface"
  | "type"
  | "import"
  | "export"
  | "call";

export interface ParsedSymbol {
  name: string;
  type: SymbolType;
  line: number;
  column: number;
  parent: string | null;
  complexity: number;
}

export interface ParsedImport {
  /** Raw module specifier as written in the source. */
  specifier: string;
  line: number;
}

export interface ParsedFile {
  path: string;
  language: string;
  symbols: ParsedSymbol[];
  imports: ParsedImport[];
  /** Sum of function complexities (minimum 1 for a non-empty file). */
  complexity: number;
  maxComplexity: number;
  avgComplexity: number;
}

export const PARSEABLE_LANGUAGES = new Set([
  "JavaScript",
  "JSX",
  "TypeScript",
  "TSX",
  "Python",
  "Java",
  "Go",
]);

export function isParseable(language: string) {
  return PARSEABLE_LANGUAGES.has(language);
}

const MAX_CALLS_PER_FILE = 400;

const RESERVED_CALLS = new Set([
  "if","for","while","switch","catch","return","function","typeof","new","await","case",
  "do","else","super","this","import","export","print","def","class","try","except","with",
  "range","len","in","not","and","or","go","defer","make","chan","select","func","var","let",
  "const","require","interface","type","struct","package","public","private","protected","static",
  "throw","yield","delete","void","instanceof","elif","lambda","assert","raise","from","as",
]);

/** Replaces comment and string contents with spaces, preserving line structure. */
function stripNoise(source: string, language: string): string {
  const python = language === "Python";
  const out = source.split("");
  let i = 0;
  const n = source.length;

  const blank = (from: number, to: number) => {
    for (let k = from; k < to && k < n; k += 1) {
      if (out[k] !== "\n") out[k] = " ";
    }
  };

  while (i < n) {
    const ch = source[i]!;
    const next = source[i + 1];

    if (!python && ch === "/" && next === "/") {
      let end = source.indexOf("\n", i);
      if (end === -1) end = n;
      blank(i, end);
      i = end;
      continue;
    }
    if (!python && ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (python && ch === "#") {
      let end = source.indexOf("\n", i);
      if (end === -1) end = n;
      blank(i, end);
      i = end;
      continue;
    }
    if (python && (source.startsWith('"""', i) || source.startsWith("'''", i))) {
      const quote = source.slice(i, i + 3);
      const end = source.indexOf(quote, i + 3);
      const stop = end === -1 ? n : end + 3;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      let k = i + 1;
      while (k < n) {
        if (source[k] === "\\") {
          k += 2;
          continue;
        }
        if (source[k] === ch) break;
        if (source[k] === "\n" && ch !== "`") break;
        k += 1;
      }
      blank(i + 1, k);
      i = Math.min(k + 1, n);
      continue;
    }
    i += 1;
  }

  return out.join("");
}

const DECISION_PATTERNS = [
  /\bif\b/g,
  /\belse\s+if\b/g,
  /\belif\b/g,
  /\bfor\b/g,
  /\bwhile\b/g,
  /\bcase\b/g,
  /\bcatch\b/g,
  /\bexcept\b/g,
  /&&/g,
  /\|\|/g,
  /\?\?/g,
];

/** McCabe-style cyclomatic complexity: 1 + number of decision points. */
function complexityOf(body: string): number {
  let score = 1;
  for (const pattern of DECISION_PATTERNS) {
    const matches = body.match(pattern);
    if (matches) score += matches.length;
  }
  // Ternaries, excluding optional chaining / nullish which are matched above.
  const ternaries = body.match(/(?<![?.])\?(?!\?|\.)/g);
  if (ternaries) score += ternaries.length;
  return score;
}

function lineOf(prefixLines: number[], index: number): number {
  // Binary search over line start offsets.
  let low = 0;
  let high = prefixLines.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (prefixLines[mid]! <= index) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

/** Finds the body of a brace-delimited block starting at or after `from`. */
function braceBody(source: string, from: number): { start: number; end: number } | null {
  const open = source.indexOf("{", from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { start: open, end: i };
    }
  }
  return { start: open, end: source.length };
}

interface Region {
  name: string;
  start: number;
  end: number;
}

function parentAt(regions: Region[], index: number): string | null {
  let best: Region | null = null;
  for (const region of regions) {
    if (index > region.start && index <= region.end) {
      if (!best || region.start > best.start) best = region;
    }
  }
  return best?.name ?? null;
}

interface Rule {
  pattern: RegExp;
  type: SymbolType;
  /** Group index holding the symbol name. */
  group?: number;
  /** Complexity is measured for the following block. */
  measured?: boolean;
}

const C_LIKE_RULES: Rule[] = [
  { pattern: /\bclass\s+([A-Za-z_$][\w$]*)/g, type: "class" },
  { pattern: /\binterface\s+([A-Za-z_$][\w$]*)/g, type: "interface" },
  { pattern: /\btype\s+([A-Za-z_$][\w$]*)\s*[=<]/g, type: "type" },
  { pattern: /\benum\s+([A-Za-z_$][\w$]*)/g, type: "type" },
  { pattern: /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*[(<]/g, type: "function", measured: true },
  {
    pattern: /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*(?::[^=>]+)?=>|[A-Za-z_$][\w$]*\s*=>)/g,
    type: "function",
    measured: true,
  },
];

const GO_RULES: Rule[] = [
  { pattern: /\bfunc\s+(?:\([^)]*\)\s*)?([A-Za-z_][\w]*)\s*\(/g, type: "function", measured: true },
  { pattern: /\btype\s+([A-Za-z_][\w]*)\s+struct\b/g, type: "class" },
  { pattern: /\btype\s+([A-Za-z_][\w]*)\s+interface\b/g, type: "interface" },
  { pattern: /\btype\s+([A-Za-z_][\w]*)\s+(?!struct\b|interface\b)[\w[\]*.]+/g, type: "type" },
];

const JAVA_RULES: Rule[] = [
  { pattern: /\b(?:class|record|enum)\s+([A-Za-z_$][\w$]*)/g, type: "class" },
  { pattern: /\binterface\s+([A-Za-z_$][\w$]*)/g, type: "interface" },
];

function classRegions(source: string, rules: RegExp[]): Region[] {
  const regions: Region[] = [];
  for (const base of rules) {
    const pattern = new RegExp(base.source, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const body = braceBody(source, match.index);
      if (body) regions.push({ name: match[1]!, start: body.start, end: body.end });
    }
  }
  return regions;
}

/** Methods inside a class body (C-like languages, incl. Java and TS classes). */
const METHOD_PATTERN =
  /(?:^|\n)[ \t]*(?:@[\w.]+\s*(?:\([^)]*\))?\s*)*(?:public|private|protected|static|final|abstract|readonly|async|override|synchronized|native|\*)?[ \t]*(?:(?:public|private|protected|static|final|abstract|readonly|async|override|synchronized)[ \t]+)*(?:[A-Za-z_$][\w$<>,.[\]?]*[ \t]+)?([A-Za-z_$][\w$]*)[ \t]*\([^;{)]*\)[ \t]*(?:[:\-][^;{]*)?\{/g;

const METHOD_EXCLUDE = new Set([
  "if","for","while","switch","catch","do","else","return","new","function","try","synchronized",
]);

function extractCLike(source: string, language: string): { symbols: ParsedSymbol[]; imports: ParsedImport[] } {
  const symbols: ParsedSymbol[] = [];
  const imports: ParsedImport[] = [];
  const starts = lineStarts(source);
  const isGo = language === "Go";
  const isJava = language === "Java";
  const rules = isGo ? GO_RULES : isJava ? [...JAVA_RULES] : C_LIKE_RULES;

  const containers = classRegions(
    source,
    isGo ? [/\btype\s+([A-Za-z_][\w]*)\s+struct\b/] : [/\b(?:class|record|enum)\s+([A-Za-z_$][\w$]*)/],
  );

  const push = (
    name: string,
    type: SymbolType,
    index: number,
    complexity: number,
    parent: string | null,
  ) => {
    const line = lineOf(starts, index);
    symbols.push({
      name,
      type,
      line,
      column: index - starts[line - 1]! + 1,
      parent,
      complexity,
    });
  };

  for (const rule of rules) {
    const pattern = new RegExp(rule.pattern.source, "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const name = match[rule.group ?? 1];
      if (!name) continue;
      let complexity = 0;
      if (rule.measured) {
        const body = braceBody(source, match.index + match[0].length - 1);
        complexity = body ? complexityOf(source.slice(body.start, body.end)) : 1;
      }
      // Go receiver methods and functions declared inside a struct body count as methods.
      const parent = parentAt(containers, match.index);
      const type = rule.measured && parent ? "method" : rule.type;
      push(name, type, match.index, complexity, parent);
    }
  }

  // Methods within class bodies.
  if (!isGo) {
    let match: RegExpExecArray | null;
    const pattern = new RegExp(METHOD_PATTERN.source, "g");
    while ((match = pattern.exec(source))) {
      const name = match[1]!;
      if (METHOD_EXCLUDE.has(name)) continue;
      const index = match.index + match[0].indexOf(name);
      const parent = parentAt(containers, index);
      if (!parent && !isJava) continue;
      if (symbols.some((symbol) => symbol.name === name && symbol.line === lineOf(starts, index))) continue;
      const body = braceBody(source, match.index + match[0].length - 1);
      const complexity = body ? complexityOf(source.slice(body.start, body.end)) : 1;
      push(name, parent ? "method" : "function", index, complexity, parent);
    }
  }

  // Go methods with receivers: func (s *Service) Name(...)
  if (isGo) {
    const pattern = /\bfunc\s+\(\s*\w+\s+\*?([A-Za-z_][\w]*)\s*\)\s*([A-Za-z_][\w]*)\s*\(/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const index = match.index + match[0].lastIndexOf(match[2]!);
      const body = braceBody(source, match.index + match[0].length - 1);
      const existing = symbols.find(
        (symbol) => symbol.name === match![2] && symbol.line === lineOf(starts, index),
      );
      const complexity = body ? complexityOf(source.slice(body.start, body.end)) : 1;
      if (existing) {
        existing.type = "method";
        existing.parent = match[1]!;
        existing.complexity = complexity;
        continue;
      }
      push(match[2]!, "method", index, complexity, match[1]!);
    }
  }

  // Imports.
  const importPatterns: RegExp[] = isGo
    ? [/\bimport\s+(?:[\w.]+\s+)?"([^"\n]+)"/g, /^\s+(?:[\w.]+\s+)?"([^"\n]+)"\s*$/gm]
    : isJava
      ? [/\bimport\s+(?:static\s+)?([\w.*]+)\s*;/g]
      : [
          /\bimport\s+[^;'"\n]*from\s*['"]([^'"\n]+)['"]/g,
          /\bimport\s*['"]([^'"\n]+)['"]/g,
          /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
          /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
          /\bexport\s+[^;'"\n]*from\s*['"]([^'"\n]+)['"]/g,
        ];

  for (const base of importPatterns) {
    const pattern = new RegExp(base.source, base.flags.includes("m") ? "gm" : "g");
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const specifier = match[1]!;
      const line = lineOf(starts, match.index);
      imports.push({ specifier, line });
      push(specifier, "import", match.index, 0, null);
    }
  }

  // Exports.
  if (!isGo && !isJava) {
    const pattern =
      /\bexport\s+(?:default\s+)?(?:(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)|class\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)|interface\s+([A-Za-z_$][\w$]*)|type\s+([A-Za-z_$][\w$]*))/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      const name = match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5];
      if (name) push(name, "export", match.index, 0, null);
    }
    const named = /\bexport\s*\{([^}]*)\}/g;
    let block: RegExpExecArray | null;
    while ((block = named.exec(source))) {
      for (const raw of block[1]!.split(",")) {
        const name = raw.trim().split(/\s+as\s+/).pop()?.trim();
        if (name) push(name, "export", block.index, 0, null);
      }
    }
  } else {
    // Java/Go: exported surface is the public / capitalised declarations.
    for (const symbol of [...symbols]) {
      if (symbol.type === "import" || symbol.type === "call") continue;
      const exported = isGo ? /^[A-Z]/.test(symbol.name) : true;
      if (exported && !symbol.parent) {
        symbols.push({ ...symbol, type: "export", complexity: 0 });
      }
    }
  }

  return { symbols, imports };
}

function extractPython(source: string): { symbols: ParsedSymbol[]; imports: ParsedImport[] } {
  const symbols: ParsedSymbol[] = [];
  const imports: ParsedImport[] = [];
  const lines = source.split("\n");

  interface Scope {
    name: string;
    indent: number;
    kind: "class" | "function";
  }
  const stack: Scope[] = [];

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;
    const indent = raw.length - raw.trimStart().length;
    while (stack.length && indent <= stack[stack.length - 1]!.indent) stack.pop();

    const def = /^(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/.exec(trimmed);
    const cls = /^class\s+([A-Za-z_]\w*)/.exec(trimmed);

    if (def) {
      const parent = stack[stack.length - 1];
      // Body: following lines with a deeper indent.
      let end = index + 1;
      while (end < lines.length) {
        const candidate = lines[end]!;
        if (candidate.trim() && candidate.length - candidate.trimStart().length <= indent) break;
        end += 1;
      }
      const body = lines.slice(index, end).join("\n");
      symbols.push({
        name: def[1]!,
        type: parent?.kind === "class" ? "method" : "function",
        line,
        column: raw.indexOf("def") + 1,
        parent: parent?.kind === "class" ? parent.name : null,
        complexity: complexityOf(body),
      });
      if (!parent) symbols.push({ name: def[1]!, type: "export", line, column: 1, parent: null, complexity: 0 });
      stack.push({ name: def[1]!, indent, kind: "function" });
      return;
    }

    if (cls) {
      symbols.push({
        name: cls[1]!,
        type: "class",
        line,
        column: raw.indexOf("class") + 1,
        parent: stack[stack.length - 1]?.name ?? null,
        complexity: 0,
      });
      symbols.push({ name: cls[1]!, type: "export", line, column: 1, parent: null, complexity: 0 });
      stack.push({ name: cls[1]!, indent, kind: "class" });
      return;
    }

    const from = /^from\s+([.\w]+)\s+import\b/.exec(trimmed);
    const plain = /^import\s+([.\w]+)/.exec(trimmed);
    const specifier = from?.[1] ?? plain?.[1];
    if (specifier) {
      imports.push({ specifier, line });
      symbols.push({ name: specifier, type: "import", line, column: 1, parent: null, complexity: 0 });
    }

    const alias = /^([A-Za-z_]\w*)\s*(?::\s*[^=]+)?=\s*(?:TypeVar|NewType|TypeAlias)/.exec(trimmed);
    if (alias) {
      symbols.push({ name: alias[1]!, type: "type", line, column: 1, parent: null, complexity: 0 });
    }
  });

  return { symbols, imports };
}

function extractCalls(source: string, language: string, functions: ParsedSymbol[]): ParsedSymbol[] {
  const calls: ParsedSymbol[] = [];
  const starts = lineStarts(source);
  const pattern = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  const seen = new Set<string>();
  const declared = new Set(functions.map((symbol) => `${symbol.line}:${symbol.name}`));
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) && calls.length < MAX_CALLS_PER_FILE) {
    const name = match[1]!;
    if (RESERVED_CALLS.has(name)) continue;
    const index = match.index;
    const line = lineOf(starts, index);
    if (declared.has(`${line}:${name}`)) continue;
    const key = `${name}:${line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const parent =
      language === "Python"
        ? (findPythonParent(functions, line) ?? null)
        : (findRangeParent(functions, source, index) ?? null);
    calls.push({ name, type: "call", line, column: index - starts[line - 1]! + 1, parent, complexity: 0 });
  }
  return calls;
}

function findPythonParent(functions: ParsedSymbol[], line: number): string | null {
  let best: ParsedSymbol | null = null;
  for (const symbol of functions) {
    if ((symbol.type === "function" || symbol.type === "method") && symbol.line <= line) {
      if (!best || symbol.line > best.line) best = symbol;
    }
  }
  return best?.name ?? null;
}

function findRangeParent(functions: ParsedSymbol[], source: string, index: number): string | null {
  const starts = lineStarts(source);
  let best: ParsedSymbol | null = null;
  for (const symbol of functions) {
    if (symbol.type !== "function" && symbol.type !== "method") continue;
    const offset = starts[symbol.line - 1];
    if (offset === undefined || offset > index) continue;
    if (!best || symbol.line > best.line) best = symbol;
  }
  return best?.name ?? null;
}

/** Parses a single source file into symbols, imports and complexity metrics. */
export function parseSource(path: string, language: string, content: string): ParsedFile {
  const source = stripNoise(content, language);
  const { symbols, imports } =
    language === "Python" ? extractPython(source) : extractCLike(source, language);

  const callable = symbols.filter((symbol) => symbol.type === "function" || symbol.type === "method");
  const calls = extractCalls(source, language, symbols);
  const all = [...symbols, ...calls];

  const complexities = callable.map((symbol) => Math.max(1, symbol.complexity));
  const complexity = complexities.reduce((sum, value) => sum + value, 0);
  const maxComplexity = complexities.length ? Math.max(...complexities) : 0;
  const avgComplexity = complexities.length
    ? Math.round((complexity / complexities.length) * 10) / 10
    : 0;

  return {
    path,
    language,
    symbols: all,
    imports,
    complexity,
    maxComplexity,
    avgComplexity,
  };
}
