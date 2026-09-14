import { describe, expect, it } from "vitest";
import { CacheTtl, cacheKeys, repoCacheKeys } from "./cache.keys";

describe("cache keys", () => {
  it("namespaces keys per user and repository", () => {
    expect(cacheKeys.repo("u1", "r1")).toBe("ca:v1:repo:u1:r1");
    expect(repoCacheKeys("u1", "r1")).toContain(cacheKeys.docs("u1", "r1"));
    expect(CacheTtl.architecture).toBe(90);
  });
});
