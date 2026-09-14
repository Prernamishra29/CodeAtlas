/**
 * DEMO DATA — Phase 1 only.
 * Every value below is fabricated for UI development. No backend is involved.
 * Phase 2 replaces the mock services in `src/lib/api/*` with real HTTP calls;
 * nothing outside this file needs to change.
 */
import type {
  ActivityEvent,
  ChatMessage,
  Conversation,
  DependencyNodeData,
  HealthBreakdown,
  Insight,
  Repository,
  SearchResult,
} from "@/types";

export const DEMO_NOTICE = "Demo data — not connected to a backend yet.";

export const demoRepositories: Repository[] = [
  {
    id: "atlas-web",
    name: "atlas-web",
    owner: "codeatlas",
    url: "https://github.com/codeatlas/atlas-web",
    branch: "main",
    description: "Customer-facing web application and design system.",
    language: "TypeScript",
    status: "completed",
    healthScore: 86,
    lastAnalyzedAt: "2026-08-09T18:20:00.000Z",
    stats: {
      files: 1284,
      linesOfCode: 142_530,
      languages: 6,
      dependencies: 78,
      functions: 4210,
      classes: 312,
    },
  },
  {
    id: "atlas-api",
    name: "atlas-api",
    owner: "codeatlas",
    url: "https://github.com/codeatlas/atlas-api",
    branch: "main",
    description: "Core REST + GraphQL API service.",
    language: "TypeScript",
    status: "analyzing",
    healthScore: 74,
    lastAnalyzedAt: "2026-08-10T06:05:00.000Z",
    stats: {
      files: 862,
      linesOfCode: 98_140,
      languages: 4,
      dependencies: 112,
      functions: 3120,
      classes: 486,
    },
  },
  {
    id: "ledger-service",
    name: "ledger-service",
    owner: "codeatlas",
    url: "https://github.com/codeatlas/ledger-service",
    branch: "develop",
    description: "Double-entry ledger and payment reconciliation.",
    language: "Go",
    status: "queued",
    healthScore: 68,
    lastAnalyzedAt: "2026-08-04T11:00:00.000Z",
    stats: {
      files: 431,
      linesOfCode: 52_980,
      languages: 3,
      dependencies: 41,
      functions: 1890,
      classes: 96,
    },
  },
  {
    id: "insight-workers",
    name: "insight-workers",
    owner: "codeatlas",
    url: "https://github.com/codeatlas/insight-workers",
    branch: "main",
    description: "Background jobs for indexing and embeddings.",
    language: "Python",
    status: "failed",
    healthScore: 52,
    lastAnalyzedAt: "2026-08-02T09:41:00.000Z",
    stats: {
      files: 218,
      linesOfCode: 24_310,
      languages: 2,
      dependencies: 63,
      functions: 940,
      classes: 71,
    },
  },
  {
    id: "design-tokens",
    name: "design-tokens",
    owner: "codeatlas",
    url: "https://github.com/codeatlas/design-tokens",
    branch: "main",
    description: "Shared theme tokens published to npm.",
    language: "TypeScript",
    status: "not_analyzed",
    healthScore: 0,
    lastAnalyzedAt: null,
    stats: {
      files: 64,
      linesOfCode: 4_120,
      languages: 2,
      dependencies: 12,
      functions: 130,
      classes: 8,
    },
  },
];

export const demoActivity: ActivityEvent[] = [
  {
    id: "a1",
    repositoryId: "atlas-api",
    repository: "atlas-api",
    kind: "analysis",
    message: "Structural analysis running — 62% of files parsed",
    at: "2026-08-10T06:05:00.000Z",
  },
  {
    id: "a2",
    repositoryId: "atlas-web",
    repository: "atlas-web",
    kind: "insight",
    message: "3 modules exceed the complexity threshold",
    at: "2026-08-09T18:34:00.000Z",
  },
  {
    id: "a3",
    repositoryId: "atlas-web",
    repository: "atlas-web",
    kind: "analysis",
    message: "Analysis completed in 4m 12s",
    at: "2026-08-09T18:20:00.000Z",
  },
  {
    id: "a4",
    repositoryId: "insight-workers",
    repository: "insight-workers",
    kind: "failure",
    message: "Analysis failed — dependency manifest unreadable",
    at: "2026-08-02T09:41:00.000Z",
  },
  {
    id: "a5",
    repositoryId: "design-tokens",
    repository: "design-tokens",
    kind: "import",
    message: "Repository imported and awaiting first analysis",
    at: "2026-08-01T15:12:00.000Z",
  },
];

export const demoInsights: Insight[] = [
  {
    id: "i1",
    title: "Authentication logic is duplicated",
    detail: "Session validation appears in 4 modules across api and web. Consolidate into one guard.",
    severity: "warning",
  },
  {
    id: "i2",
    title: "Ledger boundaries are clean",
    detail: "ledger-service has no inbound imports from presentation layers — a healthy separation.",
    severity: "success",
  },
  {
    id: "i3",
    title: "12 dependencies are one major behind",
    detail: "Upgrade candidates concentrated in the workers service.",
    severity: "info",
  },
  {
    id: "i4",
    title: "Documentation coverage is thin",
    detail: "Only 34% of exported modules carry usable docstrings.",
    severity: "danger",
  },
];

