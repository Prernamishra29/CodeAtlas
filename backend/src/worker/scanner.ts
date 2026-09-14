import { promises as fs } from "node:fs";
import path from "node:path";
import { detectLanguage, isIgnoredPath } from "./language";
import { resolveInside } from "../common/workspace";

export const MAX_FILES = 20_000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 500 * 1024 * 1024;

export interface ScannedFile {
  path: string;
  bytes: number;
  lines: number;
  language: string;
}

export class AnalysisFailure extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AnalysisFailure";
  }
}

const BINARY_EXTENSIONS = new Set([
  "png","jpg","jpeg","gif","webp","ico","pdf","zip","gz","tgz","woff","woff2","ttf","eot",
  "mp3","mp4","mov","avi","wasm","so","dll","exe","jar","class","bin","lock","pyc",
]);

function countLines(text: string) {
  if (!text) return 0;
  const lines = text.split("\n").length;
  return text.endsWith("\n") ? lines - 1 : lines;
}

/** Recursively walks the cloned checkout, skipping ignored paths. */
export async function scanDirectory(root: string): Promise<ScannedFile[]> {
  const files: ScannedFile[] = [];
  let totalBytes = 0;

  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      throw new AnalysisFailure("The repository files could not be read.", true);
    }

    for (const entry of entries) {
      const absolute = resolveInside(root, path.relative(root, path.join(dir, entry.name)));
      const relative = path.relative(root, absolute).split(path.sep).join("/");
      if (relative.startsWith("..")) continue;
      if (isIgnoredPath(relative)) continue;

      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (!entry.isFile()) continue;

      const stat = await fs.stat(absolute);
      totalBytes += stat.size;
      if (files.length >= MAX_FILES) {
        throw new AnalysisFailure("This repository has too many files to analyze.");
      }
      if (totalBytes > MAX_TOTAL_BYTES) {
        throw new AnalysisFailure("This repository is too large to analyze.");
      }

      const ext = (entry.name.split(".").pop() ?? "").toLowerCase();
      if (BINARY_EXTENSIONS.has(ext) || stat.size > MAX_FILE_BYTES) {
        files.push({ path: relative, bytes: stat.size, lines: 0, language: detectLanguage(relative) });
        continue;
      }

      const content = await fs.readFile(absolute, "utf8");
      files.push({
        path: relative,
        bytes: stat.size,
        lines: countLines(content),
        language: detectLanguage(relative, content),
      });
    }
  }

  await walk(root);
  if (files.length === 0) {
    throw new AnalysisFailure("This repository has no analyzable source files.");
  }
  return files;
}

export function calculateMetadata(files: ScannedFile[]) {
  const languages = new Map<string, { files: number; lines: number; bytes: number }>();
  const folders = new Map<string, { files: number; lines: number }>();
  let totalLines = 0;
  let totalBytes = 0;

  for (const file of files) {
    totalLines += file.lines;
    totalBytes += file.bytes;

    const lang = languages.get(file.language) ?? { files: 0, lines: 0, bytes: 0 };
    lang.files += 1;
    lang.lines += file.lines;
    lang.bytes += file.bytes;
    languages.set(file.language, lang);

    const segments = file.path.split("/");
    const folder = segments.length > 1 ? segments.slice(0, -1).join("/") : ".";
    const dir = folders.get(folder) ?? { files: 0, lines: 0 };
    dir.files += 1;
    dir.lines += file.lines;
    folders.set(folder, dir);
  }

  return {
    totalFiles: files.length,
    totalLines,
    totalBytes,
    totalFolders: folders.size,
    languages: [...languages.entries()]
      .map(([name, value]) => ({
        name,
        ...value,
        share: totalLines > 0 ? Math.round((value.lines / totalLines) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.lines - a.lines),
    folders: [...folders.entries()]
      .map(([folderPath, value]) => ({ path: folderPath, ...value }))
      .sort((a, b) => b.files - a.files)
      .slice(0, 40),
    largestFiles: [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 15),
  };
}
