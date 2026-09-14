import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import type { Repository } from "@/types";

const washes = [
  "from-cyan-300/70 via-sky-400/30 to-transparent",
  "from-violet/80 via-fuchsia-400/25 to-transparent",
  "from-orange-300/70 via-pink-400/30 to-transparent",
];

export function RepoCard({
  repo,
  onRetry,
  retrying,
  extraActions,
}: {
  repo: Repository;
  onRetry?: (id: string) => void;
  retrying?: boolean;
  extraActions?: ReactNode;
}) {
  const wash = washes[[...repo.id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % washes.length];
  const showRetry = Boolean(onRetry && repo.status === "failed");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.85rem] bg-surface">
      <Link to="/repositories/$id" params={{ id: repo.id }} className="block">
        <div className={`relative h-28 bg-gradient-to-br ${wash} p-4`}>
          <StatusBadge status={repo.status} className="bg-zinc-950/70 text-white" />
          <p className="absolute bottom-4 left-4 right-16 font-display text-2xl font-semibold tabular-nums text-zinc-950">
            {repo.healthScore === 0 ? "—" : repo.healthScore}
          </p>
        </div>
        <div className="p-5">
          <p className="truncate font-display text-lg font-semibold">{repo.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {repo.owner}
            {repo.language ? ` · ${repo.language}` : ""}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-white/50">
            {repo.description || "Imported repository"}
          </p>
          {repo.stats.files > 0 ? (
            <p className="mt-3 font-mono text-[11px] text-white/35">
              {repo.stats.files} files · {repo.stats.linesOfCode.toLocaleString()} lines
            </p>
          ) : null}
        </div>
      </Link>
      {showRetry || extraActions ? (
        <div className="mt-auto flex items-center justify-end gap-1 px-4 pb-4">
          {showRetry ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={retrying}
              onClick={() => onRetry?.(repo.id)}
            >
              <RotateCcw className="size-3.5" />
              Retry
            </Button>
          ) : null}
          {extraActions}
        </div>
      ) : null}
    </article>
  );
}
