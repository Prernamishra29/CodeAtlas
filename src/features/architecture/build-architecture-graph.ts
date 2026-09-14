import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { CodeFileRow, DependencyRow } from "@/lib/api/repositories";
import type { GraphNode } from "@/components/graph/graph-canvas";

const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|java|vue|svelte)$/i;
const SKIP = /(^|\/)(node_modules|dist|build|coverage|\.git)\//i;

export function isArchitectureFile(path: string) {
  return SOURCE.test(path) && !SKIP.test(path);
}

export function folderOf(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) return "(root)";
  const generic = new Set(["src", "app", "lib", "source"]);
  if (generic.has(parts[0].toLowerCase()) && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0];
}

function layer(folder: string) {
  const n = folder.toLowerCase();
  if (/(page|route|view|ui|component|frontend|client|web)/.test(n)) return 0;
  if (/(hook|store|context|feature|state)/.test(n)) return 1;
  if (/(api|service|controller|auth|server|backend)/.test(n)) return 2;
  if (/(model|prisma|db|schema|entity)/.test(n)) return 3;
  if (/(util|helper|config|constant|type)/.test(n)) return 4;
  return 2;
}

export interface ArchitectureGraph {
  nodes: GraphNode[];
  edges: Edge[];
  folders: Array<{
    id: string;
    name: string;
    files: CodeFileRow[];
    languages: string[];
  }>;
}

export function buildFolderArchitecture(
  files: CodeFileRow[],
  deps: DependencyRow[],
): ArchitectureGraph {
  const sourceFiles = files.filter((file) => isArchitectureFile(file.path));
  const grouped = new Map<string, CodeFileRow[]>();
  for (const file of sourceFiles) {
    const folder = folderOf(file.path);
    const list = grouped.get(folder) ?? [];
    list.push(file);
    grouped.set(folder, list);
  }

  let folders = [...grouped.entries()]
    .map(([name, list]) => ({
      id: `folder:${name}`,
      name,
      files: list,
      languages: [...new Set(list.map((file) => file.language))],
    }))
    .sort((a, b) => b.files.length - a.files.length);

  if (folders.length > 16) {
    const keep = folders.slice(0, 15);
    const rest = folders.slice(15);
    keep.push({
      id: "folder:other",
      name: "other",
      files: rest.flatMap((item) => item.files),
      languages: [...new Set(rest.flatMap((item) => item.languages))],
    });
    folders = keep;
  }

  const folderByFile = new Map<string, string>();
  for (const folder of folders) {
    for (const file of folder.files) folderByFile.set(file.id, folder.id);
  }

  const columns = new Map<number, typeof folders>();
  for (const folder of folders) {
    const rank = layer(folder.name);
    const col = columns.get(rank) ?? [];
    col.push(folder);
    columns.set(rank, col);
  }

  const nodes: GraphNode[] = [];
  const ranks = [...columns.keys()].sort((a, b) => a - b);
  ranks.forEach((rank, colIndex) => {
    const col = columns.get(rank) ?? [];
    col.forEach((folder, row) => {
      nodes.push({
        id: folder.id,
        type: "archFolder",
        position: { x: 48 + colIndex * 280, y: 36 + row * 150 },
        data: {
          label: folder.name,
          kind: "folder",
          detail: `${folder.files.length} source files · ${folder.languages.slice(0, 3).join(", ")}`,
          fileCount: folder.files.length,
          languages: folder.languages,
        },
      });
    });
  });

  const pairCounts = new Map<string, { source: string; target: string; count: number }>();
  for (const dep of deps) {
    if (!dep.targetId) continue;
    const source = folderByFile.get(dep.sourceId);
    const target = folderByFile.get(dep.targetId);
    if (!source || !target || source === target) continue;
    const key = `${source}=>${target}`;
    const current = pairCounts.get(key);
    if (current) current.count += 1;
    else pairCounts.set(key, { source, target, count: 1 });
  }

  const edges: Edge[] = [...pairCounts.values()].map((item) => ({
    id: `${item.source}->${item.target}`,
    source: item.source,
    target: item.target,
    label: item.count > 1 ? `${item.count} imports` : "imports",
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#C9A6FF" },
    style: { stroke: "#C9A6FF", strokeWidth: item.count > 3 ? 2.4 : 1.5 },
  }));

  return { nodes, edges, folders };
}

export function buildFileArchitecture(
  files: CodeFileRow[],
  deps: DependencyRow[],
): { nodes: GraphNode[]; edges: Edge[] } {
  const connected = new Set<string>();
  for (const dep of deps) {
    if (!dep.targetId) continue;
    connected.add(dep.sourceId);
    connected.add(dep.targetId);
  }
  const picked = files
    .filter(
      (file) => isArchitectureFile(file.path) && (connected.has(file.id) || file.complexity > 4),
    )
    .slice(0, 36);

  const byFolder = new Map<string, CodeFileRow[]>();
  for (const file of picked) {
    const folder = folderOf(file.path);
    const list = byFolder.get(folder) ?? [];
    list.push(file);
    byFolder.set(folder, list);
  }

  const nodes: GraphNode[] = [];
  [...byFolder.entries()].forEach(([folder, list], col) => {
    list.forEach((file, row) => {
      nodes.push({
        id: file.id,
        type: "archFile",
        position: { x: 40 + col * 240, y: 32 + row * 88 },
        data: {
          label: file.path.split("/").pop() ?? file.path,
          kind: file.language,
          detail: file.path,
          complexity: file.complexity,
        },
      });
    });
  });

  const visible = new Set(picked.map((file) => file.id));
  const edges: Edge[] = deps
    .filter((dep) => dep.targetId && visible.has(dep.sourceId) && visible.has(dep.targetId))
    .slice(0, 80)
    .map((dep) => ({
      id: dep.id,
      source: dep.sourceId,
      target: dep.targetId!,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#C9A6FF" },
      style: { stroke: "#C9A6FF", strokeWidth: 1.4 },
    }));

  return { nodes, edges };
}
