# Phase 8: Wellbeing Visualisation - Research

**Researched:** 2026-03-16
**Domain:** Recharts multi-series LineChart with benchmark line, accessible data table, React/TypeScript
**Confidence:** HIGH

## Summary

Phase 8 replaces the existing plain-text `WellbeingSection` in `ImpactDashboard.tsx` with an interactive recharts line chart. The chart must show SWEMWBS and UCLA scores across all historical check-ins as two series, plus a horizontal `ReferenceLine` at 23.6 for the UK SWEMWBS population mean. Each score on the page must display its band label. An accessible `<table>` of the same data must be present for screen readers.

Recharts is not yet installed in the project — it must be added. Current npm-latest is **3.8.0**. Recharts 3.x is the target because it is the current release; version 2.x would be a legacy pin with no benefit. In recharts 3.x, `accessibilityLayer` defaults to `true` (it was opt-in in 2.x), which gives keyboard navigation and ARIA labels out of the box, but the recharts wiki confirms recharts is not fully accessible alone — a companion `<table>` is still required for WELL-03.

The existing codebase is a React 19 / Vite / TanStack Query v5 / Tailwind CSS 4 SPA. No routing changes, no new API endpoints, and no new TanStack Query hooks are needed — the wellbeing trajectory data already comes back ordered oldest-first from two existing sources: `ImpactSummary.wellbeingTrajectory` (via `useImpactSummary`) and `useWellbeingHistory`. The impact dashboard already uses `useImpactSummary`, so no new hook import is required for Phase 8.

**Primary recommendation:** Install `recharts@^3.8.0`, replace `WellbeingSection` in `ImpactDashboard.tsx` with a `WellbeingChart` component using `ResponsiveContainer > LineChart` with two `<Line>` series and one `<ReferenceLine y={23.6}>`, and add a `sr-only` companion `<table>` after the chart. Reuse `wellbeing-norms.ts` for band labels.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.0 | Line chart rendering, ReferenceLine, ResponsiveContainer | Specified by requirements; current stable release |
| React | ^19.0.0 | Already installed | Project foundation |
| TanStack Query | ^5.62.0 | Already installed | Data fetching — `useImpactSummary` provides trajectory |
| Tailwind CSS | ^4.0.0 | Already installed | All layout and color utilities including `sr-only` |

### Supporting (already installed, no additions)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wellbeing-norms.ts | N/A (internal) | Band labels for SWEMWBS and UCLA scores | Score annotation in chart tooltip and companion table |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts 3.x | recharts 2.x | 2.x is legacy; 3.x has `accessibilityLayer` on by default and is actively maintained |
| recharts | visx / nivo | Far heavier and more complex; requirements explicitly specify recharts |
| recharts | Chart.js | Different paradigm (canvas vs SVG); recharts is specified |

**Installation:**
```bash
cd packages/web && npm install recharts@^3.8.0
```

## Architecture Patterns

### Relevant Project Structure
```
packages/web/src/
├── lib/
│   └── wellbeing-norms.ts        # Already exists — swemwbsBand, uclaBand, SWEMWBS_NORMS, UCLA_NORMS
├── pages/
│   └── impact/
│       └── ImpactDashboard.tsx   # Replace WellbeingSection here
└── components/
    └── wellbeing/
        └── WellbeingChart.tsx    # NEW — extracted chart component
```

The cleanest approach is to extract `WellbeingChart` into `components/wellbeing/WellbeingChart.tsx` and replace `WellbeingSection` in `ImpactDashboard.tsx` with an import of it. This follows the existing pattern (e.g., `WellbeingForm.tsx` lives in `components/wellbeing/`).

### Pattern 1: ResponsiveContainer + LineChart Composition

**What:** Wrap `LineChart` in `ResponsiveContainer` so the chart fills its parent width.
**When to use:** Always — never hard-code pixel widths for responsive layouts.

