import { apiRequest } from "./client";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  repositoryId: string | null;
  readAt: string | null;
  createdAt: string;
}

export const notificationsApi = {
  list() {
    return apiRequest<NotificationDto[]>("/notifications");
  },
  unreadCount() {
    return apiRequest<{ count: number }>("/notifications/unread-count");
  },
  markRead(id: string) {
    return apiRequest<{ ok: true }>(`/notifications/${id}/read`, { method: "POST" });
  },
  markAllRead() {
    return apiRequest<{ ok: true }>("/notifications/read-all", { method: "POST" });
  },
};
