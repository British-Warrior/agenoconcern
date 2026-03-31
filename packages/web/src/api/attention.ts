import { apiClient } from "./client.js";

export interface TrendPoint {
  isoWeek: string;
  count: number;
}

export interface AttentionTrendData {
  weeks: TrendPoint[];
  direction: "Increasing" | "Stable" | "Decreasing";
  activeCount: number;
}

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

export function getAttentionTrend(): Promise<AttentionTrendData> {
  return apiClient<AttentionTrendData>("/api/admin/attention/trend");
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