```typescript
// Source: recharts.github.io/en-US/api/LineChart (verified 2026-03-16)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// Parent must have an explicit height (e.g., className="h-72")
<ResponsiveContainer width="100%" height="100%">
  <LineChart
    data={chartData}
    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
  >
    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
    <YAxis domain={[0, 40]} tick={{ fontSize: 12 }} />
    <Tooltip />
    <Legend />
    <ReferenceLine
      y={23.6}
      stroke="#f59e0b"
      strokeDasharray="4 4"
      label={{ value: "UK mean (23.6)", position: "right", fontSize: 11 }}
    />
    <Line
      type="monotone"
      dataKey="swemwbs"
      name="SWEMWBS"
      stroke="#1e3a5f"
      strokeWidth={2}
      dot={{ r: 4 }}
    />
    <Line
      type="monotone"
      dataKey="ucla"
      name="UCLA"
      stroke="#d97706"
      strokeWidth={2}
      dot={{ r: 4 }}
    />
  </LineChart>
</ResponsiveContainer>
```

### Pattern 2: Data Transformation for Chart

**What:** `WellbeingTrajectoryPoint[]` (from the API) must be mapped to recharts data format where each object has all series keys.
**When to use:** Always — recharts requires a flat data array with one object per x-axis point.

```typescript
// Source: codebase (packages/shared/src/types/wellbeing.ts) + recharts docs pattern
interface ChartDatum {
  date: string;        // x-axis label
  swemwbs: number;     // SWEMWBS series value (dataKey="swemwbs")
  ucla: number;        // UCLA series value (dataKey="ucla")
  // raw values retained for companion table
  completedAt: string;
}

function toChartData(trajectory: WellbeingTrajectoryPoint[]): ChartDatum[] {
  return trajectory.map((p) => ({
    date: new Date(p.completedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    swemwbs: p.wemwbsScore,
    ucla: p.uclaScore,
    completedAt: p.completedAt,
  }));
}
```

Note: trajectory is already ordered oldest-first (ASC `completedAt`) from both API endpoints — no sort needed.

### Pattern 3: Companion Accessible Table (WELL-03)

**What:** A `<table>` containing the same data as the chart, hidden visually with `sr-only`, present for screen reader users.
**When to use:** Mandatory — recharts SVG charts are not fully screen-reader accessible. The `accessibilityLayer` prop adds keyboard navigation but cannot convey the raw data values to screen readers. A companion table is the established WCAG pattern for this.

```typescript
// Source: W3C WAI Tables Tutorial, USWDS data visualisation guidelines
<table className="sr-only" aria-label="Wellbeing scores by date">
  <caption>Wellbeing trajectory data — SWEMWBS and UCLA scores per check-in</caption>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">SWEMWBS score (out of 35)</th>
      <th scope="col">SWEMWBS band</th>
      <th scope="col">UCLA score (out of 12)</th>
      <th scope="col">UCLA band</th>
    </tr>
  </thead>
  <tbody>
    {trajectory.map((p) => {
      const sw = swemwbsBand(p.wemwbsScore);
      const uc = uclaBand(p.uclaScore);
      return (
        <tr key={p.completedAt}>
          <td>{formatDate(p.completedAt)}</td>
          <td>{p.wemwbsScore}</td>
          <td>{sw.label}</td>
          <td>{p.uclaScore}</td>
          <td>{uc.label}</td>
        </tr>
      );
    })}
  </tbody>
</table>
```

### Pattern 4: YAxis Domain and SWEMWBS Benchmark

**What:** The SWEMWBS benchmark line sits at y=23.6 (UK population mean, per SWEMWBS scoring documentation). The Y-axis domain must accommodate both series. SWEMWBS range is 7–35; UCLA range is 3–12. Because these are plotted on the same Y axis, use `domain={[0, 40]}` (or `['auto', 'auto']` for automatic fitting).
**When to use:** Benchmark line only applies to the SWEMWBS series. Label it clearly. UCLA does not have a standardised UK population mean specified in requirements — only the SWEMWBS mean is required (WELL-02).

**Important:** When SWEMWBS and UCLA are on the same Y axis, the UCLA line will appear compressed at the bottom of the chart (scale 3–12 vs 7–35). Consider using `yAxisId` with a dual-axis approach if readability is poor. A single axis is simpler; a dual axis is more readable but adds complexity. The planner should decide; document this as a decision point.

### Pattern 5: Chart Area Height Constraint

**What:** `ResponsiveContainer height="100%"` requires the parent element to have a defined height. Without it, the chart collapses to 0px.
**When to use:** Always wrap the `ResponsiveContainer` in a div with explicit height class.

```typescript
// Correct
<div className="h-72">
  <ResponsiveContainer width="100%" height="100%">
    ...
  </ResponsiveContainer>
</div>

// Also acceptable
<ResponsiveContainer width="100%" height={288}>
  ...
</ResponsiveContainer>
```

