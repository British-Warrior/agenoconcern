import { apiClient } from "./client.js";
import type { Notification, NotificationPreferences, PushSubscriptionInput } from "@agenoconcern/shared";

export async function getNotifications(): Promise<Notification[]> {
  return apiClient<Notification[]>("/api/notifications");
}

export async function markRead(id: string): Promise<void> {
  return apiClient<void>(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllRead(): Promise<void> {
  return apiClient<void>("/api/notifications/read-all", { method: "POST" });
}

export async function savePushSubscription(sub: PushSubscriptionInput): Promise<void> {
  return apiClient<void>("/api/notifications/push-sub", {
    method: "POST",
    body: JSON.stringify(sub),
  });
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  return apiClient<void>("/api/notifications/push-sub", {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  });
}

export async function getPreferences(): Promise<NotificationPreferences> {
  return apiClient<NotificationPreferences>("/api/notifications/preferences");
}

export async function updatePreferences(prefs: NotificationPreferences): Promise<void> {
  return apiClient<void>("/api/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
}
