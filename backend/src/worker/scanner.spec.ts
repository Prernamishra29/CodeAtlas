import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { calculateMetadata, scanDirectory } from "./scanner";

describe("scanDirectory", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("scans source files and skips ignored directories", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "codeatlas-scan-"));
    dirs.push(root);
    await mkdir(path.join(root, "src"), { recursive: true });
    await mkdir(path.join(root, "node_modules", "pkg"), { recursive: true });
    await writeFile(path.join(root, "src", "app.ts"), "export const x = 1;\n");
    await writeFile(path.join(root, "node_modules", "pkg", "index.js"), "module.exports = 1;\n");

    const files = await scanDirectory(root);
    expect(files.map((file) => file.path)).toEqual(["src/app.ts"]);
    const metrics = calculateMetadata(files);
    expect(metrics.totalFiles).toBe(1);
    expect(metrics.totalLines).toBe(1);
  });
});
