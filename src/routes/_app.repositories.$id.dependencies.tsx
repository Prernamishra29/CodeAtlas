import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageTransition } from "@/components/common/page-transition";
import { ArchFileNode } from "@/components/graph/architecture-nodes";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { GraphPanel } from "@/components/graph/graph-panel";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDependencyGraph, packageName } from "@/features/architecture/build-dependency-graph";
import { repositoriesApi } from "@/lib/api/repositories";

export const Route = createFileRoute("/_app/repositories/$id/dependencies")({
  component: DependenciesPage,
});

const nodeTypes = { archFile: ArchFileNode };

function DependenciesPage() {
  const { id } = Route.useParams();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filesQuery = useQuery({ queryKey: ["files", id], queryFn: () => repositoriesApi.getFiles(id) });
  const depsQuery = useQuery({ queryKey: ["deps", id], queryFn: () => repositoriesApi.getDependencies(id) });

  const files = filesQuery.data ?? [];
  const deps = depsQuery.data ?? [];
  const graph = useMemo(() => buildDependencyGraph(files, deps, query), [files, deps, query]);

  const selectedFile = files.find((file) => file.id === selectedId);
  const selectedPackage = selectedId?.startsWith("pkg:") ? selectedId.slice(4) : null;

  const imports = selectedFile
    ? deps.filter((dep) => dep.sourceId === selectedFile.id)
    : [];
  const importedBy = selectedFile
    ? deps.filter((dep) => dep.targetId === selectedFile.id)
    : deps.filter((dep) => selectedPackage && packageName(dep.targetPath) === selectedPackage);

  const loading = filesQuery.isLoading || depsQuery.isLoading;

  return (
    <PageTransition>
      <div className="mb-4 space-y-3">
        <p className="text-sm leading-relaxed text-white/60">
          Blue arrows are internal file-to-file imports. Gray boxes are npm packages. Click a file to see what it uses
          and who uses it.
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-white/70">
          <span className="rounded-full bg-white/10 px-3 py-1">{graph.internalCount} internal imports</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{graph.externalCount} package imports</span>
          <span className="rounded-full bg-white/10 px-3 py-1">{graph.packages.length} packages</span>
        </div>
      </div>

      <GraphPanel
        height="clamp(460px, 58vh, 680px)"
        toolbar={
          <>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by file or package"
              aria-label="Filter dependencies"
              className="w-56"
            />
            <ul className="ml-2 flex items-center gap-3 text-xs text-white/55">
              <li className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" aria-hidden /> Internal file
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground" aria-hidden /> npm package
              </li>
            </ul>
          </>
        }
        side={
          selectedFile ? (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{selectedFile.language}</p>
                <h3 className="mt-1 font-mono text-sm font-semibold">
                  {selectedFile.path.split("/").pop()}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{selectedFile.path}</p>
              </div>
              <section>
                <h4 className="text-xs font-medium text-foreground">This file imports</h4>
                <ul className="mt-1.5 space-y-1">
                  {imports.length === 0 ? (
                    <li className="text-xs text-muted-foreground">None recorded.</li>
                  ) : (
                    imports.slice(0, 14).map((dep) => {
                      const target = files.find((file) => file.id === dep.targetId);
                      const label = target?.path ?? packageName(dep.targetPath) ?? dep.targetPath;
                      return (
                        <li key={dep.id} className="truncate font-mono text-[11px] text-muted-foreground">
                          {label}
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
              <section>
                <h4 className="text-xs font-medium text-foreground">Imported by</h4>
                <ul className="mt-1.5 space-y-1">
                  {importedBy.length === 0 ? (
                    <li className="text-xs text-muted-foreground">Nothing imports this file.</li>
                  ) : (
                    importedBy.slice(0, 14).map((dep) => {
                      const source = files.find((file) => file.id === dep.sourceId);
                      return (
                        <li key={dep.id} className="truncate font-mono text-[11px] text-muted-foreground">
                          {source?.path ?? dep.sourceId}
                        </li>
                      );
                    })
                  )}
                </ul>
              </section>
              <Link
                to="/repositories/$id/files"
                params={{ id }}
                search={{ path: selectedFile.path }}
                className="inline-flex text-xs text-primary hover:underline"
              >
                Open file
              </Link>
            </div>
          ) : selectedPackage ? (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">npm package</p>
              <h3 className="font-mono text-sm font-semibold">{selectedPackage}</h3>
              <p className="text-xs text-muted-foreground">Imported by {importedBy.length} files.</p>
              <ul className="space-y-1">
                {importedBy.slice(0, 16).map((dep) => {
                  const source = files.find((file) => file.id === dep.sourceId);
                  return (
                    <li key={dep.id} className="truncate font-mono text-[11px] text-muted-foreground">
                      {source?.path ?? dep.sourceId}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Most used packages</p>
              <ul className="space-y-1.5">
                {graph.packages.slice(0, 10).map((pkg) => (
                  <li key={pkg.name} className="flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      className="truncate font-mono text-left hover:text-foreground"
                      onClick={() => setSelectedId(`pkg:${pkg.name}`)}
                    >
                      {pkg.name}
                    </button>
                    <span className="font-mono text-muted-foreground">{pkg.usedBy}</span>
                  </li>
                ))}
                {graph.packages.length === 0 ? (
                  <li className="text-xs text-muted-foreground">No package imports found yet.</li>
                ) : null}
              </ul>
            </div>
          )
        }
      >
        {loading ? (
          <div className="grid h-full place-items-center p-6">
            <Skeleton className="h-40 w-full max-w-xl" />
          </div>
        ) : graph.nodes.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No import graph yet. Run analysis, or clear the search filter.
            </p>
          </div>
        ) : (
          <GraphCanvas nodes={graph.nodes} edges={graph.edges} onNodeSelect={setSelectedId} nodeTypes={nodeTypes} />
        )}
      </GraphPanel>
    </PageTransition>
  );
}
