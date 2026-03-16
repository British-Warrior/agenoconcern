---
phase: 07-ux-fixes
plan: 02
subsystem: ui
tags: [react, dashboard, wellbeing, uk-norms, swemwbs, ucla]

# Dependency graph
requires:
  - phase: 05-payments-and-impact
    provides: useImpactSummary hook and ImpactSummary type
  - phase: 04-circles-and-collaboration
    provides: useMyCircles hook and CircleListItem type
  - phase: 06-wellbeing-notifications-and-pwa
    provides: useWellbeingDue hook and wellbeing check-in flow
provides:
  - Dashboard with 5 live summary cards (active circles, open matches, earnings, hours, wellbeing status)
  - wellbeing-norms.ts with SWEMWBS/UCLA UK norm band classification
  - WellbeingSection with score/max, colour-coded bands, and trend arrows
affects: [08-charts-and-visualisation, any future wellbeing reporting]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Norm band classification: score -> {label, color, bg} lookup via threshold functions"
    - "Single isLoading gate across multiple queries prevents multiple spinners"
    - "SummaryCard as Link: wrap entire card in react-router Link with no-underline for clickable cards"

key-files:
  created:
    - packages/web/src/lib/wellbeing-norms.ts
  modified:
    - packages/web/src/pages/Dashboard.tsx
    - packages/web/src/pages/impact/ImpactDashboard.tsx

key-decisions:
  - "Used Intl.NumberFormat for GBP currency formatting (consistent with ImpactDashboard)"
  - "Combined isLoading from all three queries (wellbeing, impact, circles) into one skeleton state"
  - "Trend arrows for UCLA are inverted (down=green) vs SWEMWBS (up=green) to reflect domain semantics"
  - "No charting library added — Phase 8 scope"

patterns-established:
  - "wellbeing-norms.ts: single source of truth for UK norm thresholds, reusable by any component"
  - "SummaryCard: consistent card pattern with hover affordance for navigable summary data"

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 7 Plan 02: Dashboard Live Data and Wellbeing Norm Bands Summary

**Dashboard enriched with 5 live summary cards from 3 hooks; WellbeingSection now shows score/max, UK-norm colour bands, and trend direction arrows**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-16T00:00:00Z
- **Completed:** 2026-03-16T00:15:00Z
- **Tasks:** 2 of 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `wellbeing-norms.ts` with `swemwbsBand`, `uclaBand`, `trendDirection` exports per UK norms
- Rewrote Dashboard with 5 navigable summary cards: active circles, open matches, earnings, hours contributed, wellbeing status
- Updated `WellbeingSection` in ImpactDashboard to show `{score}/35` and `{score}/12` with coloured band labels and trend arrows

## Task Commits

Each task was committed atomically:

1. **Task 1: Create wellbeing norms utility and enrich Dashboard with summary cards** - `f7ca3ac` (feat)
2. **Task 2: Add colour bands, score/max, and trend to WellbeingSection** - `b9610a6` (feat)

## Files Created/Modified

- `packages/web/src/lib/wellbeing-norms.ts` - UK norm band classification for SWEMWBS (7-35) and UCLA (3-12); exports swemwbsBand, uclaBand, trendDirection
- `packages/web/src/pages/Dashboard.tsx` - Rewritten with 5 SummaryCard components, single loading skeleton gate across impact/circles/wellbeing queries
- `packages/web/src/pages/impact/ImpactDashboard.tsx` - WellbeingSection enriched with score/max, band colour labels, trend arrows, and norm range helper text

## Decisions Made

- Combined `isLoading` from all three queries into one boolean to render a single skeleton grid, preventing multiple independent spinners
- Trend direction for UCLA is semantically inverted (down=green, up=red) because lower UCLA = less loneliness; explicit comment in code
- No charting library introduced — deferred to Phase 8 per plan constraint

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript compiled cleanly on first attempt for both tasks.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard summary cards provide the activity overview users need on first load (UX-02 satisfied)
- WellbeingSection now contextualises scores with UK norms (UX-03 satisfied)
- `wellbeing-norms.ts` is ready for reuse in Phase 8 chart annotations
- No blockers for Phase 7 Plan 03

---
*Phase: 07-ux-fixes*
*Completed: 2026-03-16*
