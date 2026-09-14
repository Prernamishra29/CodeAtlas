import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageTransition } from "@/components/common/page-transition";
import { ArchFileNode, ArchFolderNode } from "@/components/graph/architecture-nodes";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { GraphPanel } from "@/components/graph/graph-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildFileArchitecture,
  buildFolderArchitecture,
} from "@/features/architecture/build-architecture-graph";
import { repositoriesApi } from "@/lib/api/repositories";
import { useRepositoryStore } from "@/store/repository-store";

export const Route = createFileRoute("/_app/repositories/$id/architecture")({
  component: ArchitecturePage,
});

const nodeTypes = { archFolder: ArchFolderNode, archFile: ArchFileNode };

function ArchitecturePage() {
  const { id } = Route.useParams();
  const { selectedNodeId, selectNode } = useRepositoryStore();
  const [mode, setMode] = useState<"folders" | "files">("folders");

  const filesQuery = useQuery({ queryKey: ["files", id], queryFn: () => repositoriesApi.getFiles(id) });
  const depsQuery = useQuery({ queryKey: ["deps", id], queryFn: () => repositoriesApi.getDependencies(id) });

  const files = filesQuery.data ?? [];
  const deps = depsQuery.data ?? [];

  const folderGraph = useMemo(() => buildFolderArchitecture(files, deps), [files, deps]);
  const fileGraph = useMemo(() => buildFileArchitecture(files, deps), [files, deps]);
  const graph = mode === "folders" ? folderGraph : fileGraph;

  const selectedFolder = folderGraph.folders.find((folder) => folder.id === selectedNodeId);
  const selectedFile = files.find((file) => file.id === selectedNodeId);
  const inbound = graph.edges.filter((edge) => edge.target === selectedNodeId).length;
  const outbound = graph.edges.filter((edge) => edge.source === selectedNodeId).length;

  const loading = filesQuery.isLoading || depsQuery.isLoading;
  const biggest = folderGraph.folders[0];
  const folderCount = folderGraph.folders.length;
  const linkCount = folderGraph.edges.length;

  return (
    <PageTransition>
      <div className="mb-5 max-w-2xl">
        <p className="text-sm leading-relaxed text-white/65">
          Boxes are folders. Lilac arrows are imports between them. Click a box — the list on the right shows what is inside.
        </p>
        {!loading && folderCount > 0 ? (
          <p className="mt-2 text-sm text-white/45">
            {folderCount} folders · {linkCount} import {linkCount === 1 ? "link" : "links"}
            {biggest ? ` · most files in ${biggest.name}` : ""}
          </p>
        ) : null}
      </div>

      <GraphPanel
        height="clamp(480px, 64vh, 740px)"
        toolbar={
          <>
            <h2 className="text-sm font-semibold text-white">Map</h2>
            <div className="ml-auto flex rounded-full bg-white/8 p-1 ring-1 ring-white/10">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  mode === "folders" ? "bg-[#C9A6FF] text-zinc-950" : "text-white/70 hover:text-white"
                }`}
                onClick={() => {
                  setMode("folders");
                  selectNode(null);
                }}
              >
                Folders
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  mode === "files" ? "bg-[#C9A6FF] text-zinc-950" : "text-white/70 hover:text-white"
                }`}
                onClick={() => {
                  setMode("files");
                  selectNode(null);
                }}
              >
                Files
              </button>
            </div>
          </>
        }
        side={
          selectedFolder ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Inside this folder</p>
              <h3 className="mt-1 font-display text-lg font-semibold text-white">{selectedFolder.name}</h3>
              <p className="mt-1 text-sm text-white/50">
                {selectedFolder.files.length} files · {inbound} in · {outbound} out
              </p>
              <ul className="mt-4 space-y-0.5">
                {selectedFolder.files.slice(0, 18).map((file) => (
                  <li key={file.id}>
                    <Link
                      to="/repositories/$id/files"
                      params={{ id }}
                      search={{ path: file.path }}
                      className="block truncate rounded-xl px-2 py-1.5 font-mono text-xs text-white/60 hover:bg-white/10 hover:text-white"
                    >
                      {file.path}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : selectedFile ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{selectedFile.language}</p>
              <h3 className="mt-1 font-mono text-sm font-semibold text-white">{selectedFile.path.split("/").pop()}</h3>
              <p className="mt-1 text-xs text-white/45">{selectedFile.path}</p>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <dt className="text-white/45">Complexity</dt>
                  <dd className="font-mono text-white">{selectedFile.complexity}</dd>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <dt className="text-white/45">Imports in</dt>
                  <dd className="font-mono text-white">{inbound}</dd>
                </div>
                <div className="flex justify-between pb-1">
                  <dt className="text-white/45">Imports out</dt>
                  <dd className="font-mono text-white">{outbound}</dd>
                </div>
              </dl>
              <Button asChild size="sm" className="mt-4">
                <Link to="/repositories/$id/files" params={{ id }} search={{ path: selectedFile.path }}>
                  Open file
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-[1.2rem] bg-[#F3EDE4] p-4 text-zinc-950">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Start here</p>
              <p className="mt-2 text-sm leading-relaxed">
                Click a folder on the map. You will see its files here, then you can open one.
              </p>
            </div>
          )
        }
      >
        {loading ? (
          <div className="grid h-full place-items-center p-6">
            <Skeleton className="h-48 w-full max-w-xl" />
          </div>
        ) : graph.nodes.length === 0 ? (
          <div className="grid h-full place-items-center p-6 text-center">
            <p className="text-sm text-white/55">No source files to map yet. Run analysis, then come back here.</p>
          </div>
        ) : (
          <GraphCanvas nodes={graph.nodes} edges={graph.edges} onNodeSelect={selectNode} nodeTypes={nodeTypes} />
        )}
      </GraphPanel>
    </PageTransition>
  );
}
