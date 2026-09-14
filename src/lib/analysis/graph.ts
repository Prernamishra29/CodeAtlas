/**
 * Dependency resolution + code health scoring over parsed files.
 * Pure functions — shared by the edge analyzer and the standalone worker.
 */
import type { ParsedFile } from "./parser";

export type DependencyType = "internal" | "external" | "stdlib";

export interface DependencyEdge {
  sourcePath: string;
  /** Resolved repository file path, or the package name for external deps. */
  targetPath: string;
  dependencyType: DependencyType;
  specifier: string;
}

export interface HealthFinding {
  id: string;
  kind:
    | "circular_dependency"
    | "large_file"
    | "complex_function"
    | "deep_dependency_chain"
    | "too_many_imports";
  severity: "info" | "warning" | "danger";
  title: string;
  detail: string;
  path?: string;
}

export interface HealthReport {
  score: number;
  breakdown: {
    architecture: number;
    maintainability: number;
    complexity: number;
    dependencies: number;
    documentation: number;
  };
  findings: HealthFinding[];
  circularCount: number;
  largeFileCount: number;
  complexFunctionCount: number;
  maxChainDepth: number;
  heavyImportCount: number;
}

export const LARGE_FILE_LINES = 400;
export const COMPLEX_FUNCTION = 15;
export const MANY_IMPORTS = 15;
export const DEEP_CHAIN = 6;

const JS_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mjs", "cjs"];