export const demoHealth: HealthBreakdown = {
  architecture: 88,
  maintainability: 79,
  complexity: 71,
  dependencies: 82,
  documentation: 46,
};

export const demoHealthTrend = [
  { period: "Mar", score: 61 },
  { period: "Apr", score: 66 },
  { period: "May", score: 70 },
  { period: "Jun", score: 74 },
  { period: "Jul", score: 81 },
  { period: "Aug", score: 86 },
];

export const demoComplexity = [
  { module: "api/routes", complexity: 34 },
  { module: "web/checkout", complexity: 28 },
  { module: "auth/session", complexity: 24 },
  { module: "workers/index", complexity: 19 },
  { module: "ui/table", complexity: 12 },
];

export const demoLanguages = [
  { name: "TypeScript", value: 62 },
  { name: "Go", value: 14 },
  { name: "Python", value: 11 },
  { name: "CSS", value: 8 },
  { name: "Shell", value: 5 },
];

export const demoSearchResults: SearchResult[] = [
  {
    id: "s1",
    kind: "function",
    file: "src/modules/auth/session.service.ts",
    symbol: "validateSession()",
    description: "Verifies a signed session token, refreshes it and returns the resolved actor.",
    relevance: 0.96,
    line: 48,
  },
  {
    id: "s2",
    kind: "class",
    file: "src/modules/billing/payment.processor.ts",
    symbol: "PaymentProcessor",
    description: "Coordinates charge intents, retries and ledger writes for a single order.",
    relevance: 0.91,
    line: 12,
  },
  {
    id: "s3",
    kind: "file",
    file: "src/modules/auth/auth.controller.ts",
    symbol: "auth.controller.ts",
    description: "HTTP surface for login, refresh and password recovery flows.",
    relevance: 0.87,
    line: 1,
  },
  {
    id: "s4",
    kind: "documentation",
    file: "docs/architecture/overview.md",
    symbol: "System overview",
    description: "Describes the request path from edge to worker queue and back.",
    relevance: 0.78,
    line: 1,
  },
  {
    id: "s5",
    kind: "function",
    file: "src/workers/indexer.ts",
    symbol: "buildSymbolIndex()",
    description: "Walks parsed files and emits a symbol index shard per package.",
    relevance: 0.72,
    line: 130,
  },
];

export const demoDependencies: DependencyNodeData[] = [
  { id: "d1", name: "react", version: "19.2.0", type: "runtime", size: "142 kB", usedBy: 312, risk: "low" },
  { id: "d2", name: "zod", version: "3.24.2", type: "runtime", size: "58 kB", usedBy: 96, risk: "low" },
  { id: "d3", name: "lodash", version: "4.17.20", type: "runtime", size: "531 kB", usedBy: 41, risk: "high" },
  { id: "d4", name: "@atlas/ui", version: "2.4.1", type: "internal", size: "212 kB", usedBy: 188, risk: "low" },
  { id: "d5", name: "axios", version: "0.27.2", type: "runtime", size: "44 kB", usedBy: 62, risk: "medium" },
  { id: "d6", name: "vitest", version: "3.1.0", type: "dev", size: "—", usedBy: 24, risk: "low" },
  { id: "d7", name: "moment", version: "2.29.1", type: "runtime", size: "290 kB", usedBy: 9, risk: "high" },
];

export const demoConversations: Conversation[] = [
  {
    id: "c1",
    title: "How does authentication work?",
    updatedAt: "2026-08-10T07:10:00.000Z",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "How does authentication work?",
        at: "2026-08-10T07:09:00.000Z",
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "Placeholder response. In Phase 2 this answer is produced by the analysis backend, grounded in the indexed repository. The chat transport already routes through `src/lib/api/chat.ts`.",
        at: "2026-08-10T07:10:00.000Z",
      },
    ],
  },
  {
    id: "c2",
    title: "Where is payment processing implemented?",
    updatedAt: "2026-08-09T16:40:00.000Z",
    messages: [
      {
        id: "m3",
        role: "user",
        content: "Where is payment processing implemented?",
        at: "2026-08-09T16:39:00.000Z",
      },
      {
        id: "m4",
        role: "assistant",
        content: "Placeholder response — no language model is connected in this phase.",
        at: "2026-08-09T16:40:00.000Z",
      },
    ],
  },
];

export const suggestedQuestions = [
  "How does authentication work?",
  "Where is payment processing implemented?",
  "What is the overall architecture?",
  "Which files are most complex?",
];

export const demoFileTree = [
  {
    name: "src",
    children: [
      {
        name: "modules",
        children: [
          { name: "auth", children: [{ name: "auth.controller.ts" }, { name: "session.service.ts" }] },
          { name: "billing", children: [{ name: "payment.processor.ts" }] },
        ],
      },
      { name: "workers", children: [{ name: "indexer.ts" }, { name: "queue.ts" }] },
      { name: "main.ts" },
    ],
  },
  { name: "docs", children: [{ name: "overview.md" }] },
  { name: "package.json" },
];
