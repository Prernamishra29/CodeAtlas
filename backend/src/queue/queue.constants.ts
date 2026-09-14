/** Shared queue contract between the API (producer) and the dedicated worker. */
export const ANALYSIS_QUEUE = "repository-analysis";
export const ANALYSIS_DLQ = "repository-analysis-dead-letter";

export const AnalysisJobType = {
  CLONE_REPOSITORY: "CLONE_REPOSITORY",
  SCAN_FILES: "SCAN_FILES",
  CALCULATE_METADATA: "CALCULATE_METADATA",
  FINALIZE_ANALYSIS: "FINALIZE_ANALYSIS",
} as const;

export type AnalysisJobType = (typeof AnalysisJobType)[keyof typeof AnalysisJobType];

export interface AnalysisJobData {
  analysisId: string;
  repositoryId: string;
  repositoryUrl: string;
  branch: string;
}

/** Hard ceiling for a single analysis attempt. */
export const JOB_TIMEOUT_MS = 10 * 60 * 1000;
/** Failed jobs retry twice more with exponential backoff (15s, 30s, 60s). */
export const MAX_ATTEMPTS = 3;
export const BACKOFF_MS = 15_000;
/** Worker lock is renewed while the job runs; stalled jobs are recovered then DLQ'd. */
export const LOCK_DURATION_MS = 120_000;
export const STALLED_INTERVAL_MS = 30_000;
export const MAX_STALLED_COUNT = 1;

export const defaultJobOptions = {
  attempts: MAX_ATTEMPTS,
  backoff: { type: "exponential" as const, delay: BACKOFF_MS },
  timeout: JOB_TIMEOUT_MS,
  removeOnComplete: 100,
  removeOnFail: false,
};

export function isTerminalAnalysisStatus(status: string) {
  return status === "completed" || status === "cancelled";
}

export function redisConnection() {
  return {
    host: process.env.REDIS_HOST ?? "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}
