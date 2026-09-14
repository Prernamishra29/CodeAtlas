import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/common/page-transition";
import { analysisApi } from "@/lib/api/analysis";
import { Route as RepositoryRoute } from "./_app.repositories.$id";

export const Route = createFileRoute("/_app/repositories/$id/")({
  component: RepositoryOverview,
});

const langPaint = ["#C9A6FF", "#5eead4", "#fdba74", "#f9a8d4", "#67e8f9"];

function RepositoryOverview() {
  const { repository } = RepositoryRoute.useLoaderData();
  const { id } = Route.useParams();
  const insights = useQuery({
    queryKey: ["insights", id],
    queryFn: () => analysisApi.insights(id),
  });
  const languages = useQuery({
    queryKey: ["languages", id],
    queryFn: () => analysisApi.languages(id),
  });
  const langs = (languages.data ?? []).slice(0, 5);
  const notes = (insights.data ?? []).slice(0, 4);
  const langTotal = langs.reduce((sum, lang) => sum + lang.value, 0) || 1;

  const stats = [
    { label: "Files", value: repository.stats.files.toLocaleString() },
    { label: "Lines", value: repository.stats.linesOfCode.toLocaleString() },
    { label: "Dependencies", value: repository.stats.dependencies },
    { label: "Functions", value: repository.stats.functions.toLocaleString() },
  ];

  return (
    <PageTransition>
      <div className="max-w-5xl space-y-6">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="rounded-2xl bg-white/[0.07] px-4 py-4 ring-1 ring-white/10"
            >
              <p className="text-xs text-white/55">{stat.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-white">
                {stat.value}
              </p>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[1.45rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
            <h2 className="text-sm font-semibold text-white">Languages</h2>
            <p className="mt-1 text-sm text-white/55">How this repo is split by language.</p>
            {langs.length === 0 ? (
              <p className="mt-5 text-sm text-white/50">Nothing to show until analysis finishes.</p>
            ) : (
              <>
                <div className="mt-5 flex h-3 overflow-hidden rounded-full">
                  {langs.map((lang, index) => (
                    <span
                      key={lang.name}
                      title={`${lang.name} ${Math.round(lang.value)}%`}
                      style={{
                        width: `${(lang.value / langTotal) * 100}%`,
                        background: langPaint[index % langPaint.length],
                      }}
                    />
                  ))}
                </div>
                <ul className="mt-4 space-y-2.5">
                  {langs.map((lang, index) => (
                    <li
                      key={lang.name}
                      className="flex items-center justify-between gap-3 text-sm text-white/85"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ background: langPaint[index % langPaint.length] }}
                        />
                        {lang.name}
                      </span>
                      <span className="tabular-nums text-white/55">{Math.round(lang.value)}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="rounded-[1.45rem] bg-white/[0.07] p-5 ring-1 ring-white/10">
            <h2 className="text-sm font-semibold text-white">Insights</h2>
            <p className="mt-1 text-sm text-white/55">What the last analysis noticed.</p>
            {notes.length === 0 ? (
              <p className="mt-5 text-sm text-white/50">Insights show up after analysis.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {notes.map((insight) => (
                  <li key={insight.id} className="rounded-xl bg-black/20 px-3 py-3">
                    <p className="text-sm font-medium text-white">{insight.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">{insight.detail}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
