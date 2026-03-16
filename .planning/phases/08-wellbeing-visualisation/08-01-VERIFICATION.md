---
phase: 08-wellbeing-visualisation
verified: 2026-03-16T11:40:16Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 8: Wellbeing Visualisation Verification Report

**Phase Goal:** Wellbeing data is interpretable and funder-ready — contributors see trend, context, and UK benchmarks rather than raw numbers.
**Verified:** 2026-03-16T11:40:16Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Impact dashboard shows SWEMWBS and UCLA scores as a multi-series line chart across all historical check-ins | VERIFIED | WellbeingChart.tsx l.113-130: two Line elements (dataKey="swemwbs", dataKey="ucla") inside LineChart data={chartData} where chartData maps every trajectory point. ImpactDashboard.tsx l.362: WellbeingChart trajectory={trajectory} passing summary.wellbeingTrajectory. |
| 2  | Chart includes a visible UK population benchmark line for SWEMWBS | VERIFIED | WellbeingChart.tsx l.17: const SWEMWBS_UK_MEAN = 23.6. l.102-111: ReferenceLine y={SWEMWBS_UK_MEAN} stroke="#d97706" strokeDasharray="4 4" with label "UK mean (23.6)" positioned right. Chart div has aria-hidden="true" so the ReferenceLine is visible to sighted users. |
| 3  | Each score displays its band label (low / average / high) alongside the numeric value | VERIFIED | (a) Tooltip: WellbeingChart.tsx l.41-58 — swemwbsBand/uclaBand called; swBand.label and ucBand.label rendered inline with score. (b) Latest score summary: ImpactDashboard.tsx l.336-355 — swBand.label / ucBand.label rendered with colour class. (c) Accessible table: WellbeingChart.tsx l.152-166 — sw.label and uc.label in band columns. |
| 4  | An accessible data table of the same wellbeing scores is present for screen reader users | VERIFIED | WellbeingChart.tsx l.136-171: table className="sr-only" aria-label="Wellbeing scores by date" with caption explaining both scales, five th scope="col" columns, one tr per trajectory point. Uses sr-only (not hidden) — accessible tree intact. |
| 5  | Empty state shows a message instead of an empty chart when no check-ins exist | VERIFIED | WellbeingChart.tsx l.68-73: if (trajectory.length === 0) returns paragraph "Your wellbeing journey will appear here after your first check-in." Guard fires before any recharts elements are mounted. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/web/src/components/wellbeing/WellbeingChart.tsx` | Recharts LineChart, two series, ReferenceLine, custom Tooltip, sr-only table | VERIFIED | 174 lines (min 80). Named export WellbeingChart. No stub patterns. All specified features present. |
| `packages/web/src/pages/impact/ImpactDashboard.tsx` | ImpactDashboard integrating WellbeingChart with latest-score summary | VERIFIED | Imports WellbeingChart at l.9. WellbeingSection renders WellbeingChart trajectory={trajectory} at l.362. Latest score summary with band labels and trend arrows at l.344-358. |
| `packages/web/package.json` | recharts ^3.8.0 in dependencies | VERIFIED | "recharts": "^3.8.0" confirmed. Package installed in node_modules. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `WellbeingChart.tsx` | `recharts` | Named imports (LineChart, Line, ReferenceLine, etc.) | WIRED | l.1-11: all eight recharts exports imported and used in JSX. |
| `WellbeingChart.tsx` | `packages/web/src/lib/wellbeing-norms.ts` | swemwbsBand and uclaBand calls | WIRED | l.14: imported. l.41-42: called in tooltip. l.152-153: called in sr-only table rows. |
| `ImpactDashboard.tsx` | `WellbeingChart.tsx` | Import + render with summary.wellbeingTrajectory | WIRED | l.9: imported. l.362: WellbeingChart trajectory={trajectory}. trajectory is summary.wellbeingTrajectory. No useWellbeingHistory — zero extra hooks. |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| WELL-01: Multi-series trend chart | SATISFIED | SWEMWBS + UCLA lines on a single LineChart with all historical check-ins. |
| WELL-02: UK SWEMWBS benchmark line | SATISFIED | ReferenceLine at y=23.6 with amber dashed stroke and "UK mean (23.6)" label. |
| WELL-03: Band labels on scores | SATISFIED | Band labels in tooltip, latest-score summary, and sr-only companion table. |
| WELL-04: Accessible companion table | SATISFIED | table className="sr-only" with caption, scoped headers, five columns. |
| Empty state guard | SATISFIED | trajectory.length === 0 guard returns descriptive paragraph, no empty axes. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| WellbeingChart.tsx | 33 | return null | Info | Expected guard — tooltip render function correctly returns null when inactive. Not a stub. |

No blocker or warning anti-patterns found. The single return null is the correct recharts tooltip guard pattern, not a stub.

### Human Verification Required

#### 1. Chart visual rendering and UCLA line visibility

**Test:** Log two or more wellbeing check-ins and navigate to My Impact.
**Expected:** Two coloured lines (navy SWEMWBS, amber UCLA) plotted over time. Dashed amber reference line at y=23.6 with "UK mean (23.6)" label visible on the right. UCLA line appears in the lower portion of the chart (scale 3-12 vs domain 0-40 — expected per the single-axis decision).
**Why human:** Chart rendering, label position, and visual legibility cannot be verified without a browser.

#### 2. Tooltip band labels on hover

**Test:** Hover over a data point on the chart.
**Expected:** Tooltip card shows date, "SWEMWBS: {n}/35 {band}" and "UCLA: {n}/12 {band}" with the band label coloured per norms.
**Why human:** Tooltip interactivity requires browser rendering.

#### 3. Screen reader table announcement

**Test:** Navigate My Impact with a screen reader (VoiceOver or NVDA).
**Expected:** Screen reader announces the table "Wellbeing scores by date", reads the caption about SWEMWBS and UCLA scales, then reads each row of scores with band labels. Chart SVG is skipped (aria-hidden).
**Why human:** Requires assistive technology.

#### 4. Empty state display

**Test:** Load the impact dashboard for a user with no wellbeing check-ins.
**Expected:** "Your wellbeing journey will appear here after your first check-in." in place of the chart. No empty axes or broken layout.
**Why human:** Requires a test user with no check-in history.

### Gaps Summary

No gaps. All five must-haves verified against the actual codebase.

WellbeingChart.tsx is a complete 174-line implementation — not a stub. It contains both recharts series, the ReferenceLine at 23.6, a band-aware custom tooltip, an empty state guard, and the sr-only companion table.

ImpactDashboard.tsx imports and renders WellbeingChart with live data from useImpactSummary. The latest-score summary above the chart displays numeric values with band labels and trend arrows.

recharts 3.8.0 is installed in packages/web and all named recharts imports resolve. TypeScript compilation passes with zero errors.

No prohibited patterns: no useWellbeingHistory import, no hidden attribute on the companion table, no deprecated recharts props (alwaysShow, isFront).

---

_Verified: 2026-03-16T11:40:16Z_
_Verifier: Claude (gsd-verifier)_
