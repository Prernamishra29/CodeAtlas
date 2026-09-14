/**
 * Analyzer pipeline (server-only). Mirrors the standalone BullMQ worker stages:
 * CLONE_REPOSITORY -> SCAN_FILES -> CALCULATE_METADATA -> FINALIZE_ANALYSIS.
 *
 * The edge runtime has no git binary, so "cloning" streams the branch archive
 * into an isolated in-memory workspace that is discarded when the job ends.
 */
import { detectLanguage, isIgnoredPath } from "./language";

export const MAX_ARCHIVE_BYTES = 80 * 1024 * 1024;
export const MAX_FILES = 20_000;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** User-safe error — never carries a stack trace or internal detail. */
export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AnalysisError";
  }
}

export interface ScannedFile {
  path: string;
  bytes: number;
  lines: number;
  language: string;
}

export interface AnalysisMetrics {
  totalFiles: number;
  totalLines: number;
  totalBytes: number;
  totalFolders: number;
  languages: { name: string; files: number; lines: number; bytes: number; share: number }[];
  folders: { path: string; files: number; lines: number }[];
  largestFiles: { path: string; bytes: number; lines: number; language: string }[];
}

function parseRepo(url: string) {
  const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(url.trim());
  if (!match) throw new AnalysisError("That repository URL is not a supported GitHub URL.");
  return { owner: match[1]!, name: match[2]! };
}

/** Stage 1 — validate the repository is reachable and public. */
export async function validateRepository(url: string, branch: string) {
  const { owner, name } = parseRepo(url);
  let response: Response;
  try {
    response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "CodeAtlas-Analyzer" },
    });
  } catch {
    throw new AnalysisError("We could not reach GitHub. Please try again.", true);
  }

  if (response.status === 404) {
    throw new AnalysisError("Repository not found, or it is private and cannot be analyzed.");
  }
  if (response.status === 403 || response.status === 429) {
    throw new AnalysisError("GitHub is rate limiting analysis right now. Retrying shortly.", true);
  }
  if (!response.ok) {
    throw new AnalysisError("GitHub rejected the repository request.", response.status >= 500);
  }

  const repo = (await response.json()) as {
    private?: boolean;
    size?: number;
    default_branch?: string;
  };
  if (repo.private) throw new AnalysisError("Private repositories are not supported yet.");
  if ((repo.size ?? 0) * 1024 > MAX_ARCHIVE_BYTES) {
    throw new AnalysisError("This repository is too large to analyze.");
  }

  return { owner, name, branch: branch || repo.default_branch || "main" };
}

/** Stage 2 — stream and unpack the archive (the isolated temporary workspace). */
export async function cloneRepository(owner: string, name: string, branch: string) {
  const url = `https://codeload.github.com/${owner}/${name}/tar.gz/refs/heads/${branch}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { "User-Agent": "CodeAtlas-Analyzer" } });
  } catch {
    throw new AnalysisError("Cloning the repository failed. Please try again.", true);
  }
  if (response.status === 404) {
    throw new AnalysisError(`Branch "${branch}" was not found in this repository.`);
  }
  if (!response.ok || !response.body) {
    throw new AnalysisError("Cloning the repository failed.", response.status >= 500);
  }

  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_ARCHIVE_BYTES) {
        throw new AnalysisError("This repository is too large to analyze.");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    throw new AnalysisError("The repository archive could not be read.", true);
  } finally {
    reader.releaseLock();
  }

  const tar = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    tar.set(chunk, offset);
    offset += chunk.byteLength;
  }
  chunks.length = 0;
  return tar;
}

const decoder = new TextDecoder("utf-8", { fatal: false });

function readString(bytes: Uint8Array, start: number, length: number) {
  let end = start;
  while (end < start + length && bytes[end] !== 0) end += 1;
  return decoder.decode(bytes.subarray(start, end));
}

function countLines(text: string) {
  if (text.length === 0) return 0;
  let lines = 1;
  for (let i = 0; i < text.length; i += 1) if (text.charCodeAt(i) === 10) lines += 1;
  return text.endsWith("\n") ? lines - 1 : lines;
}

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "pdf",
  "zip",
  "gz",
  "tgz",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "mp3",
  "mp4",
  "mov",
  "avi",
  "wasm",
  "so",
  "dll",
  "exe",
  "jar",
  "class",
  "bin",
  "lock",
  "pyc",
]);

function looksBinary(path: string) {
  const ext = (path.split(".").pop() ?? "").toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/** Stage 3 — scan the unpacked files, skipping ignored paths. */
export function scanFiles(tar: Uint8Array): ScannedFile[] {
  const files: ScannedFile[] = [];
  let cursor = 0;

  while (cursor + 512 <= tar.length) {
    const header = tar.subarray(cursor, cursor + 512);
    if (header.every((byte) => byte === 0)) break;

    const rawName = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const sizeField = readString(header, 124, 12).trim();
    const size = Number.parseInt(sizeField, 8) || 0;
    const typeFlag = String.fromCharCode(header[156] ?? 48);
    const dataStart = cursor + 512;
    cursor = dataStart + Math.ceil(size / 512) * 512;

    if (typeFlag !== "0" && typeFlag !== "\0") continue;

    const fullName = prefix ? `${prefix}/${rawName}` : rawName;
    // Archives nest everything under "<repo>-<ref>/"; strip that root folder.
    const path = fullName.split("/").slice(1).join("/");
    if (!path || isIgnoredPath(path)) continue;
    if (files.length >= MAX_FILES) {
      throw new AnalysisError("This repository has too many files to analyze.");
    }

    if (looksBinary(path) || size > MAX_FILE_BYTES) {
      files.push({ path, bytes: size, lines: 0, language: detectLanguage(path) });
      continue;
    }

    const content = decoder.decode(tar.subarray(dataStart, dataStart + size));
    files.push({
      path,
      bytes: size,
      lines: countLines(content),
      language: detectLanguage(path, content),
    });
  }

  if (files.length === 0) {
    throw new AnalysisError("This repository has no analyzable source files.");
  }
  return files;
}

/** Stage 4 — aggregate metadata. */
export function calculateMetadata(files: ScannedFile[]): AnalysisMetrics {
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

  const languageList = [...languages.entries()]
    .map(([name, value]) => ({
      name,
      ...value,
      share: totalLines > 0 ? Math.round((value.lines / totalLines) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.lines - a.lines);

  const folderList = [...folders.entries()]
    .map(([path, value]) => ({ path, ...value }))
    .sort((a, b) => b.files - a.files)
    .slice(0, 40);

  const largestFiles = [...files]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 15)
    .map(({ path, bytes, lines, language }) => ({ path, bytes, lines, language }));

  return {
    totalFiles: files.length,
    totalLines,
    totalBytes,
    totalFolders: folders.size,
    languages: languageList,
    folders: folderList,
    largestFiles,
  };
}
