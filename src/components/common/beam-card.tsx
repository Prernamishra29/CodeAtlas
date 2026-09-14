import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rotating conic edge — used on hero frames and primary CTAs. */
export function BeamCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl p-[1px]", className)}>
      <div
        className="animate-spin-slow pointer-events-none absolute -inset-[40%] opacity-90"
        style={{
          background:
            "conic-gradient(from 180deg, transparent 0 55%, oklch(0.93 0.21 125), oklch(0.78 0.16 305), oklch(0.78 0.12 200), transparent 78%)",
        }}
        aria-hidden
      />
      <div className="relative z-[1] overflow-hidden rounded-[calc(var(--radius-xl)-1px)] bg-surface">
        {children}
      </div>
    </div>
  );
}
