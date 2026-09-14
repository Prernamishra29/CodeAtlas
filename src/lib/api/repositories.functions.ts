import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Real backend endpoints (Controller layer). Every handler runs as the
 * signed-in user, so row-level security guarantees a caller can only ever
 * touch their own repositories — client-supplied user ids are never trusted.
 */

const githubUrl = z
  .string()
  .trim()
  .min(1, "A repository URL is required.")
  .max(300)
  .regex(
    /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
    "Use the form https://github.com/user/project",
  );

const createSchema = z.object({
  url: githubUrl,
  branch: z.string().trim().max(80).optional(),
});

const idSchema = z.object({ id: z.string().uuid("Unknown repository.") });

const REPO_COLUMNS =
  "id, name, owner, url, default_branch, description, status, last_analyzed_at, created_at, updated_at, analysis_results(total_files, total_lines, total_bytes, total_folders, languages, created_at)";

export const listRepositoriesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("repositories")
      .select(REPO_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getRepositoryFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("repositories")
      .select(REPO_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ?? null;
  });

export const createRepositoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const cleaned = data.url.replace(/\/$/, "");
    const [owner = "", name = ""] = cleaned.split("/").slice(-2);

    const { data: row, error } = await context.supabase
      .from("repositories")
      .insert({
        user_id: context.userId,
        name,
        owner,
        url: cleaned,
        default_branch: data.branch?.trim() || "main",
        description: "Imported repository — awaiting first analysis.",
      })
      .select(REPO_COLUMNS)
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("That repository is already in your workspace.");
      }
      throw new Error(error.message);
    }

    return row;
  });

export const deleteRepositoryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("repositories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id, deleted: true as const };
  });

/**
 * Enqueues an analysis job. The request only writes the queued record and pokes
 * the queue runner — analysis itself never happens inside this HTTP request.
 */
export const startAnalysisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: repo, error: repoError } = await context.supabase
      .from("repositories")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (repoError) throw new Error(repoError.message);
    if (!repo) throw new Error("Repository not found.");

    const { data: active } = await context.supabase
      .from("analyses")
      .select("id, status")
      .eq("repository_id", repo.id)
      .in("status", ["queued", "cloning", "scanning", "analyzing"])
      .limit(1)
      .maybeSingle();
    if (active) {
      return { analysisId: active.id, status: active.status, alreadyRunning: true as const };
    }

    const { data: analysis, error } = await context.supabase
      .from("analyses")
      .insert({
        repository_id: repo.id,
        status: "queued",
        progress: 0,
        current_step: "Queued for analysis",
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("repositories").update({ status: "queued" }).eq("id", repo.id);
    await pokeQueueRunner();

    return { analysisId: analysis.id, status: analysis.status, alreadyRunning: false as const };
  });

/** Fire-and-forget trigger for the queue runner endpoint. */
async function pokeQueueRunner() {
  try {
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const origin = new URL(getRequestUrl()).origin;
    const key = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
    void fetch(`${origin}/api/public/hooks/process-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key },
      body: "{}",
    }).catch(() => undefined);
  } catch {
    /* the scheduled sweep picks the job up regardless */
  }
}

export const cancelAnalysisFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("analyses")
      .update({ cancel_requested: true, current_step: "Cancelling…" })
      .eq("id", data.id)
      .in("status", ["queued", "cloning", "scanning", "analyzing"])
      .select("id, status");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("This analysis can no longer be cancelled.");
    return { id: data.id, cancelling: true as const };
  });

export const latestAnalysisFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("analyses")
      .select(
        "id, status, progress, current_step, error, attempts, max_attempts, started_at, completed_at, created_at",
      )
      .eq("repository_id", data.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;

    const { data: result } = await context.supabase
      .from("analysis_results")
      .select(
        "total_files, total_lines, total_bytes, total_folders, languages, folders, largest_files",
      )
      .eq("analysis_id", row.id)
      .maybeSingle();

    return { ...row, result: result ?? null };
  });

export const listAnalysesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("analyses")
      .select(
        "id, status, progress, current_step, error, attempts, started_at, completed_at, created_at",
      )
      .eq("repository_id", data.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getFilesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Prisma creates tables as "CodeFile", "Symbol"
    const { data: files, error } = await context.supabase
      .from("CodeFile")
      .select("*, symbols:Symbol(*)")
      .eq("repositoryId", data.id)
      .order("path");

    if (error) {
      console.error("CodeFile error", error);
      return [];
    }
    return files ?? [];
  });

export const getDependenciesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: deps, error } = await context.supabase
      .from("Dependency")
      .select(
        "*, source:CodeFile!Dependency_sourceId_fkey(*), target:CodeFile!Dependency_targetId_fkey(*)",
      )
      .eq("repositoryId", data.id);

    if (error) {
      console.error("Dependency error", error);
      return [];
    }
    return deps ?? [];
  });
