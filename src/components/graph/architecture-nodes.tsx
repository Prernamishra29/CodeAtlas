import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/components/graph/graph-canvas";

export function ArchFolderNode({ data, selected }: NodeProps<GraphNode>) {
  const count = typeof data.fileCount === "number" ? data.fileCount : 0;
  const langs = Array.isArray(data.languages) ? data.languages.slice(0, 2).join(" · ") : "";

  return (
    <div
      className={cn(
        "group w-[232px] cursor-pointer rounded-[1.15rem] bg-[#2f2f38] px-3.5 py-3 ring-1 ring-white/12",
        selected && "ring-2 ring-[#C9A6FF]",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2.5 !border-0 !bg-[#C9A6FF]" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">Folder</p>
          <p className="mt-0.5 truncate font-display text-[15px] font-semibold text-white">{data.label}</p>
        </div>
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#C9A6FF] text-zinc-950",
            selected ? "opacity-100" : "opacity-80 group-hover:opacity-100",
          )}
        >
          <ArrowRight className="size-3.5" strokeWidth={2.4} />
        </span>
      </div>
      <p className="mt-2 text-xs text-white/50">
        {count} {count === 1 ? "file" : "files"}
        {langs ? ` · ${langs}` : ""}
      </p>
      <Handle type="source" position={Position.Right} className="!size-2.5 !border-0 !bg-[#C9A6FF]" />
    </div>
  );
}

export function ArchFileNode({ data, selected }: NodeProps<GraphNode>) {
  const external = data.kind === "external";
  return (
    <div
      className={cn(
        "w-[200px] cursor-pointer rounded-[0.95rem] px-3 py-2.5 ring-1",
        selected ? "bg-[#32323c] ring-[#C9A6FF]" : "bg-[#2a2a32] ring-white/12",
        external && "opacity-80",
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-[#C9A6FF]" />
      <p className="truncate font-mono text-xs font-medium text-white">{data.label}</p>
      <p className="mt-0.5 truncate text-[11px] text-white/45">{external ? "npm package" : data.kind}</p>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-[#C9A6FF]" />
    </div>
  );
}
