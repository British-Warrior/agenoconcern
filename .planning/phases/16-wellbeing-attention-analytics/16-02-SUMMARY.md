---
phase: 16-wellbeing-attention-analytics
plan: "02"
subsystem: ui

tags: [react, recharts, tanstack-query, attention-flags, admin-dashboard]

requires:
  - phase: 16-wellbeing-attention-analytics
    provides: "16-01 — wellbeing band analytics and institutional reporting consent"
  - phase: 14-attention-flags
    provides: "attention flag API routes, AttentionDashboard page with active/history tabs"

provides:
  - "GET /api/admin/attention/trend — 12-week ISO-week series with direction and activeCount"
  - "AttentionTrendChart component — recharts BarChart with sparse data notice"
  - "TrendIndicator — active flag count + direction arrow displayed above dashboard tabs"
  - "Trends third tab in AttentionDashboard showing weekly flag volume chart"

affects:
  - future-reporting
  - institution-portal

tech-stack:
  added: []
  patterns:
    - "ISO week label formatting: '2026-W12' → 'W12' via regex in chart component"
    - "TrendIndicator renders only when trend data is loaded (returns null otherwise)"
    - "Sparse data notice shown inline above chart when total flags < 3"

key-files:
  created:
    - packages/web/src/components/attention/AttentionTrendChart.tsx
  modified:
    - packages/web/src/pages/admin/AttentionDashboard.tsx
    - packages/server/src/routes/admin/attention.ts  # Task 1 (fc992ce)

key-decisions:
  - "Bar fill colour #1a1d2e (navy/primary-800) for visual consistency with existing UI palette"
  - "Sparse notice threshold: < 3 total flags across the period (not < 3 weeks)"
  - "TrendIndicator placed between header and tabs (always visible regardless of active tab)"

patterns-established:
  - "Recharts Tooltip formatter uses untyped value to avoid ValueType | undefined conflict"

duration: 20min
completed: 2026-03-26
---

# Phase 16 Plan 02: Attention Trend Chart Summary

**Recharts BarChart for weekly attention flag volume wired into AttentionDashboard with a TrendIndicator and new Trends tab**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-26
- **Completed:** 2026-03-26
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- GET /api/admin/attention/trend server route returning 12-week ISO-week series, direction, and activeCount (Task 1 — fc992ce)
- AttentionTrendChart component with recharts BarChart, week label formatting, empty/sparse state handling
- TrendIndicator above tabs showing "{N} active flags {arrow} {Direction}"
- Trends third tab in AttentionDashboard rendering AttentionTrends section

## Task Commits

1. **Task 1: GET /attention/trend endpoint** — `fc992ce` (feat)
2. **Task 2: AttentionTrendChart + dashboard integration** — `7b74cb8` (feat)

## Files Created/Modified

- `packages/web/src/components/attention/AttentionTrendChart.tsx` — recharts BarChart, ISO week label formatter, sparse notice
- `packages/web/src/pages/admin/AttentionDashboard.tsx` — TrendIndicator, AttentionTrends section, Trends tab, tab state extended
- `packages/server/src/routes/admin/attention.ts` — trend route (Task 1)

## Decisions Made

- Bar fill #1a1d2e (navy) — matches primary-800 used across the admin UI
- Sparse data notice triggered when total flags in the period < 3 (not per-week count)
- TrendIndicator is always visible above the tabs, not scoped to the Trends tab

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Recharts Tooltip formatter type error**
- **Found during:** Task 2 (AttentionTrendChart.tsx)
- **Issue:** `formatter={(value: number) => [value, "Flags"]}` failed TypeScript — Recharts types `value` as `ValueType | undefined`
- **Fix:** Removed the explicit `number` annotation, let inference handle `ValueType`
- **Files modified:** `packages/web/src/components/attention/AttentionTrendChart.tsx`
- **Verification:** `tsc --noEmit` passes clean
- **Committed in:** `7b74cb8` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — type bug)
**Impact on plan:** One-line type annotation fix, no scope change.

## Issues Encountered

None beyond the Tooltip formatter type annotation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 16 is complete. All attention flag analytics (flags, history, trend) are wired end-to-end.
- Phase 17 (institution portal or next planned phase) can build on the attention infrastructure.
- Blockers carried forward: SWEMWBS commercial licence confirmation, k-anonymity threshold stakeholder decision.

## Self-Check: PASSED

- AttentionTrendChart.tsx: FOUND
- AttentionDashboard.tsx: FOUND
- 16-02-SUMMARY.md: FOUND
- Commit 7b74cb8: FOUND
- Commit fc992ce: FOUND

---
*Phase: 16-wellbeing-attention-analytics*
*Completed: 2026-03-26*
