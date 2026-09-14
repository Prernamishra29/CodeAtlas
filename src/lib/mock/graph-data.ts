import type { Edge } from "@xyflow/react";
import type { GraphNode } from "@/components/graph/graph-canvas";

/** DEMO architecture topology — replaced by parsed output in a later phase. */
const nodeStyle = {
  background: "var(--elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: 10,
  color: "var(--foreground)",
  fontSize: 12,
  padding: "10px 14px",
  width: 168,
};

const accentStyle = {
  ...nodeStyle,
  border: "1px solid oklch(0.62 0.19 262 / 55%)",
  boxShadow: "0 0 0 1px oklch(0.62 0.19 262 / 20%), 0 14px 40px -22px oklch(0.62 0.19 262 / 60%)",
};

export const architectureNodes: GraphNode[] = [
  {
    id: "frontend",
    position: { x: 0, y: 40 },
    data: { label: "Frontend", kind: "Web app", detail: "React + Vite SPA served from the edge." },
    style: accentStyle,
  },
  {
    id: "api",
    position: { x: 240, y: 40 },
    data: {
      label: "API",
      kind: "Service",
      detail: "REST gateway, request validation and rate limits.",
    },
    style: accentStyle,
  },
  {
    id: "auth",
    position: { x: 240, y: -70 },
    data: {
      label: "Authentication",
      kind: "Service",
      detail: "Session issuing, refresh rotation and recovery.",
    },
    style: nodeStyle,
  },
  {
    id: "services",
    position: { x: 490, y: 40 },
    data: {
      label: "Services",
      kind: "Domain layer",
      detail: "Repository, analysis and billing domains.",
    },
    style: nodeStyle,
  },
  {
    id: "database",
    position: { x: 740, y: -20 },
    data: {
      label: "Database",
      kind: "Postgres",
      detail: "Primary relational store with logical replicas.",
    },
    style: nodeStyle,
  },
  {
    id: "redis",
    position: { x: 740, y: 100 },
    data: { label: "Redis", kind: "Cache / queue", detail: "Hot caches and job hand-off." },
    style: nodeStyle,
  },
  {
    id: "workers",
    position: { x: 490, y: 190 },
    data: {
      label: "Background Workers",
      kind: "Queue consumers",
      detail: "Parsing, indexing and report generation.",
    },
    style: nodeStyle,
  },
];

export const architectureEdges: Edge[] = [
  { id: "e1", source: "frontend", target: "api" },
  { id: "e2", source: "frontend", target: "auth" },
  { id: "e3", source: "api", target: "auth" },
  { id: "e4", source: "api", target: "services" },
  { id: "e5", source: "services", target: "database" },
  { id: "e6", source: "services", target: "redis" },
  { id: "e7", source: "redis", target: "workers" },
  { id: "e8", source: "workers", target: "database" },
];

export const dependencyNodes: GraphNode[] = [
  {
    id: "d4",
    position: { x: 0, y: 60 },
    data: { label: "@atlas/ui", kind: "internal" },
    style: accentStyle,
  },
  {
    id: "d1",
    position: { x: 250, y: -30 },
    data: { label: "react", kind: "runtime" },
    style: nodeStyle,
  },
  {
    id: "d2",
    position: { x: 250, y: 60 },
    data: { label: "zod", kind: "runtime" },
    style: nodeStyle,
  },
  {
    id: "d5",
    position: { x: 250, y: 150 },
    data: { label: "axios", kind: "runtime" },
    style: nodeStyle,
  },
  {
    id: "d3",
    position: { x: 500, y: 20 },
    data: { label: "lodash", kind: "runtime" },
    style: nodeStyle,
  },
  {
    id: "d7",
    position: { x: 500, y: 120 },
    data: { label: "moment", kind: "runtime" },
    style: nodeStyle,
  },
  {
    id: "d6",
    position: { x: 500, y: 215 },
    data: { label: "vitest", kind: "dev" },
    style: nodeStyle,
  },
];

export const dependencyEdges: Edge[] = [
  { id: "de1", source: "d4", target: "d1" },
  { id: "de2", source: "d4", target: "d2" },
  { id: "de3", source: "d4", target: "d5" },
  { id: "de4", source: "d1", target: "d3" },
  { id: "de5", source: "d5", target: "d7" },
  { id: "de6", source: "d2", target: "d6" },
];
