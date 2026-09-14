import { describe, expect, it } from "vitest";
import { parseImportSpecifiers } from "./imports";

describe("parseImportSpecifiers", () => {
  it("extracts ESM and CJS dependencies", () => {
    const source = `
      import { JwtService } from "@nestjs/jwt";
      import fs from "node:fs";
      const x = require("ioredis");
      export { parse } from "./parser";
    `;
    const specs = parseImportSpecifiers(source);
    expect(specs).toEqual(expect.arrayContaining(["@nestjs/jwt", "node:fs", "ioredis", "./parser"]));
  });

  it("extracts C includes and Rust use paths", () => {
    const source = `
      #include "engine.h"
      use crate::graph::Node;
    `;
    const specs = parseImportSpecifiers(source);
    expect(specs).toEqual(expect.arrayContaining(["engine.h", "crate::graph::Node"]));
  });
});
