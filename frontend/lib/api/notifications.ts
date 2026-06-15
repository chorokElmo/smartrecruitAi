import { apiClient } from "./client";

export interface Notification {
  id: string;
  user_id: string;
  job_id?: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  list:       ()          => apiClient.get<Notification[]>("/notifications"),
  unreadCount:()          => apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead:   (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead:()          => apiClient.patch("/notifications/read-all"),
};
