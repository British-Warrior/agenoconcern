---
phase: 08-wellbeing-visualisation
plan: "01"
subsystem: web-ui
tags: [recharts, wellbeing, chart, accessibility, impact-dashboard]
dependency_graph:
  requires:
    - packages/web/src/lib/wellbeing-norms.ts
    - packages/shared/src/types/wellbeing.ts (WellbeingTrajectoryPoint)
    - packages/web/src/hooks/useImpact.ts (useImpactSummary)
  provides:
    - packages/web/src/components/wellbeing/WellbeingChart.tsx
    - recharts LineChart on ImpactDashboard
  affects:
    - packages/web/src/pages/impact/ImpactDashboard.tsx
tech_stack:
  added:
    - recharts@^3.8.0 (LineChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, Legend)
  patterns:
    - ResponsiveContainer wrapping LineChart for responsive chart sizing
    - TooltipContentProps with render function for custom tooltip (recharts 3.x API)
    - sr-only companion table for chart accessibility (WCAG 1.1.1 / WELL-03)
key_files:
  created:
    - packages/web/src/components/wellbeing/WellbeingChart.tsx
  modified:
    - packages/web/src/pages/impact/ImpactDashboard.tsx
    - packages/web/package.json
    - pnpm-lock.yaml
decisions:
  - "recharts 3.x TooltipContentProps (not TooltipProps) is the correct type for custom tooltip content — payload/active/label are in TooltipContentProps which omits PropertiesReadFromContext from TooltipProps"
  - "Tooltip content prop requires a render function (not JSX element) to satisfy recharts 3.x type checker"
  - "WellbeingSection wrapper retained as thin shell — implementation body completely replaced with WellbeingChart integration; old plain-text list removed"
  - "Pre-existing vite-plugin-pwa navigateFallback build error confirmed unrelated to Phase 8 — TypeScript compilation and Vite bundle both succeed cleanly"
metrics:
  duration: 4 min
  completed: 2026-03-16
---

# Phase 8 Plan 01: Wellbeing Visualisation Summary

**One-liner:** Recharts multi-series LineChart (SWEMWBS + UCLA) with UK population benchmark ReferenceLine at 23.6, custom band-label tooltip, and sr-only accessible data table replacing plain-text wellbeing list on ImpactDashboard.

## What Was Built

### WellbeingChart component (`packages/web/src/components/wellbeing/WellbeingChart.tsx`)

A new chart component (174 lines) providing:

- **Empty state guard:** Returns a muted paragraph when `trajectory.length === 0` — no empty chart axes.
- **Recharts LineChart:** Two series — SWEMWBS (navy `#1e3a5f`) and UCLA loneliness (amber `#f59e0b`) — plotted on a single Y axis with `domain={[0, 40]}`.
- **ReferenceLine:** Dashed horizontal line at `y=23.6` (UK SWEMWBS population mean) with amber label "UK mean (23.6)" positioned right.
- **Custom Tooltip:** Renders score + band label for each series on hover using `swemwbsBand` and `uclaBand` from `wellbeing-norms.ts`.
- **sr-only companion table:** Visually hidden `<table aria-label="Wellbeing scores by date">` with `<caption>` explaining both scales, five columns (date, SWEMWBS score, SWEMWBS band, UCLA score, UCLA band), one row per trajectory point. Satisfies WCAG 1.1.1 / WELL-03.

### ImpactDashboard integration (`packages/web/src/pages/impact/ImpactDashboard.tsx`)

- Imports `WellbeingChart` from `../../components/wellbeing/WellbeingChart.js`.
- `WellbeingSection` body fully replaced: old plain-text list removed, replaced with:
  - Latest score summary (SWEMWBS score/band/trend arrow + UCLA score/band/trend arrow) shown when data exists.
  - `<WellbeingChart trajectory={trajectory} />` for chart, empty state, and accessible table.
  - Existing explanatory footer note retained.
- Zero new hooks — all data from existing `useImpactSummary` call.

## Commits

| Hash | Message |
|------|---------|
| `3d9f594` | feat(08-01): install recharts and create WellbeingChart component |
| `2b0e218` | feat(08-01): integrate WellbeingChart into ImpactDashboard |

## Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` in packages/web | PASS |
| `WellbeingChart` imported and rendered in ImpactDashboard | PASS |
| `ReferenceLine` at y=23.6 present | PASS |
| `sr-only` companion table present | PASS |
| `useWellbeingHistory` absent from ImpactDashboard | PASS |
| recharts in packages/web/package.json | PASS |
| Old plain-text trajectory list removed | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] recharts 3.x TooltipContentProps type — correct type for custom tooltip content**
- **Found during:** Task 1 (TypeScript check)
- **Issue:** Plan specified `TooltipProps<number, string>` for the custom tooltip function, but in recharts 3.x `TooltipProps` omits `active`, `payload`, and `label` via `PropertiesReadFromContext`. The correct type is `TooltipContentProps<number, string>` which includes those props.
- **Fix:** Changed import to `TooltipContentProps` and updated function signature. Used render function `(props) => <WellbeingTooltip {...} />` for the `content` prop to satisfy recharts 3.x type checker.
- **Files modified:** `packages/web/src/components/wellbeing/WellbeingChart.tsx`
- **Commit:** `3d9f594`

**2. [Rule 3 - Blocking] pnpm monorepo — install command**
- **Found during:** Task 1
- **Issue:** Plan specified `cd packages/web && npm install recharts@^3.8.0` but project uses pnpm with workspace protocol. npm rejected with `EUNSUPPORTEDPROTOCOL`.
- **Fix:** Used `pnpm --filter @indomitable-unity/web add recharts@^3.8.0` from repo root.
- **Files modified:** None (install process only)
- **Commit:** `3d9f594`

### Pre-existing Issues (Not Deviations)

**Pre-existing vite-plugin-pwa build error:** `[InjectManifest] 'navigateFallback' property is not expected to be here` — confirmed present on baseline before Phase 8 changes. The TypeScript compilation and Vite bundle both succeed cleanly; only the PWA InjectManifest post-processing step fails. This is not introduced by Phase 8.

## Self-Check: PASSED

- `packages/web/src/components/wellbeing/WellbeingChart.tsx` — FOUND (174 lines, above 80 min)
- `packages/web/src/pages/impact/ImpactDashboard.tsx` — FOUND (WellbeingChart imported and rendered)
- Commit `3d9f594` — FOUND
- Commit `2b0e218` — FOUND
