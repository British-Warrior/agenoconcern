// SWEMWBS Rasch metric conversion
// Converts raw SWEMWBS scores (7–35) to interval-scale metric scores.
// Reference: Tennant et al. (2007). The Warwick-Edinburgh Mental Well-being Scale.
//
// IMPORTANT: SWEMWBS is copyright NHS Health Scotland, University of Warwick and
// University of Edinburgh. A licence is required for commercial use.
// Confirm licence before shipping this feature.

// Rasch metric values indexed by (rawScore - 7), covering raw scores 7–35
const RASCH_METRIC: readonly number[] = [
  7.00,  // raw  7
  9.51,  // raw  8
  11.25, // raw  9
  12.40, // raw 10
  13.33, // raw 11
  14.08, // raw 12
  14.75, // raw 13
  15.32, // raw 14
  15.84, // raw 15
  16.36, // raw 16
  16.88, // raw 17
  17.43, // raw 18
  17.98, // raw 19
  18.59, // raw 20
  19.25, // raw 21
  19.98, // raw 22
  20.73, // raw 23
  21.54, // raw 24
  22.35, // raw 25
  23.21, // raw 26
  24.11, // raw 27
  25.03, // raw 28
  26.02, // raw 29
  27.03, // raw 30
  28.13, // raw 31
  29.31, // raw 32
  30.70, // raw 33
  32.55, // raw 34
  35.00, // raw 35
];

/**
 * Convert a raw SWEMWBS score to a Rasch metric score.
 * Raw scores must be integers in the range 7–35.
 * Throws if the score is out of range.
 */
export function rawToMetric(rawScore: number): number {
  if (!Number.isInteger(rawScore) || rawScore < 7 || rawScore > 35) {
    throw new RangeError(`rawToMetric: rawScore must be an integer between 7 and 35, got ${rawScore}`);
  }
  return RASCH_METRIC[rawScore - 7]!;
}

export type WellbeingBandLabel = "Low" | "Typical" | "High";

/**
 * Classify a Rasch metric score into a wellbeing band.
 *
 * Thresholds (from the SWEMWBS population norms):
 *   Low     < 19.25
 *   Typical 19.25 – < 29.31
 *   High   >= 29.31
 */
export function metricToBand(metricScore: number): WellbeingBandLabel {
  if (metricScore < 19.25) return "Low";
  if (metricScore < 29.31) return "Typical";
  return "High";
}
