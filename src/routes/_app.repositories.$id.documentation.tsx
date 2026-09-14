import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/common/code-block";
import { PageTransition } from "@/components/common/page-transition";
import { Skeleton } from "@/components/ui/skeleton";
import { repositoriesApi } from "@/lib/api/repositories";

export const Route = createFileRoute("/_app/repositories/$id/documentation")({
  component: DocumentationPage,
});

type DocSection = { id: string; entityType: string; entityId: string | null; content: string };

const typeOrder = ["repository", "architecture", "folder", "module", "file"];

const typeMeta: Record<string, { group: string; badge: string }> = {
  repository: { group: "This repository", badge: "Overview" },
  architecture: { group: "Architecture", badge: "Map" },
  folder: { group: "Folders", badge: "Folder" },
  module: { group: "Modules", badge: "Module" },
  file: { group: "Files", badge: "File" },
};

function heading(section: DocSection) {
  if (section.entityType === "repository") return "What this repo is";
  if (section.entityType === "architecture") return "How the pieces connect";
  if (section.entityId) {
    const name = section.entityId.split("/").filter(Boolean).pop() ?? section.entityId;
    return name;
  }
  return typeMeta[section.entityType]?.badge ?? section.entityType;
}

function DocMarkdown({ content }: { content: string }) {
  return (
    <div className="doc-prose text-sm leading-relaxed text-white/75">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-2 mt-5 font-display text-base font-semibold text-white first:mt-0">{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 className="mb-2 mt-5 font-display text-base font-semibold text-white first:mt-0">{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className="mb-1.5 mt-4 text-sm font-semibold text-white first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="text-white/75">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          a: ({ href, children }) => (
            <a href={href} className="text-[#C9A6FF] underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const text = String(children).replace(/\n$/, "");
            const inline = !className && !text.includes("\n");
            if (inline) {
              return (
                <code className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-[#E2C9FF]">{text}</code>
              );
            }
            return <CodeBlock code={text} language={className?.replace("language-", "") ?? "ts"} className="my-3" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function DocumentationPage() {
  const { id } = Route.useParams();
  const docs = useQuery({ queryKey: ["documentation", id], queryFn: () => repositoriesApi.documentation(id) });
  const sections = docs.data ?? [];

  const groups = useMemo(() => {
    const map = new Map<string, DocSection[]>();
    for (const section of sections) {
      const key = typeOrder.includes(section.entityType) ? section.entityType : "file";
      const list = map.get(key) ?? [];
      list.push(section);
      map.set(key, list);
    }
    return typeOrder.filter((key) => map.has(key)).map((key) => ({ key, items: map.get(key)! }));
  }, [sections]);

  if (docs.isLoading) {
    return <Skeleton className="h-[28rem] rounded-[1.45rem]" />;
  }

  return (
    <PageTransition>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,15.5rem)_minmax(0,1fr)]">
        <nav
          aria-label="Documentation sections"
          className="h-fit rounded-[1.45rem] bg-white/[0.07] p-4 ring-1 ring-white/10 lg:sticky lg:top-20"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">Contents</p>
          {sections.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">Nothing generated yet.</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {groups.map((group) => (
                <li key={group.key}>
                  <p className="mb-1.5 text-[11px] text-white/40">{typeMeta[group.key]?.group}</p>
                  <ul className="space-y-0.5">
                    {group.items.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className="block truncate rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/8 hover:text-white"
                        >
                          {heading(section)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="min-w-0 space-y-8">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Generated documentation</h2>
            <p className="mt-1 text-sm text-white/55">
              Written from this codebase after analysis. Jump with the list on the left.
            </p>
          </div>

          {sections.length === 0 ? (
            <div className="rounded-[1.45rem] bg-white/[0.07] p-6 text-sm text-white/55 ring-1 ring-white/10">
              After analysis finishes, summaries for the repo, architecture, folders, modules, and files show up here.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="space-y-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  {typeMeta[group.key]?.group}
                </h3>
                {group.items.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="scroll-mt-24 rounded-[1.45rem] bg-white/[0.07] p-5 ring-1 ring-white/10 sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                        {typeMeta[section.entityType]?.badge ?? section.entityType}
                      </span>
                      {section.entityId ? (
                        <span className="truncate font-mono text-[11px] text-white/40">{section.entityId}</span>
                      ) : null}
                    </div>
                    <h4 className="font-display text-lg font-semibold text-white">{heading(section)}</h4>
                    <div className="mt-4">
                      <DocMarkdown content={section.content} />
                    </div>
                  </article>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </PageTransition>
  );
}
