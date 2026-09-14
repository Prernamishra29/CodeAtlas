import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.module";
import { CacheTtl, cacheKeys } from "../cache/cache.keys";
import { log } from "../common/logger";
import {
  ANALYSIS_QUEUE,
  AnalysisJobType,
  type AnalysisJobData,
} from "../queue/queue.constants";

@Injectable()
export class AnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    @InjectQueue(ANALYSIS_QUEUE) private readonly queue: Queue<AnalysisJobData>,
  ) {}

  /**
   * Validates ownership, creates the QUEUED record and enqueues the job.
   * jobId === analysisId makes enqueue idempotent; a second start while running is a no-op.
   */
  async start(userId: string, repositoryId: string, options: { force?: boolean } = {}) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
    });
    if (!repository) throw new NotFoundException("Repository not found.");

    if (options.force) {
      await this.abandonRunning(repositoryId);
    } else {
      const running = await this.prisma.analysis.findFirst({
        where: { repositoryId, status: { in: ["queued", "cloning", "scanning", "analyzing"] } },
      });
      if (running) return { analysisId: running.id, status: running.status, alreadyRunning: true };
    }

    const analysis = await this.prisma.analysis.create({
      data: { repositoryId, status: "queued", progress: 0, currentStep: "Queued for analysis" },
    });
    await this.prisma.repository.update({
      where: { id: repositoryId },
      data: { status: "queued" },
    });

    try {
      await this.queue.add(
        AnalysisJobType.CLONE_REPOSITORY,
        {
          analysisId: analysis.id,
          repositoryId: repository.id,
          repositoryUrl: repository.url,
          branch: repository.defaultBranch,
        },
        { jobId: analysis.id },
      );
    } catch (error) {
      const duplicate = error instanceof Error && /already exists|duplicat/i.test(error.message);
      if (!duplicate) throw error;
      log("info", "queue.duplicate_ignored", { analysisId: analysis.id, repositoryId });
      return { analysisId: analysis.id, status: analysis.status, alreadyRunning: true };
    }

    await this.cache.invalidateUser(userId, repositoryId);
    return { analysisId: analysis.id, status: analysis.status, alreadyRunning: false };
  }

  private async abandonRunning(repositoryId: string) {
    const running = await this.prisma.analysis.findMany({
      where: { repositoryId, status: { in: ["queued", "cloning", "scanning", "analyzing"] } },
    });
    for (const analysis of running) {
      await this.prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          cancelRequested: true,
          status: "cancelled",
          currentStep: "Cancelled for retry",
          error: "Replaced by a new analysis run.",
          completedAt: new Date(),
        },
      });
      const job = await this.queue.getJob(analysis.id);
      if (!job) continue;
      try {
        await job.remove();
      } catch {
        try {
          await job.discard();
        } catch {
          /* lock expires; new job still starts */
        }
      }
    }
  }

  async cancel(userId: string, analysisId: string) {
    const analysis = await this.prisma.analysis.findFirst({
      where: { id: analysisId, repository: { userId } },
    });
    if (!analysis) throw new NotFoundException("Analysis not found.");

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: { cancelRequested: true, currentStep: "Cancelling…" },
    });
    const job = await this.queue.getJob(analysisId);
    if (job && (await job.isWaiting())) await job.remove();
    await this.cache.invalidateUser(userId, analysis.repositoryId);

    return { analysisId, cancelling: true };
  }

  async latest(userId: string, repositoryId: string) {
    await this.assertOwnership(userId, repositoryId);
    return this.cache.wrap(cacheKeys.analysis(userId, repositoryId), CacheTtl.analysisSummary, () =>
      this.prisma.analysis.findFirst({
        where: { repositoryId },
        orderBy: { createdAt: "desc" },
        include: { result: true },
      }),
    );
  }

  async list(userId: string, repositoryId: string) {
    await this.assertOwnership(userId, repositoryId);
    return this.prisma.analysis.findMany({
      where: { repositoryId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }

  private async assertOwnership(userId: string, repositoryId: string) {
    const repository = await this.prisma.repository.findFirst({
      where: { id: repositoryId, userId },
    });
    if (!repository) throw new NotFoundException("Repository not found.");
    return repository;
  }
}
