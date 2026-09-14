import { ChevronRight, File, Folder } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface FileNode {
  name: string;
  path?: string;
  children?: FileNode[];
}

function TreeItem({ node, depth, onSelect }: { node: FileNode; depth: number; onSelect?: ((path: string) => void) | undefined }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = Boolean(node.children?.length);

  return (
    <li>
      <button
        type="button"
        aria-expanded={isFolder ? open : undefined}
        onClick={() => (isFolder ? setOpen((value) => !value) : onSelect?.(node.path ?? node.name))}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isFolder ? (
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} aria-hidden />
        ) : (
          <span className="w-3.5" aria-hidden />
        )}
        {isFolder ? (
          <Folder className="size-3.5 text-primary" aria-hidden />
        ) : (
          <File className="size-3.5" aria-hidden />
        )}
        <span className="truncate font-mono text-xs">{node.name}</span>
      </button>
      {isFolder && open ? (
        <ul>
          {node.children!.map((child) => (
            <TreeItem key={child.name} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FileTree({
  nodes,
  onSelect,
  className,
}: {
  nodes: FileNode[];
  onSelect?: ((path: string) => void) | undefined;
  className?: string;
}) {
  return (
    <nav aria-label="File tree" className={cn("rounded-[1.45rem] bg-white/[0.07] p-2 ring-1 ring-white/10", className)}>
      <ul>
        {nodes.map((node) => (
          <TreeItem key={node.name} node={node} depth={0} onSelect={onSelect} />
        ))}
      </ul>
    </nav>
  );
}
