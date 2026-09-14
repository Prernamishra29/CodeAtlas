import { useCallback, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Slight 3D product-shot tilt that tracks the pointer. */
export function TiltFrame({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const rest = "perspective(1400px) rotateX(8deg) rotateY(-12deg)";

  const onMove = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1400px) rotateX(${8 - y * 10}deg) rotateY(${-12 + x * 14}deg)`;
  }, []);

  const onLeave = useCallback(() => {
    if (ref.current) ref.current.style.transform = rest;
  }, []);

  return (
    <div className={cn("[perspective:1400px]", className)}>
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="origin-center transition-transform duration-200 ease-out will-change-transform"
        style={{ transform: rest }}
      >
        {children}
      </div>
    </div>
  );
}
