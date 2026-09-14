import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const create = vi.fn();
const update = vi.fn();
const add = vi.fn();
const invalidateUser = vi.fn();

vi.mock("../prisma/prisma.service", () => ({
  PrismaService: class {},
}));

vi.mock("../cache/cache.module", () => ({
  CacheService: class {},
}));

vi.mock("@nestjs/bullmq", () => ({
  InjectQueue: () => () => undefined,
}));

import { AnalysisService } from "./analysis.service";

describe("AnalysisService.start", () => {
  const service = new AnalysisService(
    { repository: { findFirst, update }, analysis: { findFirst, create } } as never,
    { invalidateUser } as never,
    { add } as never,
  );

  beforeEach(() => {
    findFirst.mockReset();
    create.mockReset();
    update.mockReset();
    add.mockReset();
    invalidateUser.mockReset();
  });

  it("does not enqueue a duplicate while an analysis is already running", async () => {
    findFirst
      .mockResolvedValueOnce({ id: "repo-1", url: "https://github.com/acme/api", defaultBranch: "main" })
      .mockResolvedValueOnce({ id: "an-1", status: "cloning" });
    const result = await service.start("user-1", "repo-1");
    expect(result).toEqual({ analysisId: "an-1", status: "cloning", alreadyRunning: true });
    expect(add).not.toHaveBeenCalled();
  });

  it("creates an analysis job for an owned repository", async () => {
    findFirst.mockResolvedValueOnce({
      id: "repo-1",
      url: "https://github.com/acme/api",
      defaultBranch: "main",
    });
    create.mockResolvedValueOnce({ id: "an-2", status: "queued" });
    update.mockResolvedValueOnce({});
    add.mockResolvedValueOnce({});
    const result = await service.start("user-1", "repo-1");
    expect(result.alreadyRunning).toBe(false);
    expect(add).toHaveBeenCalledWith(
      "CLONE_REPOSITORY",
      expect.objectContaining({ analysisId: "an-2", repositoryId: "repo-1" }),
      expect.objectContaining({ jobId: "an-2" }),
    );
  });
});
