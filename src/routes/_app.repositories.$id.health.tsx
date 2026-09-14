import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { PageTransition } from "@/components/common/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { analysisApi } from "@/lib/api/analysis";

export const Route = createFileRoute("/_app/repositories/$id/health")({
  component: HealthPage,
});

const labels: Record<string, string> = {
  architecture: "Structure",
  maintainability: "Changeability",
  complexity: "Simplicity",
  dependencies: "Packages",
  documentation: "Docs",
};

function barColor(score: number) {
  if (score >= 80) return "#5eead4";
  if (score >= 65) return "#C9A6FF";
  return "#fb7185";
}

function HealthPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["health", id],
    queryFn: () => analysisApi.health(id),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-72 max-w-4xl rounded-[1.45rem]" />;
  }

  const entries = Object.entries(data.breakdown);
  const radar = entries.map(([key, value]) => ({
    axis: labels[key] ?? key,
    score: value,
  }));
  const hot = (data.complexity ?? []).slice(0, 6);

  return (
    <PageTransition>
      <p className="mb-6 max-w-xl text-sm text-white/50">
        Five scores out of 100. The ring at the top of the page is the overall. The shape shows
        where this repo is strong or thin.
      </p>

      <div className="grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="rounded-[1.6rem] bg-[#F3EDE4] p-4 text-zinc-950">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Shape
          </p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} cx="50%" cy="52%" outerRadius="72%">
                <PolarGrid stroke="rgba(24,24,27,0.14)" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: "#3f3f46", fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Health"
                  dataKey="score"
                  stroke="#18181b"
                  fill="#C9A6FF"
                  fillOpacity={0.45}
                  strokeWidth={1.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <ul className="rounded-[1.6rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
          {entries.map(([key, value]) => (
            <li key={key} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-white/80">{labels[key] ?? key}</span>
                <span className="font-display text-lg tabular-nums text-white">{value}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${value}%`, background: barColor(value) }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {hot.length > 0 ? (
        <div className="mt-4 max-w-4xl rounded-[1.6rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
          <h2 className="text-sm font-semibold text-white">Heavier files</h2>
          <p className="mt-1 text-sm text-white/50">
            Highest cyclomatic complexity in this analysis.
          </p>
          <ul className="mt-4 space-y-3">
            {hot.map((item) => (
              <li key={item.module}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-mono text-white/80">{item.module}</span>
                  <span className="tabular-nums text-white/50">{item.complexity}</span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#C9A6FF]"
                    style={{ width: `${Math.min(100, item.complexity * 4)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageTransition>
  );
}
