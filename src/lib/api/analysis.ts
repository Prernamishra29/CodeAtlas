import type { ActivityEvent, HealthBreakdown, Insight } from "@/types";
import { apiRequest } from "./client";

export type AnalysisState =
  "queued" | "cloning" | "scanning" | "analyzing" | "completed" | "failed" | "cancelled";

export interface AnalysisMetricsRow {
  total_files: number;
  total_lines: number;
  total_bytes: number;
  total_folders: number;
  languages: { name: string; files: number; lines: number; bytes: number; share: number }[];
  folders: { path: string; files: number; lines: number }[];
  largest_files: { path: string; bytes: number; lines: number; language: string }[];
}

export interface AnalysisRecord {
  id: string;
  status: AnalysisState;
  progress: number;
  current_step: string | null;
  error: string | null;
  attempts: number;
  max_attempts: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  result: AnalysisMetricsRow | null;
}

interface NestAnalysis {
  id: string;
  status: AnalysisState;
  progress: number;
  currentStep: string | null;
  error: string | null;
  attempts: number;
  maxAttempts: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  result?: {
    totalFiles: number;
    totalLines: number;
    totalBytes: number | string;
    totalFolders: number;
    languages: AnalysisMetricsRow["languages"];
    folders: AnalysisMetricsRow["folders"];
    largestFiles: AnalysisMetricsRow["largest_files"];
  } | null;
}

function mapAnalysis(row: NestAnalysis | null): AnalysisRecord | null {
  if (!row) return null;
  const result = row.result
    ? {
        total_files: row.result.totalFiles,
        total_lines: Number(row.result.totalLines),
        total_bytes: Number(row.result.totalBytes),
        total_folders: row.result.totalFolders,
        languages: row.result.languages ?? [],
        folders: row.result.folders ?? [],
        largest_files: row.result.largestFiles ?? [],
      }
    : null;
  return {
    id: row.id,
    status: row.status,
    progress: row.progress,
    current_step: row.currentStep,
    error: row.error,
    attempts: row.attempts,
    max_attempts: row.maxAttempts,
    started_at: row.startedAt,
    completed_at: row.completedAt,
    created_at: row.createdAt,
    result,
  };
}

export const ACTIVE_STATES: AnalysisState[] = ["queued", "cloning", "scanning", "analyzing"];

export function isActiveAnalysis(status?: AnalysisState | null) {
  return status ? ACTIVE_STATES.includes(status) : false;
}

export const analysisApi = {
  async start(repositoryId: string) {
    return apiRequest<{ analysisId: string; status: string; alreadyRunning: boolean }>(
      `/repositories/${repositoryId}/analyze`,
      { method: "POST" },
    );
  },
  async retry(repositoryId: string) {
    return apiRequest<{ analysisId: string; status: string; alreadyRunning: boolean }>(
      `/repositories/${repositoryId}/retry`,
      { method: "POST" },
    );
  },
  async cancel(repositoryId: string, analysisId: string) {
    return apiRequest(`/repositories/${repositoryId}/analyses/${analysisId}`, { method: "DELETE" });
  },
  async latest(repositoryId: string) {
    const row = await apiRequest<NestAnalysis | null>(
      `/repositories/${repositoryId}/analyses/latest`,
    );
    return mapAnalysis(row);
  },
  async history(repositoryId: string) {
    return apiRequest(`/repositories/${repositoryId}/analyses`);
  },
  async languages(repositoryId: string) {
    const latest = await this.latest(repositoryId);
    const languages = latest?.result?.languages ?? [];
    return languages.map((language) => ({
      name: language.name,
      value: language.share,
      lines: language.lines,
      files: language.files,
    }));
  },
  async health(repositoryId: string) {
    return apiRequest<{
      breakdown: HealthBreakdown;
      trend: { period: string; score: number }[];
      complexity: { module: string; complexity: number }[];
      overall: number;
    }>(`/repositories/${repositoryId}/health`);
  },
  async insights(repositoryId?: string) {
    const path = repositoryId ? `/repositories/${repositoryId}/insights` : "/repositories/insights";
    return apiRequest<Insight[]>(path);
  },
  async activity() {
    return apiRequest<ActivityEvent[]>("/repositories/activity");
  },
};
