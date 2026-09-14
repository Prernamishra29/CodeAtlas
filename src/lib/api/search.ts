import type { SearchResult } from "@/types";
import { apiRequest } from "./client";

export type SearchKind = SearchResult["kind"];

export interface SearchParams {
  repositoryId: string;
  query: string;
  kinds?: SearchKind[];
}

export const searchApi = {
  async query({ repositoryId, query, kinds }: SearchParams): Promise<SearchResult[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    if (kinds?.length) params.set("kinds", kinds.join(","));
    return apiRequest<SearchResult[]>(`/repositories/${repositoryId}/search?${params.toString()}`);
  },
};
