import { describe, expect, it } from "vitest";
import { GithubUrlError, parseGithubUrl } from "./github-url";

describe("parseGithubUrl", () => {
  it("accepts a clean https github url", () => {
    expect(parseGithubUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      name: "repo",
      url: "https://github.com/owner/repo",
    });
  });

  it("rejects credentials and extra path", () => {
    expect(() => parseGithubUrl("https://user:pass@github.com/owner/repo")).toThrow(GithubUrlError);
    expect(() => parseGithubUrl("https://github.com/owner/repo/tree/main")).toThrow(GithubUrlError);
  });
});
