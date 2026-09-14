/**
 * Extension + content based language detection (no external API).
 * Kept in sync with the frontend analyzer's detector.
 */
export const IGNORED_SEGMENTS = ["node_modules", ".git", "dist", "build", "coverage", "vendor"];

export function isIgnoredPath(relativePath: string): boolean {
  const segments = relativePath.split("/");
  if (segments.some((segment) => IGNORED_SEGMENTS.includes(segment))) return true;
  const file = segments[segments.length - 1] ?? "";
  return file === ".env" || file.startsWith(".env.");
}

const EXTENSION_MAP: Record<string, string> = {
  ts: "TypeScript", mts: "TypeScript", cts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  jsx: "JSX",
  py: "Python",
  java: "Java",
  go: "Go",
  rs: "Rust",
  cpp: "C++", cc: "C++", cxx: "C++", hpp: "C++", hh: "C++",
  c: "C", h: "C",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  kt: "Kotlin", kts: "Kotlin",
  swift: "Swift",
  vue: "Vue",
  svelte: "Svelte",
  sql: "SQL",
  yml: "YAML", yaml: "YAML",
  toml: "TOML",
  sh: "Shell", bash: "Shell", zsh: "Shell",
  lua: "Lua",
  r: "R",
  scala: "Scala",
  dart: "Dart",
  zig: "Zig",
  css: "CSS", scss: "CSS",
  html: "HTML", htm: "HTML",
  json: "JSON",
  md: "Markdown", mdx: "Markdown",
};

function detectFromContent(content: string): string | null {
  const head = content.slice(0, 400);
  if (/^#!.*\bpython[0-9.]*\b/m.test(head)) return "Python";
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

export function detectLanguage(filePath: string, content?: string): string {
  const file = filePath.split("/").pop() ?? filePath;
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
