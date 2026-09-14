import { describe, expect, it } from "vitest";
import { detectLanguage, isIgnoredPath } from "./language";

describe("language detection", () => {
  it("maps extensions and ignores vendor paths", () => {
    expect(detectLanguage("src/auth/auth.service.ts")).toBe("TypeScript");
    expect(detectLanguage("pkg/lib.rs")).toBe("Rust");
    expect(detectLanguage("src/engine.cpp")).toBe("C++");
    expect(isIgnoredPath("node_modules/lodash/index.js")).toBe(true);
    expect(isIgnoredPath(".env")).toBe(true);
    expect(isIgnoredPath("src/app.ts")).toBe(false);
  });
});
