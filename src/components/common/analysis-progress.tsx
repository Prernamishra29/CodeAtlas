import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisRecord } from "@/lib/api/analysis";

function formatRemain(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `about ${s}s left`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 2 && r === 0) return "about 1 min left";
  if (m < 2) return `about 1 min ${r}s left`;
  return r === 0 ? `about ${m} min left` : `about ${m} min ${r}s left`;
}

function remainingSeconds(progress: number, startedAt: string | null, createdAt: string) {
  const origin = Date.parse(startedAt ?? createdAt);
  const elapsed = Math.max(1, (Date.now() - origin) / 1000);
  if (progress < 4) {
    const typical = 150;
    return Math.max(20, typical - elapsed);
  }
  const projected = elapsed / (progress / 100);
  return Math.max(10, projected - elapsed);
}

const stepCopy: Record<string, string> = {
  queued: "In the queue — waiting for the worker",
  cloning: "Downloading the repo from GitHub",
  scanning: "Reading files",
  analyzing: "Scoring and mapping the code",
};

export function AnalysisProgress({ analysis }: { analysis: AnalysisRecord }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(100, Math.max(0, analysis.progress));
  const eta = remainingSeconds(pct, analysis.started_at, analysis.created_at);
  const label =
    analysis.current_step ||
    stepCopy[analysis.status] ||
    analysis.status;

  return (
    <div className="mt-6 max-w-xl rounded-[1.35rem] bg-white/[0.07] p-4 ring-1 ring-white/10">
      <div className="flex items-start gap-3">
        <Loader2 className="mt-0.5 size-5 shrink-0 animate-spin text-[#C9A6FF]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">Analysis in progress</p>
          <p className="mt-1 text-sm text-white/65">{label}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[#C9A6FF] transition-[width] duration-500"
              style={{ width: `${Math.max(pct, 3)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
            <span>{pct}% complete</span>
            <span>
              {pct < 4
                ? "Usually 2–4 min once the worker starts"
                : formatRemain(eta)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
