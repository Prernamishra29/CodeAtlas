import { cn } from "@/lib/utils";

export function ScoreRing({
  score,
  size = 132,
  label = "Health score",
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (1 - Math.min(Math.max(score, 0), 100) / 100);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} role="img" aria-label={`${label}: ${score} of 100`}>
        <defs>
          <linearGradient id="scoreRingGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--violet)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreRingGradient)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 800ms ease",
            filter: "drop-shadow(0 0 10px oklch(0.78 0.16 305 / 70%))",
          }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-mono text-2xl font-semibold tabular-nums">{score}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</p>
      </div>
    </div>
  );
}
