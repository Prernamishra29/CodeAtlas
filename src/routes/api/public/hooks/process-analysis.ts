/**
 * Analysis queue runner. External callers (the enqueue hook and the scheduled
 * sweep) trigger this endpoint; the HTTP request that starts an analysis never
 * performs the work itself.
 *
 * Claims due jobs, runs the analyzer stages, persists metrics and applies the
 * retry / backoff / dead-letter policy. Internal errors are logged server-side
 * and never returned to users.
 */
import { createFileRoute } from "@tanstack/react-router";
import {
  AnalysisError,
  calculateMetadata,
  cloneRepository,
  scanFiles,
  validateRepository,
} from "@/lib/analysis/pipeline.server";

const MAX_JOBS_PER_RUN = 2;
const JOB_TIMEOUT_MS = 120_000;
const BASE_BACKOFF_MS = 15_000;

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Db = Awaited<ReturnType<typeof getAdmin>>;

async function setProgress(
  db: Db,
  analysisId: string,
  status: "cloning" | "scanning" | "analyzing",
  progress: number,
  step: string,
) {
  await db.from("analyses").update({ status, progress, current_step: step }).eq("id", analysisId);
}

async function isCancelled(db: Db, analysisId: string) {
  const { data } = await db.from("analyses").select("cancel_requested").eq("id", analysisId).maybeSingle();
  return Boolean(data?.cancel_requested);
}

class CancelledError extends Error {}

async function withTimeout<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new AnalysisError("Analysis timed out.", true)), JOB_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runJob(db: Db, job: {
  id: string;
  repository_id: string;
  attempts: number;
  max_attempts: number;
}) {
  const { data: repo } = await db
    .from("repositories")
    .select("id, url, default_branch")
    .eq("id", job.repository_id)
    .maybeSingle();

  if (!repo) throw new AnalysisError("Repository not found.");

  const guard = async () => {
    if (await isCancelled(db, job.id)) throw new CancelledError();
  };

  await setProgress(db, job.id, "cloning", 10, "Validating repository");
  const { owner, name, branch } = await validateRepository(repo.url, repo.default_branch);
  await guard();

  await setProgress(db, job.id, "cloning", 30, "Cloning repository");
  const archive = await cloneRepository(owner, name, branch);
  await guard();

  await setProgress(db, job.id, "scanning", 60, "Scanning files");
  const files = scanFiles(archive);
  await guard();

  await setProgress(db, job.id, "analyzing", 85, "Calculating metadata");
  const metrics = calculateMetadata(files);

  await db.from("analysis_results").upsert(
    {
      analysis_id: job.id,
      repository_id: repo.id,
      total_files: metrics.totalFiles,
      total_lines: metrics.totalLines,
      total_bytes: metrics.totalBytes,
      total_folders: metrics.totalFolders,
      languages: metrics.languages,
      folders: metrics.folders,
      largest_files: metrics.largestFiles,
    },
    { onConflict: "analysis_id" },
  );

  const completedAt = new Date().toISOString();
  await db
    .from("analyses")
    .update({
      status: "completed",
      progress: 100,
      current_step: "Completed",
      error: null,
      completed_at: completedAt,
      locked_at: null,
    })
    .eq("id", job.id);
  await db
    .from("repositories")
    .update({ status: "completed", last_analyzed_at: completedAt })
    .eq("id", repo.id);
}

async function handleFailure(
  db: Db,
  job: { id: string; repository_id: string; attempts: number; max_attempts: number },
  error: unknown,
) {
  const retryable = error instanceof AnalysisError ? error.retryable : true;
  const message =
    error instanceof AnalysisError ? error.message : "Analysis failed due to an internal error.";
  console.error("analysis job failed", job.id, error);

  const attempts = job.attempts;
  if (retryable && attempts < job.max_attempts) {
    const delay = BASE_BACKOFF_MS * 2 ** (attempts - 1);
    await db
      .from("analyses")
      .update({
        status: "queued",
        current_step: `Retrying (attempt ${attempts + 1} of ${job.max_attempts})`,
        error: message,
        locked_at: null,
        next_run_at: new Date(Date.now() + delay).toISOString(),
      })
      .eq("id", job.id);
    return;
  }

  await db
    .from("analyses")
    .update({
      status: "failed",
      error: message,
      current_step: "Failed",
      completed_at: new Date().toISOString(),
      locked_at: null,
      dead_lettered: !retryable ? false : true,
    })
    .eq("id", job.id);
  await db.from("repositories").update({ status: "failed" }).eq("id", job.repository_id);
}

async function processQueue() {
  const db = await getAdmin();
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - JOB_TIMEOUT_MS).toISOString();

  // Release jobs whose worker died mid-flight.
  await db
    .from("analyses")
    .update({ status: "queued", locked_at: null })
    .in("status", ["cloning", "scanning", "analyzing"])
    .lt("locked_at", staleIso);

  const { data: jobs } = await db
    .from("analyses")
    .select("id, repository_id, attempts, max_attempts, cancel_requested")
    .eq("status", "queued")
    .lte("next_run_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(MAX_JOBS_PER_RUN);

  let processed = 0;
  for (const job of jobs ?? []) {
    if (job.cancel_requested) {
      await db
        .from("analyses")
        .update({ status: "cancelled", current_step: "Cancelled", locked_at: null })
        .eq("id", job.id);
      await db.from("repositories").update({ status: "not_analyzed" }).eq("id", job.repository_id);
      continue;
    }

    const attempts = job.attempts + 1;
    const { data: claimed } = await db
      .from("analyses")
      .update({
        status: "cloning",
        attempts,
        progress: 5,
        current_step: "Starting analysis",
        started_at: new Date().toISOString(),
        locked_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    await db.from("repositories").update({ status: "analyzing" }).eq("id", job.repository_id);

    try {
      await withTimeout(runJob(db, { ...job, attempts }));
      processed += 1;
    } catch (error) {
      if (error instanceof CancelledError) {
        await db
          .from("analyses")
          .update({ status: "cancelled", current_step: "Cancelled", locked_at: null })
          .eq("id", job.id);
        await db.from("repositories").update({ status: "not_analyzed" }).eq("id", job.repository_id);
        continue;
      }
      await handleFailure(db, { ...job, attempts }, error);
    }
  }

  return { claimed: jobs?.length ?? 0, processed };
}

export const Route = createFileRoute("/api/public/hooks/process-analysis")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? "";
        const accepted = [
          process.env["SUPABASE_ANON_KEY"],
          process.env["SUPABASE_PUBLISHABLE_KEY"],
        ].filter((value): value is string => Boolean(value));
        if (accepted.length === 0 || !accepted.includes(key)) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const result = await processQueue();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("queue runner failed", error);
          return new Response(JSON.stringify({ ok: false, error: "Queue runner failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
