import { Badge } from "@/components/ui/badge";
import type { RepoStatus } from "@/types";
import { cn } from "@/lib/utils";

const statusMap: Record<RepoStatus, { label: string; dot: string; text: string; glow: string }> = {
  not_analyzed: {
    label: "Not analyzed",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    glow: "shadow-none",
  },
  queued: {
    label: "Queued",
    dot: "bg-info shadow-[0_0_10px_var(--info)]",
    text: "text-info",
    glow: "border-info/30 bg-info/10",
  },
  analyzing: {
    label: "Analyzing",
    dot: "bg-primary animate-pulse shadow-[0_0_10px_var(--primary)]",
    text: "text-primary",
    glow: "border-primary/35 bg-primary/10",
  },
  completed: {
    label: "Completed",
    dot: "bg-success shadow-[0_0_10px_var(--success)]",
    text: "text-success",
    glow: "border-success/30 bg-success/10",
  },
  failed: {
    label: "Failed",
    dot: "bg-destructive shadow-[0_0_10px_var(--destructive)]",
    text: "text-destructive",
    glow: "border-destructive/30 bg-destructive/10",
  },
};

export function StatusBadge({ status, className }: { status: RepoStatus; className?: string }) {
  const config = statusMap[status];
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 rounded-full font-normal", config.text, config.glow, className)}
    >
      <span className={cn("size-1.5 rounded-full", config.dot)} aria-hidden />
      {config.label}
    </Badge>
  );
}

export function HealthPill({ score }: { score: number }) {
  const tone =
    score === 0
      ? "text-muted-foreground"
      : score >= 80
        ? "text-success"
        : score >= 65
          ? "text-warning"
          : "text-destructive";
  return (
    <span className={cn("font-mono text-sm tabular-nums", tone)}>
      {score === 0 ? "—" : `${score}`}
    </span>
  );
}
