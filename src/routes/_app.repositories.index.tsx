import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  Github,
  LayoutDashboard,
  Loader2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Waypoints,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ErrorState } from "@/components/common/error-state";
import { PageTransition } from "@/components/common/page-transition";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useRetryAnalysis } from "@/features/repositories/use-retry-analysis";
import { repositoriesApi } from "@/lib/api/repositories";
import { useUiStore } from "@/store/ui-store";
import type { RepoStatus, Repository } from "@/types";

export const Route = createFileRoute("/_app/repositories/")({
  head: () => ({
    meta: [
      { title: "Repositories — CodeAtlas" },
      {
        name: "description",
        content: "Search, filter and manage the repositories in your CodeAtlas workspace.",
      },
    ],
  }),
  component: RepositoriesPage,
});

const menuItem =
  "cursor-pointer rounded-xl px-3 py-2.5 text-[13px] text-zinc-900 focus:bg-zinc-950/8 focus:text-zinc-950";

const rails = ["#C9A6FF", "#5eead4", "#fdba74", "#f9a8d4"];

const statusOptions: Array<{ value: RepoStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "not_analyzed", label: "Not analyzed" },
  { value: "queued", label: "Queued" },
  { value: "analyzing", label: "Analyzing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function statusLine(status: RepoStatus) {
  if (status === "completed") return "Ready";
  if (status === "failed") return "Failed";
  if (status === "analyzing") return "Analyzing · 2–4 min";
  if (status === "queued") return "Queued · waiting";
  return "Not analyzed";
}

