/**
 * Extension + content based language detection. No external API is used.
 * Shared by the edge analyzer and the standalone worker.
 */

export const IGNORED_SEGMENTS = ["node_modules", ".git", "dist", "build", "coverage", "vendor"];

export function isIgnoredPath(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((s) => IGNORED_SEGMENTS.includes(s))) return true;
  const file = segments[segments.length - 1] ?? "";
  if (file === ".env" || file.startsWith(".env.")) return true;
  return false;
}

const EXTENSION_MAP: Record<string, string> = {
  ts: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  jsx: "JSX",
  py: "Python",
  java: "Java",
  go: "Go",
  rs: "Rust",
  cpp: "C++",
  cc: "C++",
  cxx: "C++",
  hpp: "C++",
  hh: "C++",
  c: "C",
  h: "C",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  kt: "Kotlin",
  kts: "Kotlin",
  swift: "Swift",
  vue: "Vue",
  svelte: "Svelte",
  sql: "SQL",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  lua: "Lua",
  r: "R",
  scala: "Scala",
  dart: "Dart",
  zig: "Zig",
  css: "CSS",
  scss: "CSS",
  html: "HTML",
  htm: "HTML",
  json: "JSON",
  md: "Markdown",
  mdx: "Markdown",
};

/** Heuristics for extensionless files (shebangs, config-ish content). */
function detectFromContent(content: string): string | null {
  const head = content.slice(0, 400);
  if (/^#!.*\b(python[0-9.]*)\b/m.test(head)) return "Python";
  if (/^#!.*\b(node|bun|deno)\b/m.test(head)) return "JavaScript";
  const trimmed = content.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(content);
      return "JSON";
    } catch {
      /* not JSON */
    }
  }
  if (/^<!DOCTYPE html|^<html/i.test(trimmed)) return "HTML";
  if (/^#\s+\S/m.test(head) && /\n\s*[-*]\s+/.test(content)) return "Markdown";
  return null;
}

export function detectLanguage(path: string, content?: string): string {
  const file = path.split("/").pop() ?? path;
  const dot = file.lastIndexOf(".");
  const ext = dot > 0 ? file.slice(dot + 1).toLowerCase() : "";
  const byExtension = EXTENSION_MAP[ext];
  if (byExtension) return byExtension;
  if (content) {
    const byContent = detectFromContent(content);
    if (byContent) return byContent;
  }
  return "Other";
}

export const SUPPORTED_LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "TSX",
  "JSX",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C",
  "Ruby",
  "PHP",
  "C#",
  "Kotlin",
  "Swift",
  "CSS",
  "HTML",
  "JSON",
  "Markdown",
] as const;
