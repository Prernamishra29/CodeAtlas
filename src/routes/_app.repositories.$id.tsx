import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  notFound,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { ExternalLink, GitBranch, Play, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AnalysisProgress } from "@/components/common/analysis-progress";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useRetryAnalysis } from "@/features/repositories/use-retry-analysis";
import { analysisApi, isActiveAnalysis } from "@/lib/api/analysis";
import { repositoriesApi } from "@/lib/api/repositories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/repositories/$id")({
  loader: async ({ params }) => {
    const repository = await repositoriesApi.get(params.id);
    if (!repository) throw notFound();
    return { repository };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.repository.name} — CodeAtlas` },
          { name: "description", content: loaderData.repository.description },
          { property: "og:title", content: `${loaderData.repository.name} — CodeAtlas` },
          { property: "og:description", content: loaderData.repository.description },
        ]
      : [{ title: "Repository unavailable — CodeAtlas" }, { name: "robots", content: "noindex" }],
  }),
  component: RepositoryLayout,
  notFoundComponent: RepositoryNotFound,
});

const tabs = [
  { label: "Overview", segment: "" },
  { label: "Architecture", segment: "architecture" },
  { label: "Dependencies", segment: "dependencies" },
  { label: "Files", segment: "files" },
  { label: "Search", segment: "search" },
  { label: "AI Chat", segment: "chat" },
  { label: "Health", segment: "health" },
  { label: "Documentation", segment: "documentation" },
] as const;

function RepositoryNotFound() {
  const { id } = Route.useParams();
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-semibold">Repository “{id}” not found</h1>
      <p className="mt-2 text-sm text-white/55">It may have been removed from this workspace.</p>
      <Button asChild variant="outline" className="mt-4">
        <Link to="/repositories">Back to repositories</Link>
      </Button>
    </div>
  );
}

function RepositoryLayout() {
  const { repository } = Route.useLoaderData();
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  const queryClient = useQueryClient();

  const analysis = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => analysisApi.latest(id),
    refetchInterval: (query) => (isActiveAnalysis(query.state.data?.status) ? 2000 : false),
  });

  const active = isActiveAnalysis(analysis.data?.status);
  const status = analysis.data?.status;

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["analysis", id] }),
      queryClient.invalidateQueries({ queryKey: ["repositories"] }),
      queryClient.invalidateQueries({ queryKey: ["languages", id] }),
    ]);
    await router.invalidate();
  };

  const settled = useRef<string | null>(null);
  useEffect(() => {
    if (!analysis.data || active) return;
    const key = `${analysis.data.id}:${analysis.data.status}`;
    if (settled.current === key) return;
    settled.current = key;
    if (status === "completed") {
      void queryClient.invalidateQueries({ queryKey: ["languages", id] });
      void router.invalidate();
      toast.success("Analysis completed", {
        description: `${analysis.data.result?.total_files ?? 0} files · ${(
          analysis.data.result?.total_lines ?? 0
        ).toLocaleString()} lines`,
      });
    }
  }, [analysis.data, active, status, id, queryClient, router]);

  const analyze = useRetryAnalysis();

  const cancel = useMutation({
    mutationFn: () => analysisApi.cancel(id, analysis.data!.id),
    onSuccess: async () => {
      await refresh();
      toast.success("Cancellation requested");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const failed = status === "failed";

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm text-white/60">{repository.owner}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-white">
            {repository.name}
          </h1>
          <p className="mt-2 text-sm text-white/65">
            {repository.stats.files > 0
              ? `Analyzed ${repository.stats.files.toLocaleString()} files · ${repository.stats.linesOfCode.toLocaleString()} lines`
              : repository.description || "Imported repository"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-white/70">
            <StatusBadge status={repository.status} />
            <a
              href={repository.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-white"
            >
              GitHub
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3.5" aria-hidden />
              {repository.branch}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="rounded-[1.35rem] bg-[#F3EDE4] px-5 py-4 text-zinc-950">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Health / 100
            </p>
            <p className="mt-1 font-display text-4xl font-semibold tabular-nums leading-none">
              {repository.healthScore === 0 ? "—" : repository.healthScore}
            </p>
          </div>
          {active ? (
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              <XCircle className="size-3.5" aria-hidden />
              {cancel.isPending ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
          <Button
            className="gap-1.5"
            disabled={analyze.isPending}
            onClick={() =>
              analyze.mutate(id, {
                onSuccess: () => void refresh(),
              })
            }
          >
            {failed || active || repository.status !== "not_analyzed" ? (
              <RotateCcw className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
            {analyze.isPending
              ? "Queueing…"
              : failed || active || repository.status !== "not_analyzed"
                ? "Retry"
                : "Analyze"}
          </Button>
        </div>
      </header>

      {analysis.data && active ? <AnalysisProgress analysis={analysis.data} /> : null}
      {analysis.data?.error && (active || failed) ? (
        <p className="mt-3 max-w-xl text-sm text-rose-300">{analysis.data.error}</p>
      ) : null}
      {failed && analysis.data && !active ? (
        <p className="mt-5 text-sm text-rose-300">Analysis failed. Use Retry to queue it again.</p>
      ) : null}

      <nav
        aria-label="Repository sections"
        className="mt-8 overflow-x-auto border-b border-white/10"
      >
        <ul className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const href = `/repositories/${id}${tab.segment ? `/${tab.segment}` : ""}`;
            const tabActive = pathname === href;
            return (
              <li key={tab.label}>
                <Link
                  to={href}
                  className={cn(
                    "inline-flex px-3 py-2.5 text-sm transition-colors",
                    tabActive
                      ? "border-b-2 border-[#C9A6FF] font-medium text-white"
                      : "border-b-2 border-transparent text-white/55 hover:text-white",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-8">
        <Outlet />
      </div>
    </div>
  );
}
