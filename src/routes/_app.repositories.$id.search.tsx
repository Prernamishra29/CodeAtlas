import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileCode2, Search as SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PageTransition } from "@/components/common/page-transition";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { searchApi, type SearchKind } from "@/lib/api/search";

export const Route = createFileRoute("/_app/repositories/$id/search")({
  component: SearchPage,
});

const kinds: Array<{ value: SearchKind; label: string }> = [
  { value: "file", label: "Files" },
  { value: "function", label: "Functions" },
  { value: "class", label: "Classes" },
  { value: "documentation", label: "Docs" },
];

function SearchPage() {
  const { id } = Route.useParams();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState<SearchKind[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  const ready = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["search", id, debounced, active],
    queryFn: () => searchApi.query({ repositoryId: id, query: debounced, kinds: active }),
    enabled: ready,
  });

  const toggle = (kind: SearchKind) =>
    setActive((current) =>
      current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind],
    );

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl">
        <p className="text-sm leading-relaxed text-white/55">
          Search files, functions, classes, and docs in this repo. Type at least two letters.
        </p>

        <div className="mt-5 rounded-[1.6rem] bg-white/[0.07] p-4 ring-1 ring-white/10 sm:p-5">
          <div className="relative">
            <SearchIcon
              className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="auth, HealthRing, prisma…"
              aria-label="Search this repository"
              className="h-12 border-white/10 bg-white/5 pl-11 text-base text-white"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {kinds.map((kind) => {
              const on = active.includes(kind.value);
              return (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() => toggle(kind.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                    on
                      ? "bg-[#C9A6FF] text-zinc-950 ring-[#C9A6FF]"
                      : "bg-transparent text-white/65 ring-white/15 hover:text-white"
                  }`}
                >
                  {kind.label}
                </button>
              );
            })}
          </div>
        </div>

        {!ready ? (
          <p className="mt-8 text-sm text-white/45">Results show up here.</p>
        ) : isFetching ? (
          <div className="mt-5 space-y-2">
            <Skeleton className="h-24 rounded-[1.35rem]" />
            <Skeleton className="h-24 rounded-[1.35rem]" />
            <Skeleton className="h-24 rounded-[1.35rem]" />
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="mt-5 rounded-[1.45rem] bg-white/[0.07] px-5 py-8 ring-1 ring-white/10">
            <p className="font-medium text-white">Nothing for “{debounced}”</p>
            <p className="mt-1 text-sm text-white/50">Try another word, or turn a filter off.</p>
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {data!.map((result) => (
              <li key={result.id}>
                <Link
                  to="/repositories/$id/files"
                  params={{ id }}
                  search={{ path: result.file }}
                  className="group flex items-start gap-3 rounded-[1.35rem] bg-white/[0.07] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.1] hover:ring-white/16"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#F3EDE4] text-zinc-950">
                    <FileCode2 className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-mono text-sm text-white">{result.symbol}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                        {result.kind}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-[#C9A6FF]">
                        {Math.round(result.relevance * 100)}%
                      </span>
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs text-white/40">
                      {result.file}
                      {result.line ? `:${result.line}` : ""}
                    </span>
                    {result.description ? (
                      <span className="mt-2 block text-sm leading-relaxed text-white/60">
                        {result.description}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight className="mt-2 size-4 shrink-0 text-[#C9A6FF] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
