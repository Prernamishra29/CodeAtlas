import type { Repository } from "@/types";
import { apiRequest } from "./client";

export interface CreateRepositoryPayload {
  url: string;
  branch: string;
}

export interface CodeFileRow {
  id: string;
  path: string;
  language: string;
  size: number;
  lines: number;
  complexity: number;
  content?: string | null;
  symbols?: { id: string; name: string; type: string; line: number }[];
}

export interface DependencyRow {
  id: string;
  sourceId: string;
  targetId: string | null;
  targetPath: string;
  type: string;
  source?: { path: string };
  target?: { path: string } | null;
}

export const repositoriesApi = {
  async list(): Promise<Repository[]> {
    return apiRequest<Repository[]>("/repositories");
  },

  async get(id: string): Promise<Repository | undefined> {
    try {
      return await apiRequest<Repository>(`/repositories/${id}`);
    } catch {
      return undefined;
    }
  },

  async create({ url, branch }: CreateRepositoryPayload): Promise<Repository> {
    return apiRequest<Repository>("/repositories", {
      method: "POST",
      body: JSON.stringify({ url, branch }),
    });
  },

  async remove(id: string): Promise<{ id: string }> {
    return apiRequest<{ id: string }>(`/repositories/${id}`, { method: "DELETE" });
  },

  async getFiles(id: string) {
    return apiRequest<CodeFileRow[]>(`/repositories/${id}/files`);
  },

  async getDependencies(id: string) {
    return apiRequest<DependencyRow[]>(`/repositories/${id}/dependencies`);
  },

  async documentation(id: string) {
    return apiRequest<
      { id: string; entityType: string; entityId: string | null; content: string }[]
    >(`/repositories/${id}/documentation`);
  },
};
