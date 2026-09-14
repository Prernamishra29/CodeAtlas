import { cn } from "@/lib/utils";

export function DemoBadge({ className, label = "Demo data" }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-warning" aria-hidden />
      {label}
    </span>
  );
}
