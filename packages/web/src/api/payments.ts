import { apiClient } from "./client.js";
import type { ImpactSummary, ChallengerImpact } from "@agenoconcern/shared";

// ─── Impact API ────────────────────────────────────────────────────────────────

export function getImpactSummary(): Promise<ImpactSummary> {
  return apiClient<ImpactSummary>("/api/impact/summary");
}

export function getChallengerImpact(): Promise<ChallengerImpact> {
  return apiClient<ChallengerImpact>("/api/impact/challenger");
}

// ─── Hours logging ─────────────────────────────────────────────────────────────

export interface LogHoursData {
  circleId: string;
  hoursLogged: number;
  description?: string;
  isPaid?: boolean;
}

export function logHours(data: LogHoursData): Promise<void> {
  return apiClient<void>("/api/payments/hours", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