### Anti-Patterns to Avoid

- **Rendering chart when trajectory is empty:** Guard with `if (trajectory.length === 0)` and return the existing "no data yet" empty state — recharts will not render a meaningful chart with zero data points.
- **Using recharts for a single data point:** A line chart with one point has no trend. Guard with `if (trajectory.length < 2)` and show a static score display instead of a chart (or show the chart with a dot only, which is valid).
- **Hard-coding pixel widths on LineChart:** Always use `ResponsiveContainer` — the ImpactDashboard is in a responsive grid (`lg:col-span-2`) and must work at all viewport widths.
- **Ignoring the ref structure change in recharts 3.x:** The `ref.current.current` pattern from 2.x is removed. Do not use chart refs unless strictly necessary; for this phase they are not needed.
- **Placing UCLA on same axis as SWEMWBS without acknowledging scale mismatch:** UCLA (3–12) will appear flat compared to SWEMWBS (7–35) on the same axis. Use `domain={[0, 40]}` and acknowledge this in code comments, or use dual Y axes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SVG line chart rendering | Custom SVG paths + D3 | recharts `LineChart` + `Line` | D3 is complex; recharts handles scaling, axes, tooltips, responsiveness, and accessibility |
| Responsive chart sizing | CSS width hacks on SVG | `ResponsiveContainer width="100%"` | SVG doesn't respond to CSS width the same way; recharts handles this |
| Benchmark reference line | Custom SVG line overlay | recharts `ReferenceLine` | Recharts calculates pixel position from data domain automatically |
| Colour band tooltip | Custom popup on hover | recharts `Tooltip` with custom `content` prop | Recharts handles show/hide and position; only the content needs customising |
| Accessible data table | Nothing (just the chart) | `<table className="sr-only">` with `<caption>` | SVG charts are not readable by screen readers without a data table |

**Key insight:** Recharts handles the entire SVG rendering pipeline — do not attempt to enhance it with direct DOM manipulation or D3 utilities.

## Common Pitfalls

### Pitfall 1: ResponsiveContainer Height Collapse
**What goes wrong:** Chart renders as a 0-height element.
**Why it happens:** `height="100%"` on `ResponsiveContainer` requires the parent div to have an explicit height. If the parent has no height, the container collapses.
**How to avoid:** Wrap in `<div className="h-72">` (288px) or use `<ResponsiveContainer height={288}>` directly.
**Warning signs:** Chart area is invisible; no console errors but no chart rendered.

### Pitfall 2: Recharts 3.x `accessibilityLayer` Default
**What goes wrong:** Developer adds `accessibilityLayer={false}` to silence a console warning, inadvertently removing ARIA labels.
**Why it happens:** In recharts 3.x `accessibilityLayer` defaults to `true`. No action needed. Explicitly setting it `false` removes accessibility features.
**How to avoid:** Do not set `accessibilityLayer` prop at all — the default is correct. Only override if there is a specific reason.
**Warning signs:** VoiceOver/NVDA cannot navigate the chart via arrow keys.

### Pitfall 3: Y-Axis Scale Mismatch Between Series
**What goes wrong:** UCLA scores (3–12) are barely visible on the same Y axis as SWEMWBS scores (7–35).
**Why it happens:** The Y axis domain spans the full SWEMWBS range; UCLA values occupy only the bottom quarter.
**How to avoid:** Either (a) use `domain={[0, 40]}` with a note in the legend that scales differ, or (b) add a second Y axis with `yAxisId="ucla"` for the UCLA line. Option (b) is more readable but adds implementation complexity.
**Warning signs:** UCLA line appears as a nearly flat line near the bottom of the chart.

### Pitfall 4: Missing Empty State Guard
**What goes wrong:** Recharts renders an empty chart (just axes, no data) when `trajectory.length === 0`.
**Why it happens:** Recharts does not render a "no data" message — it just draws empty axes.
**How to avoid:** Preserve the existing empty state: `if (trajectory.length === 0) return <EmptyWellbeingState />`.
**Warning signs:** Blank chart area with axes when user has no check-ins.