function whenAnalyzed(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function RepositoriesPage() {
  const setImportModalOpen = useUiStore((s) => s.setImportModalOpen);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RepoStatus | "all">("all");
  const [sort, setSort] = useState<"recent" | "name" | "health">("recent");
  const queryClient = useQueryClient();
  const retry = useRetryAnalysis();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["repositories"],
    queryFn: repositoriesApi.list,
    refetchInterval: (q) =>
      (q.state.data ?? []).some((r) => r.status === "queued" || r.status === "analyzing")
        ? 3000
        : false,
  });

  const remove = useMutation({
    mutationFn: (id: string) => repositoriesApi.remove(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["repositories"] });
      const previous = queryClient.getQueryData<Repository[]>(["repositories"]);
      queryClient.setQueryData<Repository[]>(["repositories"], (current) =>
        (current ?? []).filter((repo) => repo.id !== id),
      );
      return { previous };
    },
    onError: (error: Error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["repositories"], context.previous);
      toast.error(error.message);
    },
    onSuccess: () => toast.success("Repository removed"),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["repositories"] }),
  });

  const all = data ?? [];
  const rows = useMemo(() => {
    const filtered = all.filter((repo) => {
      const q = query.trim().toLowerCase();
      const matchesQuery = `${repo.owner}/${repo.name} ${repo.description} ${repo.language}`
        .toLowerCase()
        .includes(q);
      const matchesStatus = status === "all" || repo.status === status;
      return matchesQuery && matchesStatus;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "health") return b.healthScore - a.healthScore;
      return (b.lastAnalyzedAt ?? "").localeCompare(a.lastAnalyzedAt ?? "");
    });
  }, [all, query, sort, status]);

  const searching = query.trim().length > 0 || status !== "all";

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white">
              Repositories
            </h1>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/65">
              {all.length === 0
                ? "Import a GitHub repo to map it, score health, and generate docs."
                : `${all.length} imported. Open one for the map, health, and chat.`}
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setImportModalOpen(true)}>
            <Plus className="size-3.5" />
            Import
          </Button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, owner, language"
              aria-label="Search repositories"
              className="border-white/10 bg-white/[0.07] pl-9 text-white"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as RepoStatus | "all")}>
            <SelectTrigger
              className="w-40 border-white/10 bg-white/[0.07]"
              aria-label="Filter by status"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as typeof sort)}>
            <SelectTrigger
              className="w-40 border-white/10 bg-white/[0.07]"
              aria-label="Sort repositories"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently analyzed</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="health">Health score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <div className="mt-8">
            <ErrorState onRetry={() => void refetch()} />
          </div>
        ) : isLoading ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-[7.5rem] rounded-[1.6rem]" />
            <Skeleton className="h-[7.5rem] rounded-[1.6rem]" />
            <Skeleton className="h-[7.5rem] rounded-[1.6rem]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-[1.6rem] bg-white/[0.07] px-6 py-10 ring-1 ring-white/10">
            <p className="font-medium text-white">
              {searching ? "Nothing matches" : "No repositories yet"}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/55">
              {searching
                ? "Try another name, owner, or status."
                : "Paste a GitHub URL. CodeAtlas clones it, maps the architecture, and scores health."}
            </p>
            {searching ? null : (
              <Button className="mt-5" size="sm" onClick={() => setImportModalOpen(true)}>
                Import a repository
              </Button>
            )}
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {rows.map((repo, index) => (
              <RepoListCard
                key={repo.id}
                repo={repo}
                accent={rails[index % rails.length] ?? "#C9A6FF"}
                retrying={retry.isPending && retry.variables === repo.id}
                onRetry={() => retry.mutate(repo.id)}
                onDelete={() => remove.mutate(repo.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}

function RepoListCard({
  repo,
  accent,
  retrying,
  onRetry,
  onDelete,
}: {
  repo: Repository;
  accent: string;
  retrying: boolean;
  onRetry: () => void;
  onDelete: () => void;
}) {
  const busy = repo.status === "queued" || repo.status === "analyzing";
  const analyzed = whenAnalyzed(repo.lastAnalyzedAt);
  const health =
    repo.status === "completed" && repo.healthScore > 0 ? String(repo.healthScore) : "—";

  return (
    <li>
      <article className="group flex overflow-hidden rounded-[1.6rem] bg-white/[0.07] ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:ring-white/16">
        <div className="w-1.5 shrink-0" style={{ background: accent }} aria-hidden />
        <div className="flex min-w-0 flex-1 items-stretch gap-3 p-4 sm:p-5">
          <Link
            to="/repositories/$id"
            params={{ id: repo.id }}
            className="min-w-0 flex-1 cursor-pointer"
          >
            <p className="flex items-center gap-2 text-[11px] text-white/45">
              <Github className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{repo.owner}</span>
            </p>
            <p className="mt-1 truncate font-display text-xl font-semibold tracking-tight text-white">
              {repo.name}
            </p>
            {repo.description ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-white/50">
                {repo.description}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
              <span className="inline-flex items-center gap-1.5 text-white/70">
                {busy ? (
                  <Loader2 className="size-3 animate-spin text-[#C9A6FF]" aria-hidden />
                ) : null}
                {statusLine(repo.status)}
              </span>
              {repo.language ? (
                <span className="font-mono text-white/55">{repo.language}</span>
              ) : null}
              {repo.stats.files > 0 ? (
                <span>
                  {repo.stats.files} files · {repo.stats.linesOfCode.toLocaleString()} lines
                </span>
              ) : null}
              {analyzed ? <span>Analyzed {analyzed}</span> : null}
            </div>
          </Link>

          <div className="flex shrink-0 flex-col items-end justify-between gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Actions for ${repo.name}`}
                  className="size-8 text-white/55 hover:text-white"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="min-w-[14rem] rounded-[1.35rem] border-0 bg-[#F3EDE4] p-2 text-zinc-950 shadow-[0_24px_48px_-18px_rgba(0,0,0,0.55)]"
              >
                <DropdownMenuLabel className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {repo.name}
                </DropdownMenuLabel>
                <DropdownMenuItem asChild className={menuItem}>
                  <Link to="/repositories/$id" params={{ id: repo.id }}>
                    <LayoutDashboard className="size-4 text-zinc-500" />
                    Overview
                  </Link>
                </DropdownMenuItem>
                {repo.status === "failed" ? (
                  <DropdownMenuItem className={menuItem} disabled={retrying} onSelect={onRetry}>
                    <RotateCcw className="size-4 text-zinc-500" />
                    Retry analysis
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem asChild className={menuItem}>
                  <Link to="/repositories/$id/architecture" params={{ id: repo.id }}>
                    <Waypoints className="size-4 text-zinc-500" />
                    Architecture map
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className={menuItem}>
                  <Link to="/repositories/$id/health" params={{ id: repo.id }}>
                    <Activity className="size-4 text-zinc-500" />
                    Health scores
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-2 my-1.5 bg-zinc-950/10" />
                <DropdownMenuItem
                  className={`${menuItem} text-rose-700 focus:bg-rose-50 focus:text-rose-800`}
                  onSelect={onDelete}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/repositories/$id"
              params={{ id: repo.id }}
              aria-label={`Open ${repo.name}`}
              className="flex items-center gap-2.5 rounded-[1.2rem] bg-[#F3EDE4] py-2 pl-3.5 pr-2 text-zinc-950 transition group-hover:-translate-y-0.5"
            >
              <span className="text-right">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Health
                </span>
                <span className="font-display text-[1.55rem] font-semibold tabular-nums leading-none">
                  {health}
                </span>
              </span>
              <span className="flex size-9 items-center justify-center rounded-full bg-zinc-950 text-[#F3EDE4] transition group-hover:translate-x-0.5">
                <ArrowRight className="size-4" strokeWidth={2.4} />
              </span>
            </Link>
          </div>
        </div>
      </article>
    </li>
  );
}
