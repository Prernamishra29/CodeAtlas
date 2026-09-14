export type RepoStatus = "not_analyzed" | "queued" | "analyzing" | "completed" | "failed";

export interface Repository {
  id: string;
  name: string;
  owner: string;
  url: string;
  branch: string;
  description: string;
  language: string;
  status: RepoStatus;
  healthScore: number;
  lastAnalyzedAt: string | null;
  stats: {
    files: number;
    linesOfCode: number;
    languages: number;
    dependencies: number;
    functions: number;
    classes: number;
  };
}

export interface ActivityEvent {
  id: string;
  repositoryId: string;
  repository: string;
  kind: "analysis" | "import" | "insight" | "failure";
  message: string;
  at: string;
}

export interface Insight {
  id: string;
  title: string;
  detail: string;
  severity: "info" | "warning" | "danger" | "success";
}

export interface HealthBreakdown {
  architecture: number;
  maintainability: number;
  complexity: number;
  dependencies: number;
  documentation: number;
}

export interface SearchResult {
  id: string;
  kind: "file" | "function" | "class" | "documentation";
  file: string;
  symbol: string;
  description: string;
  relevance: number;
  line: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  at: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface DependencyNodeData {
  id: string;
  name: string;
  version: string;
  type: "runtime" | "dev" | "internal";
  size: string;
  usedBy: number;
  risk: "low" | "medium" | "high";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  notifyAnalysis: boolean;
  notifyInsights: boolean;
  compactDensity: boolean;
  githubConnected: boolean;
}
