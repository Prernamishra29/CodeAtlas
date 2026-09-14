import { describe, expect, it } from "vitest";
import { detectLanguage, isIgnoredPath } from "./language";

describe("language detection", () => {
  it("maps common extensions and ignores secrets", () => {
    expect(detectLanguage("src/main.rs")).toBe("Rust");
    expect(detectLanguage("lib/foo.cpp")).toBe("C++");
    expect(isIgnoredPath("node_modules/lodash/index.js")).toBe(true);
    expect(isIgnoredPath(".env.local")).toBe(true);
  });
});
