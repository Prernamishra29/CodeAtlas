import "dotenv/config";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker, Queue, type Job } from "bullmq";
import { PrismaClient } from "@prisma/client";
import {
  ANALYSIS_DLQ,
  ANALYSIS_QUEUE,
  JOB_TIMEOUT_MS,
  LOCK_DURATION_MS,
  MAX_ATTEMPTS,
  MAX_STALLED_COUNT,
  STALLED_INTERVAL_MS,
  isTerminalAnalysisStatus,
  redisConnection,
  type AnalysisJobData,
} from "../queue/queue.constants";
import { AnalysisFailure, calculateMetadata, scanDirectory, ScannedFile } from "./scanner";
import { analyzeFile } from "./analyzer";
import { generateAiDocumentation } from "./ai-generator";
import { decryptSecret, githubCloneUrl } from "../auth/secrets";
import { log } from "../common/logger";
import { resolveInside } from "../common/workspace";
import { repoCacheKeys } from "../cache/cache.keys";
import { recordUserNotification } from "../notifications/notifications.service";
import { frontendUrl } from "../common/env";
import Redis from "ioredis";

const prisma = new PrismaClient();
const deadLetter = new Queue(ANALYSIS_DLQ, { connection: redisConnection() });
const cacheRedis = new Redis(redisConnection());

async function invalidateRepoCache(repositoryId: string) {
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { userId: true },
  });
  if (!repository) return;
  const keys = repoCacheKeys(repository.userId, repositoryId);
  if (keys.length) await cacheRedis.del(...keys);
}

class Cancelled extends Error {}

async function setStage(
  analysisId: string,
  status: "cloning" | "scanning" | "analyzing",
  progress: number,
  currentStep: string,
) {
  await prisma.analysis.update({
    where: { id: analysisId },
    data: { status, progress, currentStep },
  });
}

async function assertNotCancelled(analysisId: string) {
  const analysis = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (analysis?.cancelRequested) throw new Cancelled();
}

function redactSecrets(text: string, token?: string) {
  let out = text.replace(/https:\/\/x-access-token:[^@\s]+@/gi, "https://x-access-token:***@");
  if (token) out = out.split(token).join("***");
  return out;
}

async function cloneTargetFor(repositoryId: string, publicUrl: string) {
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: { user: { select: { githubTokenCipher: true } } },
  });
  const cipher = repository?.user.githubTokenCipher;
  if (!cipher) return { cloneUrl: publicUrl, token: undefined as string | undefined, usingToken: false };
  try {
    const token = decryptSecret(cipher);
    return { cloneUrl: githubCloneUrl(publicUrl, token), token, usingToken: true };
  } catch {
    log("error", "github.token_decrypt_failed", { repositoryId });
    return { cloneUrl: publicUrl, token: undefined, usingToken: false };
  }
}

/** Shallow clone into an isolated temporary directory. Never log authenticated URLs. */
function gitClone(publicUrl: string, cloneUrl: string, branch: string, target: string, usingToken: boolean, token?: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(
      "git",
      ["clone", "--depth", "1", "--single-branch", "--branch", branch, cloneUrl, target],
      { env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "true" } },
    );

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new AnalysisFailure("Cloning the repository timed out.", true));
    }, JOB_TIMEOUT_MS / 2);

    child.on("error", () => {
      clearTimeout(timer);
      reject(new AnalysisFailure("Cloning the repository failed.", true));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      const safeStderr = redactSecrets(stderr, token);
      const notFound = /not found|does not exist|Repository not found/i.test(safeStderr);
      const authFailed = /Authentication|could not read Username|Permission denied|invalid credentials|HTTP Basic/i.test(
        safeStderr,
      );
      const message = /Remote branch .* not found/i.test(safeStderr)
        ? `Branch "${branch}" was not found in this repository.`
        : authFailed
          ? usingToken
            ? "GitHub rejected the token. Replace it in Settings → GitHub and confirm it can access this repository."
            : "This repository is private. Save a GitHub token in Settings → GitHub, then retry analysis."
          : notFound
            ? usingToken
              ? "Repository not found, or this token cannot access it. Check the token scopes and repository access."
              : "Repository not found, or it is private. Save a GitHub token in Settings → GitHub to import private repos."
            : "Cloning the repository failed.";
      log("error", "git.clone_failed", { url: publicUrl, branch, usingToken });
      reject(new AnalysisFailure(message));
    });
  });
}

