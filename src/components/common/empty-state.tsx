import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "surface-panel relative flex flex-col items-center justify-center gap-3 overflow-hidden px-6 py-16 text-center",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 50% 0%, oklch(0.78 0.16 305 / 16%), transparent 70%)",
        }}
        aria-hidden
      />
      {Icon ? (
        <span className="icon-well relative size-12">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="relative text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="relative max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="relative mt-2">{action}</div> : null}
    </div>
  );
}
