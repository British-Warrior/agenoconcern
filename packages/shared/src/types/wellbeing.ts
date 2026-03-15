export interface WellbeingCheckinInput {
  uclaItems: [number, number, number]; // each 1-4
  wemwbsItems: [number, number, number, number, number, number, number]; // each 1-5
  consentGranted: boolean; // must be true
}

export interface WellbeingCheckin {
  id: string;
  uclaScore: number;
  wemwbsScore: number;
  completedAt: string;
}

export interface WellbeingDueResponse {
  due: boolean;
  lastCheckinAt: string | null;
}

export interface WellbeingTrajectoryPoint {
  uclaScore: number;
  wemwbsScore: number;
  completedAt: string;
}
