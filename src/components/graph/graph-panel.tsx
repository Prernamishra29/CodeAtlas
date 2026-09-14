import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Framed container for a graph plus optional side panel. */
export function GraphPanel({
  children,
  side,
  toolbar,
  height = "clamp(420px, 60vh, 680px)",
  className,
}: {
  children: ReactNode;
  side?: ReactNode;
  toolbar?: ReactNode;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.45rem] bg-white/[0.07] ring-1 ring-white/10",
        className,
      )}
    >
      {toolbar ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
          {toolbar}
        </div>
      ) : null}
      <div className="grid lg:grid-cols-[1fr_300px]">
        <div style={{ height }} className="relative border-white/10 lg:border-r">
          {children}
        </div>
        {side ? <div className="max-h-full overflow-y-auto p-4 text-white/80">{side}</div> : null}
      </div>
    </div>
  );
}