### Pitfall 5: Dual Data Sources for Trajectory
**What goes wrong:** Developer uses `useWellbeingHistory` (standalone hook) instead of `summary.wellbeingTrajectory` from `useImpactSummary`, creating an unnecessary extra network request.
**Why it happens:** Both `useImpactSummary` and `useWellbeingHistory` return the same `WellbeingTrajectoryPoint[]` ordered oldest-first. ImpactDashboard already uses `useImpactSummary`.
**How to avoid:** Use `summary.wellbeingTrajectory` from the existing `useImpactSummary` call — zero new hooks needed.
**Warning signs:** Two separate loading states; a `useWellbeingHistory` import in ImpactDashboard.

### Pitfall 6: Companion Table Not Actually Hidden
**What goes wrong:** The `<table>` is `hidden` (display:none) instead of `sr-only`, making it invisible to both sighted users AND screen readers.
**Why it happens:** Developer confuses `hidden` attribute (removes from accessibility tree) with `sr-only` class (visually hidden, still accessible).
**How to avoid:** Use `className="sr-only"` (Tailwind utility, already used in the codebase). Never use `hidden` or `display:none` on the companion table.
**Warning signs:** Screen reader does not announce table content.

### Pitfall 7: recharts Package Installed in Wrong Workspace
**What goes wrong:** `npm install recharts` runs from the monorepo root instead of `packages/web`.
**Why it happens:** The project is a monorepo; recharts is only needed in the web package.
**How to avoid:** Run `cd packages/web && npm install recharts@^3.8.0` or use `npm install recharts@^3.8.0 --workspace=packages/web`.
**Warning signs:** `recharts` appears in root `package.json` instead of `packages/web/package.json`.

## Code Examples

Verified patterns from official sources and codebase inspection:

### Complete WellbeingChart Component Skeleton

```typescript
// Source: recharts docs (verified 2026-03-16) + codebase patterns
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { WellbeingTrajectoryPoint } from "@indomitable-unity/shared";
import { swemwbsBand, uclaBand } from "../../lib/wellbeing-norms.js";

interface Props {
  trajectory: WellbeingTrajectoryPoint[];
}

// UK SWEMWBS population mean (source: SWEMWBS scoring guide)
const SWEMWBS_UK_MEAN = 23.6;

export function WellbeingChart({ trajectory }: Props) {
  if (trajectory.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Your wellbeing journey will appear here after your first check-in.
      </p>
    );
  }

  const chartData = trajectory.map((p) => ({
    date: new Date(p.completedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }),
    swemwbs: p.wemwbsScore,
    ucla: p.uclaScore,
    completedAt: p.completedAt,
  }));

  return (
    <>
      {/* Chart — aria-hidden because companion table provides data to screen readers */}
      <div className="h-72" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 40]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <ReferenceLine
              y={SWEMWBS_UK_MEAN}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{
                value: `UK mean (${SWEMWBS_UK_MEAN})`,
                position: "right",
                fontSize: 10,
                fill: "#d97706",
              }}
            />
            <Line
              type="monotone"
              dataKey="swemwbs"
              name="SWEMWBS"
              stroke="#1e3a5f"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="ucla"
              name="UCLA (loneliness)"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Companion accessible table — visually hidden, screen reader only */}
      <table className="sr-only" aria-label="Wellbeing scores by date">
        <caption>
          Wellbeing trajectory: SWEMWBS (mental wellbeing, higher is better)
          and UCLA (loneliness, lower is better) scores per check-in
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">SWEMWBS score (out of 35)</th>
            <th scope="col">SWEMWBS band</th>
            <th scope="col">UCLA score (out of 12)</th>
            <th scope="col">UCLA band</th>
          </tr>
        </thead>
        <tbody>
          {trajectory.map((p) => {
            const sw = swemwbsBand(p.wemwbsScore);
            const uc = uclaBand(p.uclaScore);
            return (
              <tr key={p.completedAt}>
                <td>
                  {new Date(p.completedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td>{p.wemwbsScore}</td>
                <td>{sw.label}</td>
                <td>{p.uclaScore}</td>
                <td>{uc.label}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
```

### Band Label Display (Score Cards)

WELL-03 also requires that each score displays its band label "alongside the numeric value" — this applies to the score display above or below the chart (not just in the table). Reuse the existing pattern from `WellbeingSection`:

```typescript
// Source: ImpactDashboard.tsx (existing pattern from Phase 7)
const swBand = swemwbsBand(latestPoint.wemwbsScore);
<span className={`text-xs font-semibold ${swBand.color}`}>{swBand.label}</span>
```