async function isSuperseded(analysisId: string, repositoryId: string) {
  const current = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (!current || current.cancelRequested || current.status === "cancelled") return true;
  const newer = await prisma.analysis.findFirst({
    where: {
      repositoryId,
      createdAt: { gt: current.createdAt },
      status: { not: "cancelled" },
    },
    select: { id: true },
  });
  return Boolean(newer);
}

async function processJob(job: Job<AnalysisJobData>) {
  const { analysisId, repositoryId, repositoryUrl, branch } = job.data;
  const queuedAt = job.timestamp ?? Date.now();
  log("info", "analysis.started", {
    analysisId,
    repositoryId,
    attempt: job.attemptsMade + 1,
    queueLatencyMs: Date.now() - queuedAt,
  });

  const existing = await prisma.analysis.findUnique({ where: { id: analysisId } });
  if (!existing || isTerminalAnalysisStatus(existing.status)) {
    log("info", "analysis.skipped_idempotent", { analysisId, status: existing?.status });
    return { analysisId, skipped: true };
  }

  const tmpRoot = path.resolve(process.env.ANALYSIS_TMP_DIR ?? os.tmpdir());
  await fs.mkdir(tmpRoot, { recursive: true });
  const workspace = resolveInside(tmpRoot, path.relative(tmpRoot, await fs.mkdtemp(path.join(tmpRoot, "codeatlas-"))));

  try {
    if (await isSuperseded(analysisId, repositoryId)) throw new Cancelled();
    await assertNotCancelled(analysisId);
    await prisma.repository.update({ where: { id: repositoryId }, data: { status: "analyzing" } });
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { startedAt: new Date(), attempts: job.attemptsMade + 1 },
    });

    await setStage(analysisId, "cloning", 20, "Cloning repository");
    log("info", "analysis.cloning", { analysisId, repositoryUrl, branch });
    const clone = await cloneTargetFor(repositoryId, repositoryUrl);
    await gitClone(repositoryUrl, clone.cloneUrl, branch, workspace, clone.usingToken, clone.token);
    log("info", "analysis.cloned", { analysisId });
    await assertNotCancelled(analysisId);

    await setStage(analysisId, "scanning", 60, "Scanning files");
    const files = await scanDirectory(workspace);
    await assertNotCancelled(analysisId);

    await setStage(analysisId, "analyzing", 85, "Calculating metadata");
    const metrics = calculateMetadata(files);

    await setStage(analysisId, "analyzing", 90, "Extracting symbols and dependencies");
    if (await isSuperseded(analysisId, repositoryId)) throw new Cancelled();
    // Clear old data for this repository
    await prisma.codeFile.deleteMany({ where: { repositoryId } });

    const codeFilesDbMap = new Map<string, string>();
    const allDependencies: { sourcePath: string; targetPath: string; type: string }[] = [];
    const parseable = new Set([
      "javascript",
      "typescript",
      "tsx",
      "jsx",
      "python",
      "java",
      "go",
      "react",
      "rust",
      "c",
      "c++",
      "ruby",
      "php",
      "c#",
      "kotlin",
      "swift",
    ]);

    for (const file of files) {
      let content: string | null = null;
      try {
        const raw = await fs.readFile(resolveInside(workspace, file.path));
        if (raw.includes(0)) {
          content = null;
        } else {
          const text = raw.toString("utf8");
          content = sanitizePgText(text.length > 80_000 ? text.slice(0, 80_000) : text);
        }
      } catch {
        content = null;
      }

      let analysis: Awaited<ReturnType<typeof analyzeFile>>;
      try {
        analysis = parseable.has(file.language.toLowerCase())
          ? await analyzeFile(file, workspace)
          : {
              path: file.path,
              language: file.language,
              size: file.bytes,
              lines: file.lines,
              complexity: 0,
              symbols: [],
              dependencies: [],
            };
      } catch (error) {
        console.warn("file analysis skipped", file.path, error);
        analysis = {
          path: file.path,
          language: file.language,
          size: file.bytes,
          lines: file.lines,
          complexity: 0,
          symbols: [],
          dependencies: [],
        };
      }

      const codeFile = await prisma.codeFile.create({
        data: {
          repositoryId,
          path: sanitizePgText(analysis.path) ?? analysis.path,
          language: sanitizePgText(analysis.language) ?? analysis.language,
          size: analysis.size,
          lines: analysis.lines,
          complexity: analysis.complexity,
          content,
        },
      });
      codeFilesDbMap.set(analysis.path, codeFile.id);

      const symbolDbMap = new Map<string, string>();
      for (const sym of analysis.symbols) {
        const parentId = sym.parentName ? symbolDbMap.get(sym.parentName) : null;
        const name = sanitizePgText(sym.name);
        if (!name) continue;
        const dbSym = await prisma.symbol.create({
          data: {
            fileId: codeFile.id,
            name,
            type: sanitizePgText(sym.type) ?? "unknown",
            line: sym.line,
            column: sym.column,
            parentSymbolId: parentId,
          },
        });
        symbolDbMap.set(sym.name, dbSym.id);
      }

      for (const dep of analysis.dependencies) {
        allDependencies.push({ sourcePath: analysis.path, targetPath: dep.targetPath, type: dep.type });
      }
    }

    // Resolve and insert dependencies
    for (const dep of allDependencies) {
      const sourceId = codeFilesDbMap.get(dep.sourcePath);
      if (!sourceId) continue;

      // Basic resolution: try to find a file path that ends with the imported targetPath
      // This is a naive resolution. A robust resolution would handle relative paths properly.
      let targetId = null;
      let cleanTarget = dep.targetPath.replace(/^(\.\/|\.\.\/)+/, ""); // strip relative parts for naive match
      
      for (const [path, id] of codeFilesDbMap.entries()) {
        if (path.includes(cleanTarget) && path !== dep.sourcePath) {
          targetId = id;
          break;
        }
      }

      await prisma.dependency.create({
        data: {
          repositoryId,
          sourceId,
          targetId,
          targetPath: sanitizePgText(dep.targetPath) ?? dep.targetPath,
          type: sanitizePgText(dep.type) ?? "import",
        },
      });
    }

    await prisma.analysisResult.upsert({
      where: { analysisId },
      create: { analysisId, repositoryId, ...serialize(metrics) },
      update: serialize(metrics),
    });

    await setStage(analysisId, "analyzing", 95, "Generating AI Documentation");
    let docsGenerated = false;
    try {
      docsGenerated = await generateAiDocumentation(repositoryId);
    } catch (err) {
      log("warn", "analysis.docs_failed", { analysisId, err: err instanceof Error ? err.name : "unknown" });
    }

    if (await isSuperseded(analysisId, repositoryId)) throw new Cancelled();

    const completedAt = new Date();
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "completed",
        progress: 100,
        currentStep: "Completed",
        error: null,
        completedAt,
      },
    });
    await prisma.repository.update({
      where: { id: repositoryId },
      data: {
        status: "completed",
        lastAnalyzedAt: completedAt,
        description: `Analyzed ${metrics.totalFiles} files · ${metrics.totalLines.toLocaleString()} lines`,
      },
    });

    await invalidateRepoCache(repositoryId);
    await notifyRepository(repositoryId, "completed");
    if (docsGenerated) await notifyRepository(repositoryId, "insights");
    log("info", "analysis.completed", {
      analysisId,
      repositoryId,
      totalFiles: metrics.totalFiles,
      ms: Date.now() - queuedAt,
    });
    return { analysisId, totalFiles: metrics.totalFiles, totalLines: metrics.totalLines };
  } catch (error) {
    if (error instanceof Cancelled) {
      await prisma.analysis.update({
        where: { id: analysisId },
        data: { status: "cancelled", currentStep: "Cancelled" },
      });
      const replacement = await prisma.analysis.findFirst({
        where: {
          repositoryId,
          id: { not: analysisId },
          status: { in: ["queued", "cloning", "scanning", "analyzing"] },
        },
      });
      if (!replacement) {
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { status: "not_analyzed" },
        });
      }
      return { analysisId, cancelled: true };
    }

    const retryable = error instanceof AnalysisFailure ? error.retryable : true;
    const message =
      error instanceof AnalysisFailure
        ? error.message
        : "Analysis failed due to an internal error.";
    log("error", "analysis.failed", { analysisId, retryable, err: error instanceof Error ? error.name : "unknown" });

    const lastAttempt = !retryable || job.attemptsMade + 1 >= MAX_ATTEMPTS;
    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: lastAttempt ? "failed" : "queued",
        error: message,
        currentStep: lastAttempt ? "Failed" : "Retrying",
        completedAt: lastAttempt ? new Date() : null,
      },
    });
    if (lastAttempt) {
      await prisma.repository.update({ where: { id: repositoryId }, data: { status: "failed" } });
      await deadLetter.add("dead-letter", { ...job.data, reason: message });
      await invalidateRepoCache(repositoryId);
      await notifyRepository(repositoryId, "failed", message);
      log("error", "analysis.dead_letter", { analysisId, repositoryId });
      if (!retryable) await job.discard();
    }
    throw new Error(message);
  } finally {
    // Always clean the temporary checkout, even on disk or clone errors.
    await fs.rm(workspace, { recursive: true, force: true }).catch((error) => {
      log("warn", "workspace.cleanup_failed", { err: error instanceof Error ? error.name : "unknown" });
    });
  }
}

