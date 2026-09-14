import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

export interface GraphNodePayload extends Record<string, unknown> {
  label: string;
  kind: string;
  detail?: string;
  fileCount?: number;
  languages?: string[];
  complexity?: number;
}

export type GraphNode = Node<GraphNodePayload>;

function GraphInner({
  nodes,
  edges,
  onNodeSelect,
  className,
  nodeTypes,
}: {
  nodes: GraphNode[];
  edges: Edge[];
  onNodeSelect?: ((id: string | null) => void) | undefined;
  className?: string | undefined;
  nodeTypes?: NodeTypes;
}) {
  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => onNodeSelect?.(node.id),
    [onNodeSelect],
  );

  return (
    <div className={cn("h-full w-full", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        {...(nodeTypes ? { nodeTypes } : {})}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={handleNodeClick}
        onPaneClick={() => onNodeSelect?.(null)}
        minZoom={0.2}
        maxZoom={1.8}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "oklch(0.78 0.16 305 / 55%)", strokeWidth: 1.6 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--border)" />
        <MiniMap
          pannable
          zoomable
          maskColor="oklch(0.185 0.036 255 / 72%)"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
          nodeColor={() => "oklch(0.78 0.16 305)"}
        />
        <Controls
          showInteractive={false}
          className="!rounded-lg !border !border-border !bg-surface !shadow-none [&_button]:!border-border [&_button]:!bg-surface [&_button]:!text-foreground [&_button:hover]:!bg-accent"
        />
      </ReactFlow>
    </div>
  );
}

/** Reusable, provider-wrapped graph surface used by architecture + dependencies. */
export function GraphCanvas(props: {
  nodes: GraphNode[];
  edges: Edge[];
  onNodeSelect?: ((id: string | null) => void) | undefined;
  className?: string | undefined;
  nodeTypes?: NodeTypes;
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
