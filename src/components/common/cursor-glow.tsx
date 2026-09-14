import { useEffect } from "react";

/** Soft light that follows the pointer across the whole site. */
export function CursorGlow() {
  useEffect(() => {
    const node = document.getElementById("cursor-glow");
    if (!node) return;
    const onMove = (event: MouseEvent) => {
      node.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      id="cursor-glow"
      className="pointer-events-none fixed left-0 top-0 z-[1] size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen opacity-90 blur-3xl"
      style={{
        background:
            "radial-gradient(circle, oklch(0.78 0.16 305 / 28%) 0%, oklch(0.93 0.21 125 / 8%) 38%, transparent 68%)",
      }}
      aria-hidden
    />
  );
}