async function notifyRepository(repositoryId: string, kind: "completed" | "failed" | "insights", error?: string) {
  const repository = await prisma.repository.findUnique({
    where: { id: repositoryId },
    select: {
      id: true,
      name: true,
      owner: true,
      userId: true,
      user: { select: { notifyAnalysis: true, notifyInsights: true } },
    },
  });
  if (!repository) return;
  const label = `${repository.owner}/${repository.name}`;
  const link = `${frontendUrl()}/repositories/${repository.id}`;
  if (kind === "completed" && repository.user.notifyAnalysis) {
    await recordUserNotification(prisma, {
      userId: repository.userId,
      repositoryId: repository.id,
      type: "analysis_completed",
      title: `${label} is ready`,
      body: "Analysis finished. Open the repo to see maps, health, and docs.",
      preferEmail: true,
      email: { subject: `CodeAtlas: ${label} is ready`, text: `${label} finished analysis.\n${link}` },
    });
  }
  if (kind === "failed" && repository.user.notifyAnalysis) {
    await recordUserNotification(prisma, {
      userId: repository.userId,
      repositoryId: repository.id,
      type: "analysis_failed",
      title: `${label} failed`,
      body: error || "Analysis failed. Open the repo and retry.",
      preferEmail: true,
      email: {
        subject: `CodeAtlas: ${label} analysis failed`,
        text: `${label} failed.\n${error ?? ""}\n${link}`,
      },
    });
  }
  if (kind === "insights" && repository.user.notifyInsights) {
    await recordUserNotification(prisma, {
      userId: repository.userId,
      repositoryId: repository.id,
      type: "insights_ready",
      title: `${label} docs updated`,
      body: "Generated documentation is available on the Docs tab.",
      preferEmail: true,
      email: { subject: `CodeAtlas: ${label} docs are ready`, text: `Documentation for ${label} is ready.\n${link}` },
    });
  }
}

