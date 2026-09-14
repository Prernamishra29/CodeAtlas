import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret, githubCloneUrl } from "./secrets";

describe("secrets", () => {
  it("round-trips encrypted values without exposing plaintext in the cipher", () => {
    process.env.JWT_SECRET = "unit-test-secret-that-is-long-enough";
    const cipher = encryptSecret("ghp_exampletokenvalue123456");
    expect(cipher).not.toContain("ghp_exampletokenvalue123456");
    expect(decryptSecret(cipher)).toBe("ghp_exampletokenvalue123456");
  });

  it("builds an authenticated clone URL from a public GitHub URL", () => {
    expect(githubCloneUrl("https://github.com/acme/api", "tok")).toBe(
      "https://x-access-token:tok@github.com/acme/api.git",
    );
  });
});
