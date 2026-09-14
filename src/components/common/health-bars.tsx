import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { Repository } from "@/types";

function barColor(score: number) {
  if (score === 0) return "bg-muted-foreground/40";
  if (score >= 80) return "bg-success";
  if (score >= 65) return "bg-warning";
  return "bg-destructive";
}

/** Named health bars — one glance, no decoration. */
export function HealthBars({ repos }: { repos: Repository[] }) {
  if (repos.length === 0) {
    return <p className="text-sm text-muted-foreground">Import a repository to score it here.</p>;
  }

  return (
    <ul className="space-y-3">
      {repos.map((repo) => (
        <li key={repo.id}>
          <Link to="/repositories/$id" params={{ id: repo.id }} className="block group">
            <div className="mb-1 flex items-center justify-between gap-3">
              <span className="truncate text-sm group-hover:text-violet">{repo.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {repo.healthScore === 0 ? "—" : repo.healthScore}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all duration-700", barColor(repo.healthScore))}
                style={{ width: `${Math.max(repo.healthScore, repo.healthScore === 0 ? 0 : 4)}%` }}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