function sanitizePgText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const cleaned = value.replace(/\u0000/g, "");
  return cleaned.length ? cleaned : null;
}

function serialize(metrics: ReturnType<typeof calculateMetadata>) {
  return {
    totalFiles: metrics.totalFiles,
    totalLines: metrics.totalLines,
    totalBytes: metrics.totalBytes,
    totalFolders: metrics.totalFolders,
    languages: metrics.languages as unknown as object,
    folders: metrics.folders as unknown as object,
    largestFiles: metrics.largestFiles as unknown as object,
  };
}

const worker = new Worker<AnalysisJobData>(ANALYSIS_QUEUE, processJob, {
  connection: redisConnection(),
  concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
  lockDuration: LOCK_DURATION_MS,
  stalledInterval: STALLED_INTERVAL_MS,
  maxStalledCount: MAX_STALLED_COUNT,
});

worker.on("completed", (job) => log("info", "worker.completed", { jobId: job.id }));
worker.on("failed", (job, error) =>
  log("error", "worker.failed", { jobId: job?.id, err: error.message }),
);
worker.on("stalled", (jobId) => log("warn", "worker.stalled", { jobId }));

async function shutdown() {
  await worker.close();
  await deadLetter.close();
  cacheRedis.disconnect();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

log("info", "worker.started", { queue: ANALYSIS_QUEUE });
