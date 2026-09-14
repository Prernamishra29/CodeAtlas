import path from "node:path";
import { promises as fs } from "node:fs";

export class WorkspaceEscapeError extends Error {
  constructor() {
    super("A file path escaped the analysis workspace.");
    this.name = "WorkspaceEscapeError";
  }
}

export function resolveInside(root: string, candidate: string) {
  const base = path.resolve(root);
  const resolved = path.resolve(base, candidate);
  const prefix = base.endsWith(path.sep) ? base : base + path.sep;
  if (resolved !== base && !resolved.startsWith(prefix)) {
    throw new WorkspaceEscapeError();
  }
  return resolved;
}

export async function assertInsideWorkspace(root: string, candidate: string) {
  const resolved = resolveInside(root, candidate);
  try {
    const realRoot = await fs.realpath(root);
    const realPath = await fs.realpath(resolved).catch(async () => resolved);
    resolveInside(realRoot, path.relative(realRoot, realPath) || ".");
    if (path.resolve(realPath) !== path.resolve(realRoot) && !path.resolve(realPath).startsWith(path.resolve(realRoot) + path.sep)) {
      throw new WorkspaceEscapeError();
    }
  } catch (error) {
    if (error instanceof WorkspaceEscapeError) throw error;
  }
  return resolved;
}
