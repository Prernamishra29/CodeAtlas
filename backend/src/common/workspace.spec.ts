import { describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import { resolveInside, WorkspaceEscapeError } from "./workspace";

describe("resolveInside", () => {
  it("allows paths inside the workspace", () => {
    const root = path.join(os.tmpdir(), "codeatlas-ws");
    expect(resolveInside(root, "src/app.ts")).toBe(path.resolve(root, "src/app.ts"));
  });

  it("rejects path traversal", () => {
    const root = path.join(os.tmpdir(), "codeatlas-ws");
    expect(() => resolveInside(root, "../outside.txt")).toThrow(WorkspaceEscapeError);
  });
});