function normalise(path: string) {
  const parts: string[] = [];
  for (const segment of path.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

/** Resolves an import specifier to a repository file, when it points at one. */
function resolveInternal(
  specifier: string,
  fromPath: string,
  language: string,
  index: Set<string>,
  bySuffix: Map<string, string[]>,
): string | null {
  const dir = fromPath.split("/").slice(0, -1).join("/");

  const tryCandidates = (base: string) => {
    if (index.has(base)) return base;
    for (const ext of JS_EXTENSIONS) {
      if (index.has(`${base}.${ext}`)) return `${base}.${ext}`;
    }
    for (const ext of JS_EXTENSIONS) {
      if (index.has(`${base}/index.${ext}`)) return `${base}/index.${ext}`;
    }
    if (index.has(`${base}.py`)) return `${base}.py`;
    if (index.has(`${base}/__init__.py`)) return `${base}/__init__.py`;
    return null;
  };

  if (language === "Python") {
    if (specifier.startsWith(".")) {
      const ups = /^\.+/.exec(specifier)![0].length;
      const rest = specifier.slice(ups).replace(/\./g, "/");
      const baseDir = dir.split("/").slice(0, Math.max(0, dir.split("/").length - (ups - 1))).join("/");
      return tryCandidates(normalise(`${baseDir}/${rest}`));
    }
    return tryCandidates(specifier.replace(/\./g, "/"));
  }

  if (language === "Java") {
    const className = specifier.split(".").filter((part) => part !== "*").pop();
    if (!className) return null;
    const matches = bySuffix.get(`${className}.java`) ?? [];
    return matches[0] ?? null;
  }

  if (language === "Go") {
    const tail = specifier.split("/").slice(-2).join("/");
    for (const path of index) {
      if (path.endsWith(".go") && (path.includes(`/${tail}/`) || path.startsWith(`${tail}/`))) return path;
    }
    return null;
  }

  if (specifier.startsWith(".")) {
    return tryCandidates(normalise(`${dir}/${specifier}`));
  }
  if (specifier.startsWith("@/")) {
    return tryCandidates(normalise(`src/${specifier.slice(2)}`)) ?? tryCandidates(normalise(specifier.slice(2)));
  }
  if (specifier.startsWith("~/")) {
    return tryCandidates(normalise(`src/${specifier.slice(2)}`));
  }
  if (specifier.startsWith("src/") || specifier.startsWith("app/") || specifier.startsWith("lib/")) {
    return tryCandidates(normalise(specifier));
  }
  return null;
}

const STDLIB_HINTS = new Set([
  "os","sys","json","re","math","time","datetime","typing","pathlib","collections","itertools",
  "logging","asyncio","subprocess","fmt","errors","strings","strconv","context","net/http","io",
  "node:fs","node:path","node:crypto","fs","path","crypto","http","https","url","util","events",
]);

function externalName(specifier: string, language: string) {
  if (language === "Java") return specifier.split(".").slice(0, 3).join(".");
  if (language === "Python") return specifier.split(".")[0]!;
  if (language === "Go") return specifier;
  if (specifier.startsWith("@")) return specifier.split("/").slice(0, 2).join("/");
  return specifier.split("/")[0]!;
}

/** Builds the dependency edge list for the whole repository. */
export function buildDependencies(parsed: ParsedFile[]): DependencyEdge[] {
  const index = new Set(parsed.map((file) => file.path));
  const bySuffix = new Map<string, string[]>();
  for (const file of parsed) {
    const name = file.path.split("/").pop()!;
    const list = bySuffix.get(name) ?? [];
    list.push(file.path);
    bySuffix.set(name, list);
  }

  const edges: DependencyEdge[] = [];
  const seen = new Set<string>();

  for (const file of parsed) {
    for (const imported of file.imports) {
      const target = resolveInternal(imported.specifier, file.path, file.language, index, bySuffix);
      const resolved = target ?? externalName(imported.specifier, file.language);
      if (!resolved || resolved === file.path) continue;
      const type: DependencyType = target
        ? "internal"
        : STDLIB_HINTS.has(resolved) || STDLIB_HINTS.has(imported.specifier)
          ? "stdlib"
          : "external";
      const key = `${file.path}->${resolved}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({
        sourcePath: file.path,
        targetPath: resolved,
        dependencyType: type,
        specifier: imported.specifier,
      });
    }
  }

  return edges;
}

/** Detects cycles in the internal dependency graph (up to `limit` cycles). */
export function findCycles(edges: DependencyEdge[], limit = 25): string[][] {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.dependencyType !== "internal") continue;
    const list = graph.get(edge.sourcePath) ?? [];
    list.push(edge.targetPath);
    graph.set(edge.sourcePath, list);
  }

  const cycles: string[][] = [];
  const state = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const signatures = new Set<string>();

  const visit = (node: string) => {
    if (cycles.length >= limit) return;
    state.set(node, 1);
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      const status = state.get(next) ?? 0;
      if (status === 1) {
        const start = stack.indexOf(next);
        const cycle = stack.slice(start);
        const signature = [...cycle].sort().join("|");
        if (!signatures.has(signature)) {
          signatures.add(signature);
          cycles.push([...cycle, next]);
        }
      } else if (status === 0) {
        visit(next);
      }
      if (cycles.length >= limit) break;
    }
    stack.pop();
    state.set(node, 2);
  };

  for (const node of graph.keys()) {
    if ((state.get(node) ?? 0) === 0) visit(node);
  }
  return cycles;
}

/** Longest acyclic dependency chain length in the internal graph. */
export function maxChainDepth(edges: DependencyEdge[]): number {
  const graph = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.dependencyType !== "internal") continue;
    const list = graph.get(edge.sourcePath) ?? [];
    list.push(edge.targetPath);
    graph.set(edge.sourcePath, list);
  }

  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  const walk = (node: string): number => {
    const cached = depth.get(node);
    if (cached !== undefined) return cached;
    if (visiting.has(node)) return 0;
    visiting.add(node);
    let best = 0;
    for (const next of graph.get(node) ?? []) {
      best = Math.max(best, 1 + walk(next));
    }
    visiting.delete(node);
    depth.set(node, best);
    return best;
  };

  let longest = 0;
  for (const node of graph.keys()) longest = Math.max(longest, walk(node));
  return longest;
}

export interface HealthInput {
  files: { path: string; lines: number; language: string; importCount: number; docLines?: number }[];
  functions: { name: string; path: string; complexity: number }[];
  edges: DependencyEdge[];
  documentationFiles: number;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Computes findings and a weighted health score from real parsed metrics. */
export function assessHealth(input: HealthInput): HealthReport {
  const findings: HealthFinding[] = [];

  const cycles = findCycles(input.edges);
  for (const cycle of cycles.slice(0, 8)) {
    findings.push({
      id: `cycle-${cycle.join("-")}`,
      kind: "circular_dependency",
      severity: "danger",
      title: "Circular dependency",
      detail: cycle.map((path) => path.split("/").pop()).join(" → "),
      path: cycle[0]!,
    });
  }

  const largeFiles = input.files.filter((file) => file.lines > LARGE_FILE_LINES);
  for (const file of [...largeFiles].sort((a, b) => b.lines - a.lines).slice(0, 8)) {
    findings.push({
      id: `large-${file.path}`,
      kind: "large_file",
      severity: file.lines > LARGE_FILE_LINES * 2 ? "danger" : "warning",
      title: "Large file",
      detail: `${file.path} holds ${file.lines.toLocaleString()} lines — consider splitting it.`,
      path: file.path,
    });
  }

  const complexFunctions = input.functions.filter((fn) => fn.complexity > COMPLEX_FUNCTION);
  for (const fn of [...complexFunctions].sort((a, b) => b.complexity - a.complexity).slice(0, 8)) {
    findings.push({
      id: `complex-${fn.path}-${fn.name}`,
      kind: "complex_function",
      severity: fn.complexity > COMPLEX_FUNCTION * 2 ? "danger" : "warning",
      title: "Highly complex function",
      detail: `${fn.name}() in ${fn.path} has a cyclomatic complexity of ${fn.complexity}.`,
      path: fn.path,
    });
  }

  const depth = maxChainDepth(input.edges);
  if (depth > DEEP_CHAIN) {
    findings.push({
      id: "deep-chain",
      kind: "deep_dependency_chain",
      severity: depth > DEEP_CHAIN * 2 ? "danger" : "warning",
      title: "Deep dependency chain",
      detail: `The longest internal import chain is ${depth} modules deep.`,
    });
  }

  const heavyImports = input.files.filter((file) => file.importCount > MANY_IMPORTS);
  for (const file of [...heavyImports].sort((a, b) => b.importCount - a.importCount).slice(0, 8)) {
    findings.push({
      id: `imports-${file.path}`,
      kind: "too_many_imports",
      severity: "warning",
      title: "Too many imports",
      detail: `${file.path} imports ${file.importCount} modules.`,
      path: file.path,
    });
  }

  const fileCount = Math.max(1, input.files.length);
  const functionCount = Math.max(1, input.functions.length);
  const avgComplexity =
    input.functions.reduce((sum, fn) => sum + fn.complexity, 0) / functionCount;

  const architecture = clamp(100 - cycles.length * 12 - Math.max(0, depth - DEEP_CHAIN) * 6);
  const maintainability = clamp(100 - (largeFiles.length / fileCount) * 220);
  const complexity = clamp(100 - Math.max(0, avgComplexity - 3) * 9 - (complexFunctions.length / functionCount) * 160);
  const dependencies = clamp(100 - (heavyImports.length / fileCount) * 200 - cycles.length * 6);
  const documentation = clamp((input.documentationFiles / fileCount) * 900 + 25);

  const breakdown = { architecture, maintainability, complexity, dependencies, documentation };
  const score = clamp(
    architecture * 0.25 +
      maintainability * 0.25 +
      complexity * 0.25 +
      dependencies * 0.15 +
      documentation * 0.1,
  );

  return {
    score,
    breakdown,
    findings: findings.slice(0, 30),
    circularCount: cycles.length,
    largeFileCount: largeFiles.length,
    complexFunctionCount: complexFunctions.length,
    maxChainDepth: depth,
    heavyImportCount: heavyImports.length,
  };
}
