import type { ChatMessage, Conversation } from "@/types";
import { API_BASE_URL, getAccessToken } from "./client";

interface NestConversation {
  id: string;
  title: string;
  updatedAt: string;
  messages: { id: string; role: "user" | "assistant"; content: string; createdAt: string }[];
}

export const chatApi = {
  async conversations(repositoryId: string): Promise<Conversation[]> {
    const token = getAccessToken();
    const res = await fetch(`${API_BASE_URL}/repositories/${repositoryId}/chat`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as NestConversation[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      updatedAt: row.updatedAt,
      messages: row.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        at: message.createdAt,
      })),
    }));
  },

  streamUrl(repositoryId: string) {
    return `${API_BASE_URL}/repositories/${repositoryId}/chat`;
  },
};
