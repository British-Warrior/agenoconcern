import { apiClient } from "./client.js";
import type {
  WellbeingCheckin,
  WellbeingCheckinInput,
  WellbeingDueResponse,
  WellbeingTrajectoryPoint,
} from "@agenoconcern/shared";

export function submitCheckin(data: WellbeingCheckinInput): Promise<WellbeingCheckin> {
  return apiClient<WellbeingCheckin>("/api/wellbeing/checkin", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getWellbeingDue(): Promise<WellbeingDueResponse> {
  return apiClient<WellbeingDueResponse>("/api/wellbeing/due");
}

export function getWellbeingHistory(): Promise<WellbeingTrajectoryPoint[]> {
  return apiClient<WellbeingTrajectoryPoint[]>("/api/wellbeing/history");
}
