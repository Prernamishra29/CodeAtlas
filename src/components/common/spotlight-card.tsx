import { useCallback, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const onMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      onMouseMove={onMove}
      className={cn("group surface-panel hover-lift relative overflow-hidden", className)}
      style={{ "--spot-x": "50%", "--spot-y": "0%" } as CSSProperties}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 hover:opacity-100"
        style={{
          background:
            "radial-gradient(340px circle at var(--spot-x) var(--spot-y), oklch(0.78 0.16 305 / 22%), transparent 62%)",
        }}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}
