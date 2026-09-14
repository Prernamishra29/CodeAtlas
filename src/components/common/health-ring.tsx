import { cn } from "@/lib/utils";

export function HealthRing({
  score,
  size = 72,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const stroke = size >= 120 ? 11 : 7;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circ - (clamped / 100) * circ;
  const tone =
    score === 0 ? "var(--muted-foreground)" : score >= 80 ? "var(--success)" : score >= 65 ? "var(--warning)" : "var(--destructive)";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(1 0.04 250 / 10%)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${tone})`, transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className={cn("absolute font-display font-semibold tabular-nums", size >= 120 ? "text-3xl" : size >= 64 ? "text-sm" : "text-[11px]")} style={{ color: tone }}>
        {score === 0 ? "—" : score}
      </span>
    </div>
  );
}
