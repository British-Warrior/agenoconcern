import { apiClient } from "./client.js";

export interface AttentionFlag {
  id: string;
  contributorId: string;
  contributorName: string;
  signalType: string;
  cohortSize: number | null;
  flaggedCount: number | null;
  createdAt: string;
}

export interface AttentionHistoryEntry extends AttentionFlag {
  clearedAt: string | null;
  followUpNotes: string | null;
  clearedBy: string | null;
}

export function getAttentionFlags(): Promise<AttentionFlag[]> {
  return apiClient<AttentionFlag[]>("/api/admin/attention");
}

export function getAttentionHistory(): Promise<AttentionHistoryEntry[]> {
  return apiClient<AttentionHistoryEntry[]>("/api/admin/attention/history");
}

export function resolveFlag(
  flagId: string,
  followUpNotes: string,
): Promise<AttentionHistoryEntry> {
  return apiClient<AttentionHistoryEntry>(`/api/admin/attention/${flagId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ followUpNotes }),
  });
}
