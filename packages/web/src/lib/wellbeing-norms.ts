// SWEMWBS 7-item short form: range 7-35
export const SWEMWBS_NORMS = {
  low: { max: 18, label: "Low", color: "text-red-600", bg: "bg-red-50" },
  average: { min: 19, max: 26, label: "Average", color: "text-amber-600", bg: "bg-amber-50" },
  high: { min: 27, label: "High", color: "text-green-600", bg: "bg-green-50" },
} as const;

// UCLA 3-item: range 3-12; lower = less lonely
export const UCLA_NORMS = {
  low: { max: 4, label: "Low loneliness", color: "text-green-600", bg: "bg-green-50" },
  average: { min: 5, max: 7, label: "Average", color: "text-amber-600", bg: "bg-amber-50" },
  high: { min: 8, label: "High loneliness", color: "text-red-600", bg: "bg-red-50" },
} as const;

export type WellbeingBand = { label: string; color: string; bg: string };

export function swemwbsBand(score: number): WellbeingBand {
  if (score <= 18) return SWEMWBS_NORMS.low;
  if (score <= 26) return SWEMWBS_NORMS.average;
  return SWEMWBS_NORMS.high;
}

export function uclaBand(score: number): WellbeingBand {
  if (score <= 4) return UCLA_NORMS.low;
  if (score <= 7) return UCLA_NORMS.average;
  return UCLA_NORMS.high;
}

/** Compute trend direction from an array of scores (oldest first). Returns "up", "down", or "stable". */
export function trendDirection(scores: number[]): "up" | "down" | "stable" {
  if (scores.length < 2) return "stable";
  const last = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "stable";
}
