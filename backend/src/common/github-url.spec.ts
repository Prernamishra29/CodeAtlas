import { describe, expect, it } from "vitest";
import { GithubUrlError, parseBranch, parseGithubUrl } from "./github-url";

describe("parseGithubUrl", () => {
  it("accepts a canonical public URL", () => {
    expect(parseGithubUrl("https://github.com/acme/api")).toEqual({
      owner: "acme",
      name: "api",
      url: "https://github.com/acme/api",
    });
  });

  it("strips .git and trailing slash", () => {
    expect(parseGithubUrl("https://github.com/acme/api.git/").url).toBe("https://github.com/acme/api");
  });

  it("rejects credentials in the URL", () => {
    expect(() => parseGithubUrl("https://user:token@github.com/acme/api")).toThrow(GithubUrlError);
  });

  it("rejects non-https and extra path segments", () => {
    expect(() => parseGithubUrl("http://github.com/acme/api")).toThrow(GithubUrlError);
    expect(() => parseGithubUrl("https://github.com/acme/api/tree/main")).toThrow(GithubUrlError);
    expect(() => parseGithubUrl("git@github.com:acme/api.git")).toThrow(GithubUrlError);
  });
});

describe("parseBranch", () => {
  it("defaults to main and rejects path traversal", () => {
    expect(parseBranch(undefined)).toBe("main");
    expect(() => parseBranch("../secret")).toThrow(GithubUrlError);
  });
});
