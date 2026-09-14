const OWNER_REPO = /^[\w.-]+$/;
const BRANCH = /^(?!.*\.\.)[\w][\w./-]{0,79}$/;

export class GithubUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubUrlError";
  }
}

/** Accepts only https://github.com/owner/repo — no credentials, no git protocol, no extra path. */
export function parseGithubUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) throw new GithubUrlError("A repository URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new GithubUrlError("That repository URL is not valid.");
  }

  if (parsed.protocol !== "https:") throw new GithubUrlError("Use an https://github.com/owner/repo URL.");
  if (parsed.username || parsed.password) {
    throw new GithubUrlError("Repository URLs must not include credentials.");
  }
  if (parsed.hostname.toLowerCase() !== "github.com") {
    throw new GithubUrlError("Only github.com repositories are supported.");
  }
  if (parsed.search || parsed.hash) {
    throw new GithubUrlError("Use the form https://github.com/user/project");
  }

  const segments = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) throw new GithubUrlError("Use the form https://github.com/user/project");

  const owner = segments[0]!.replace(/\.git$/i, "");
  const name = segments[1]!.replace(/\.git$/i, "");
  if (!OWNER_REPO.test(owner) || !OWNER_REPO.test(name) || owner.includes("..") || name.includes("..")) {
    throw new GithubUrlError("Use the form https://github.com/user/project");
  }

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
  };
}

export function parseBranch(raw?: string) {
  const branch = (raw ?? "").trim() || "main";
  if (!BRANCH.test(branch)) throw new GithubUrlError("That branch name is not valid.");
  return branch;
}