### Recharts Import — Named Exports from recharts

```typescript
// Source: recharts npm package (3.x)
// All are named exports from the top-level "recharts" package
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `WellbeingSection` plain text list of scores | recharts `LineChart` with two series and benchmark | Phase 8 | Trend visible; funder-ready |
| No benchmark reference | `ReferenceLine y={23.6}` for UK SWEMWBS mean | Phase 8 | Contextualises scores against population |
| No accessible table | `<table className="sr-only">` companion | Phase 8 | WELL-03 / WCAG 1.1.1 |
| recharts not installed | recharts ^3.8.0 installed | Phase 8 | First chart library in project |
| `accessibilityLayer` opt-in (2.x) | `accessibilityLayer` defaults to `true` (3.x) | recharts 3.0 | Keyboard nav and ARIA labels work by default |

**Deprecated in recharts 3.x:**
- `alwaysShow` prop on `ReferenceLine`: removed; do not use
- `isFront` prop on `ReferenceLine`: removed; do not use
- `ref.current.current` pattern on `ResponsiveContainer`: removed; avoid chart refs

## Open Questions

1. **Single Y axis vs dual Y axes for SWEMWBS and UCLA**
   - What we know: SWEMWBS range 7–35; UCLA range 3–12; both on same axis will compress UCLA to bottom quarter
   - What's unclear: Whether the product owner considers this acceptable or whether dual axes are needed
   - Recommendation: Implement with a single axis first (simpler, fewer accessibility concerns with dual axes); annotate in code that dual axes can be added if readability is a concern. A single axis with `domain={[0, 40]}` and distinct line colours is sufficient for the stated goal.

2. **Tooltip custom content for band labels**
   - What we know: Recharts `Tooltip` accepts a `content` prop for custom rendering
   - What's unclear: Whether the tooltip should show just the raw score or also the band label
   - Recommendation: Show band label in tooltip — improves interpretability and aligns with the "interpretable" goal. Use `content` prop with a custom component that calls `swemwbsBand` and `uclaBand`.

3. **UCLA score range discrepancy**
   - What we know: `wellbeing-norms.ts` documents UCLA range as 3–12 (comment says "UCLA 3-item: range 3-12"), but WELL-02 context says "UCLA scores range 3-9"
   - What's unclear: The correct maximum. The 3-item UCLA scale with 1–4 item scoring gives 3–12; with 1–3 item scoring gives 3–9. The server schema will be the source of truth.
   - Recommendation: Check the server-side check-in validation and the `uclaItems` type in `WellbeingCheckinInput` (`[number, number, number]` with each item 1–4 = max 12). `wellbeing-norms.ts` uses max 12 — treat that as authoritative.

## Sources

### Primary (HIGH confidence)
- Codebase direct inspection — `packages/web/src/pages/impact/ImpactDashboard.tsx`, `packages/web/src/lib/wellbeing-norms.ts`, `packages/shared/src/types/wellbeing.ts`, `packages/shared/src/types/impact.ts`, `packages/web/src/hooks/useImpact.ts`, `packages/web/src/hooks/useWellbeing.ts`, `packages/server/src/routes/impact.ts`, `packages/server/src/routes/wellbeing.ts`
- recharts official API docs (recharts.github.io) — LineChart props, ReferenceLine props, ResponsiveContainer
- recharts GitHub wiki — 3.0 migration guide (breaking changes confirmed), accessibility wiki

### Secondary (MEDIUM confidence)
- npm registry — recharts current version 3.8.0 (verified via `npm view recharts version`)
- W3C WAI Tables Tutorial — companion table pattern for accessible charts
- USWDS data visualisation component — `sr-only` table pattern for chart accessibility
- SWEMWBS UK population mean 23.6 — from prior phase research (Phase 7 07-RESEARCH.md), sourced from SWEMWBS/WEMWBS consortium published norms

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — recharts version verified from npm registry; imports verified from official docs
- Architecture: HIGH — all patterns verified against existing codebase and recharts docs
- Pitfalls: HIGH for recharts-specific issues (verified from migration guide and docs); MEDIUM for dual-axis decision (product preference, not technical uncertainty)
- Accessibility table pattern: HIGH — W3C WAI and USWDS are authoritative sources; `sr-only` already used in codebase

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (recharts is actively maintained; recheck if recharts version bumps beyond 3.x)
