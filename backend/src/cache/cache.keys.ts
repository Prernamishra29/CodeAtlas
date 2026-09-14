/**
 * Redis cache contract
 *
 * | Key | Payload | TTL | Invalidation |
 * |---|---|---|---|
 * | ca:v1:repos:{userId} | repository list | 20s | create / delete / analysis status change |
 * | ca:v1:repo:{userId}:{repoId} | repository metadata | 45s | same |
 * | ca:v1:analysis:{userId}:{repoId} | latest analysis summary | 60s | analysis start / complete / fail / cancel |
 * | ca:v1:arch:{userId}:{repoId} | files + dependencies for architecture views | 90s | analysis complete / fail / delete |
 * | ca:v1:files:{userId}:{repoId} | parsed file tree | 90s | analysis complete / fail / delete |
 * | ca:v1:deps:{userId}:{repoId} | dependency graph | 90s | analysis complete / fail / delete |
 * | ca:v1:docs:{userId}:{repoId} | AI documentation summaries | 120s | analysis complete / delete |
 * | ca:v1:health:{userId}:{repoId} | health breakdown | 60s | analysis complete / delete |
 *
 * Chat, search, and in-flight analysis payloads are never cached.
 */
export const CacheTtl = {
  repoList: 20,
  repoMeta: 45,
  analysisSummary: 60,
  architecture: 90,
  docs: 120,
  health: 60,
} as const;

export const cacheKeys = {
  repos: (userId: string) => `ca:v1:repos:${userId}`,
  repo: (userId: string, repoId: string) => `ca:v1:repo:${userId}:${repoId}`,
  analysis: (userId: string, repoId: string) => `ca:v1:analysis:${userId}:${repoId}`,
  architecture: (userId: string, repoId: string) => `ca:v1:arch:${userId}:${repoId}`,
  files: (userId: string, repoId: string) => `ca:v1:files:${userId}:${repoId}`,
  deps: (userId: string, repoId: string) => `ca:v1:deps:${userId}:${repoId}`,
  docs: (userId: string, repoId: string) => `ca:v1:docs:${userId}:${repoId}`,
  health: (userId: string, repoId: string) => `ca:v1:health:${userId}:${repoId}`,
};

export function repoCacheKeys(userId: string, repoId?: string) {
  const keys = [cacheKeys.repos(userId)];
  if (repoId) {
    keys.push(
      cacheKeys.repo(userId, repoId),
      cacheKeys.analysis(userId, repoId),
      cacheKeys.architecture(userId, repoId),
      cacheKeys.files(userId, repoId),
      cacheKeys.deps(userId, repoId),
      cacheKeys.docs(userId, repoId),
      cacheKeys.health(userId, repoId),
    );
  }
  return keys;
}
