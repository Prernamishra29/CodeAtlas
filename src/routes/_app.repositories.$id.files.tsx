import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CodeBlock } from "@/components/common/code-block";
import { FileTree, type FileNode } from "@/components/common/file-tree";
import { PageTransition } from "@/components/common/page-transition";
import { repositoriesApi, type CodeFileRow } from "@/lib/api/repositories";

export const Route = createFileRoute("/_app/repositories/$id/files")({
  validateSearch: (search: Record<string, unknown>) => ({
    path: typeof search.path === "string" ? search.path : undefined,
  }),
  component: FilesPage,
});

function buildTree(files: CodeFileRow[]): FileNode[] {
  const root: FileNode[] = [];
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let level = root;
    parts.forEach((part, index) => {
      const isLeaf = index === parts.length - 1;
      let next = level.find((node) => node.name === part);
      if (!next) {
        next = isLeaf ? { name: part, path: file.path } : { name: part, children: [] };
        level.push(next);
      }
      if (!isLeaf) {
        next.children ??= [];
        level = next.children;
      }
    });
  }
  return root;
}

function FilesPage() {
  const { id } = Route.useParams();
  const { path: requestedPath } = Route.useSearch();
  const filesQuery = useQuery({
    queryKey: ["files", id],
    queryFn: () => repositoriesApi.getFiles(id),
  });
  const files = filesQuery.data ?? [];
  const tree = useMemo(() => buildTree(files), [files]);
  const [selectedPath, setSelectedPath] = useState<string | null>(requestedPath ?? null);
  useEffect(() => {
    if (requestedPath) setSelectedPath(requestedPath);
  }, [requestedPath]);
  const selected = files.find(
    (file) => file.path === (selectedPath ?? requestedPath ?? files[0]?.path),
  );

  return (
    <PageTransition>
      {files.length === 0 ? (
        <p className="rounded-[1.45rem] bg-white/[0.07] p-6 text-sm text-white/60 ring-1 ring-white/10">
          No files yet. Run analysis on this repository to populate the file tree.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <FileTree nodes={tree} onSelect={setSelectedPath} />
          <CodeBlock
            filename={selected?.path ?? "file"}
            code={selected?.content || "// File content was not stored for this path."}
          />
        </div>
      )}
    </PageTransition>
  );
}
