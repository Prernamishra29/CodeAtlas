import type { Edge } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type { GraphNode } from "@/components/graph/graph-canvas";
import type { CodeFileRow, DependencyRow } from "@/lib/api/repositories";
import { folderOf, isArchitectureFile } from "@/features/architecture/build-architecture-graph";

export function packageName(targetPath: string) {
  const trimmed = targetPath.trim().replace(/^["']|["']$/g, "");
  if (!trimmed || trimmed.startsWith(".") || trimmed.startsWith("/") || trimmed.startsWith("node:")) {
    return null;
  }
  if (trimmed.startsWith("@")) {
    const parts = trimmed.split("/");
    return parts.slice(0, 2).join("/");
  }
  return trimmed.split("/")[0] ?? trimmed;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: Edge[];
  internalCount: number;
  externalCount: number;
  packages: Array<{ name: string; usedBy: number }>;
}

export function buildDependencyGraph(
  files: CodeFileRow[],
  deps: DependencyRow[],
  query = "",
): DependencyGraph {
  const q = query.trim().toLowerCase();
  const fileById = new Map(files.map((file) => [file.id, file]));

  const internal = deps.filter((dep) => dep.targetId && fileById.has(dep.sourceId) && fileById.has(dep.targetId));
  const external = deps.filter((dep) => !dep.targetId && packageName(dep.targetPath));

  const packageUses = new Map<string, number>();
  for (const dep of external) {
    const name = packageName(dep.targetPath);
    if (!name) continue;
    packageUses.set(name, (packageUses.get(name) ?? 0) + 1);
  }
  const packages = [...packageUses.entries()]
    .map(([name, usedBy]) => ({ name, usedBy }))
    .sort((a, b) => b.usedBy - a.usedBy);

  const connected = new Set<string>();
  for (const dep of internal) {
    connected.add(dep.sourceId);
    if (dep.targetId) connected.add(dep.targetId);
  }

  let picked = files.filter((file) => isArchitectureFile(file.path) && connected.has(file.id));
  if (q) {
    picked = files.filter(
      (file) =>
        isArchitectureFile(file.path) &&
        (file.path.toLowerCase().includes(q) || file.language.toLowerCase().includes(q)),
    );
  }
  picked = picked.slice(0, 40);

  const visible = new Set(picked.map((file) => file.id));
  const topPackages = packages.filter((item) => !q || item.name.toLowerCase().includes(q)).slice(0, 10);

  const byFolder = new Map<string, CodeFileRow[]>();
  for (const file of picked) {
    const folder = folderOf(file.path);
    const list = byFolder.get(folder) ?? [];
    list.push(file);
    byFolder.set(folder, list);
  }

  const nodes: GraphNode[] = [];
  [...byFolder.entries()].forEach(([, list], col) => {
    list.forEach((file, row) => {
      nodes.push({
        id: file.id,
        type: "archFile",
        position: { x: 32 + col * 230, y: 28 + row * 86 },
        data: {
          label: file.path.split("/").pop() ?? file.path,
          kind: file.language,
          detail: file.path,
        },
      });
    });
  });

  const packageColumn = Math.max(byFolder.size, 1) * 230 + 48;
  topPackages.forEach((pkg, index) => {
    nodes.push({
      id: `pkg:${pkg.name}`,
      type: "archFile",
      position: { x: packageColumn, y: 28 + index * 86 },
      data: {
        label: pkg.name,
        kind: "external",
        detail: `Used by ${pkg.usedBy} import${pkg.usedBy === 1 ? "" : "s"}`,
      },
    });
  });

  const internalEdges: Edge[] = internal
    .filter((dep) => dep.targetId && visible.has(dep.sourceId) && visible.has(dep.targetId))
    .slice(0, 90)
    .map((dep) => ({
      id: dep.id,
      source: dep.sourceId,
      target: dep.targetId!,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "oklch(0.72 0.12 250)" },
      style: { stroke: "oklch(0.72 0.12 250)", strokeWidth: 1.3 },
    }));

  const packageIds = new Set(topPackages.map((item) => `pkg:${item.name}`));
  const externalEdges: Edge[] = [];
  for (const dep of external) {
    const name = packageName(dep.targetPath);
    if (!name || !visible.has(dep.sourceId) || !packageIds.has(`pkg:${name}`)) continue;
    externalEdges.push({
      id: `ext-${dep.id}`,
      source: dep.sourceId,
      target: `pkg:${name}`,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "oklch(0.65 0.02 260)" },
      style: { stroke: "oklch(0.65 0.02 260)", strokeWidth: 1.1 },
    });
  }

  return {
    nodes,
    edges: [...internalEdges, ...externalEdges.slice(0, 60)],
    internalCount: internal.length,
    externalCount: external.length,
    packages,
  };
}
