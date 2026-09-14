import Parser from "tree-sitter";
import * as path from "node:path";
import { promises as fs } from "node:fs";
import { ScannedFile } from "./scanner";
import { resolveInside } from "../common/workspace";
import { parseImportSpecifiers } from "./imports";

export interface SymbolData {
  name: string;
  type: string;
  line: number;
  column: number;
  parentName: string | null;
}

export interface DependencyData {
  targetPath: string; // The literal string in the import
  type: string; // "import"
}

export interface FileAnalysis {
  path: string;
  language: string;
  size: number;
  lines: number;
  complexity: number;
  symbols: SymbolData[];
  dependencies: DependencyData[];
}

export async function analyzeFile(file: ScannedFile, workspacePath: string): Promise<FileAnalysis> {
  const content = await fs.readFile(resolveInside(workspacePath, file.path), "utf8");
  
  const parser = new Parser();
  let langParser = null;
  
  try {
    switch (file.language.toLowerCase()) {
      case "javascript":
      case "jsx":
        langParser = require("tree-sitter-javascript");
        break;
      case "typescript":
        langParser = require("tree-sitter-typescript").typescript;
        break;
      case "tsx":
      case "react":
        langParser = require("tree-sitter-typescript").tsx;
        break;
      case "python":
        langParser = require("tree-sitter-python");
        break;
      case "java":
        langParser = require("tree-sitter-java");
        break;
      case "go":
        langParser = require("tree-sitter-go");
        break;
    }
  } catch (e) {
    // Parser not available or failed to load
    console.warn(`Could not load tree-sitter parser for ${file.language}:`, e);
  }

  const analysis: FileAnalysis = {
    path: file.path,
    language: file.language,
    size: file.bytes,
    lines: file.lines,
    complexity: 0,
    symbols: [],
    dependencies: [],
  };

  if (!langParser) {
    analysis.dependencies = parseImportSpecifiers(content).map((targetPath) => ({ targetPath, type: "import" }));
    return analysis;
  }

  parser.setLanguage(langParser);
  const tree = parser.parse(content);
  
  // Calculate file-level cyclomatic complexity and extract symbols/deps
  // Basic traversal
  const cursor = tree.walk();
  let complexity = 0;

  const symbolStack: { name: string; type: string }[] = [];

  function traverse() {
    do {
      const nodeType = cursor.nodeType;
      
      // Complexity indicators
      if ([
        "if_statement", "for_statement", "while_statement", "catch_clause",
        "case_statement", "&&", "||", "?", "ternary_expression"
      ].includes(nodeType)) {
        complexity++;
      }

      let isSymbol = false;
      let symbolName = "";
      let symType = "";

      // Heuristic extraction for various languages
      if (nodeType.includes("function_declaration") || nodeType === "function_definition") {
        isSymbol = true;
        symType = "function";
        const nameNode = cursor.currentNode.childForFieldName("name");
        symbolName = nameNode ? nameNode.text : "anonymous";
      } else if (nodeType.includes("class_declaration") || nodeType === "class_definition") {
        isSymbol = true;
        symType = "class";
        const nameNode = cursor.currentNode.childForFieldName("name");
        symbolName = nameNode ? nameNode.text : "anonymous";
      } else if (nodeType.includes("method_declaration") || nodeType.includes("method_definition")) {
        isSymbol = true;
        symType = "method";
        const nameNode = cursor.currentNode.childForFieldName("name");
        symbolName = nameNode ? nameNode.text : "anonymous";
      } else if (nodeType.includes("interface_declaration")) {
        isSymbol = true;
        symType = "interface";
        const nameNode = cursor.currentNode.childForFieldName("name");
        symbolName = nameNode ? nameNode.text : "anonymous";
      } else if (nodeType.includes("type_alias_declaration") || nodeType === "type_spec") {
        isSymbol = true;
        symType = "type";
        const nameNode = cursor.currentNode.childForFieldName("name");
        symbolName = nameNode ? nameNode.text : "anonymous";
      } else if (nodeType.includes("call_expression") || nodeType === "call" || nodeType === "method_invocation") {
        isSymbol = true;
        symType = "call";
        const funcNode = cursor.currentNode.childForFieldName("function") || cursor.currentNode.childForFieldName("name");
        symbolName = funcNode ? funcNode.text : "unknown_call";
      } else if (nodeType === "import_statement" || nodeType === "import_declaration" || nodeType === "import_from_statement") {
        // Extract dependency
        const sourceNode = cursor.currentNode.childForFieldName("source") || cursor.currentNode.childForFieldName("module") || cursor.currentNode.namedChildren.find((c) => c.type === "string");
        if (sourceNode) {
          analysis.dependencies.push({
            targetPath: sourceNode.text.replace(/['"]/g, ""),
            type: "import"
          });
        }
      }

      if (isSymbol && symbolName) {
        analysis.symbols.push({
          name: symbolName,
          type: symType,
          line: cursor.startPosition.row + 1,
          column: cursor.startPosition.column,
          parentName: symbolStack.length > 0 ? symbolStack[symbolStack.length - 1].name : null,
        });
      }

      if (isSymbol && ["class", "function", "method", "interface"].includes(symType)) {
        symbolStack.push({ name: symbolName, type: symType });
      }

      if (cursor.gotoFirstChild()) {
        traverse();
        cursor.gotoParent();
      }

      if (isSymbol && ["class", "function", "method", "interface"].includes(symType)) {
        symbolStack.pop();
      }

    } while (cursor.gotoNextSibling());
  }

  traverse();

  analysis.complexity = complexity;
  const extras = parseImportSpecifiers(content);
  for (const spec of extras) {
    if (!analysis.dependencies.some((item) => item.targetPath === spec)) {
      analysis.dependencies.push({ targetPath: spec, type: "import" });
    }
  }
  return analysis;
}
