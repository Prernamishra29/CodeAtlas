import { describe, expect, it } from "vitest";
import { hashRefreshToken } from "./refresh-token";

describe("hashRefreshToken", () => {
  it("hashes opaquely and consistently", () => {
    const hash = hashRefreshToken("refresh-token-value");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashRefreshToken("refresh-token-value"));
    expect(hash).not.toBe(hashRefreshToken("other"));
  });
});
