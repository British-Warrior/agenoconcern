# Phase 16: Wellbeing & Attention Analytics - Research

**Researched:** 2026-03-25
**Domain:** SWEMWBS Rasch scoring, k-anonymity suppression, PostgreSQL aggregate queries, pdfkit extension, recharts BarChart/LineChart
**Confidence:** HIGH for codebase patterns; MEDIUM for SWEMWBS band thresholds; LOW for Rasch lookup table (registration-gated)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Wellbeing band presentation: text label only in the PDF stats section — "Wellbeing: Typical"
- Use plain language "Wellbeing Band" — do NOT name the instrument (no "SWEMWBS" branding)
- Band labels: Low, Typical, High
- Consent collected at the next wellbeing check-in — add institutional_reporting consent checkbox
- No in-app notice — privacy policy only
- Existing contributors NOT grandfathered — must opt in at next check-in
- Trend indicator: inline next to flag count — "3 active flags ↑ Increasing"
- Arrow + word format

### Claude's Discretion
- k-anonymity threshold (k=5 vs k=10)
- Band colour scheme for text label
- Wellbeing suppression message wording
- Opt-out data handling (immediate vs next cycle)
- Trend tone/framing
- Trend comparison period (4 vs 8 weeks)
- Trend chart access (new tab vs click-through)
- Chart time window, sparse data, chart type (bar vs line)

### Deferred Ideas (OUT OF SCOPE)
None stated explicitly — all discretion items are in scope for research and recommendation.
</user_constraints>

---

## Summary

Phase 16 adds two analytics surfaces to the existing CM toolset: (1) a wellbeing band row in the PDF impact report, and (2) an attention trend indicator and weekly chart on the AttentionDashboard. Both are built on top of the fully-delivered Phase 14 and Phase 15 infrastructure.

The most technically novel part of this phase is the SWEMWBS Rasch transformation. The raw `wemwbs_score` (7-35 integer, already stored in `wellbeing_checkins`) must be converted to a metric score using a 29-row lookup table before band assignment. The lookup table is published by the University of Warwick but is behind a registration wall. The plan must include a task to embed this lookup table verbatim in the codebase; the approximate band thresholds (raw score) are HIGH confidence from peer-reviewed literature, but the exact metric-score lookup values are MEDIUM confidence from secondary sources and must be validated against the official table.

The consent mechanism requires the smallest and most careful schema change of the phase: a new `institutional_reporting` column on the `wellbeing_checkins` table (nullable boolean, default null for pre-Phase-16 rows), populated when a contributor submits a future check-in with the new opt-in checkbox in `WellbeingForm`. No backfill — existing rows are excluded. No in-app notice.

The trend indicator and chart work from `ithink_attention_flags.created_at` — already on the table, no schema changes needed for attention data.

**Primary recommendation:** Implement in three tasks — (1) DB migration + Rasch utility + server wellbeing query, (2) PDF wellbeing row extension, (3) Dashboard trend indicator + chart. Keep the Rasch lookup table as a TypeScript const in a utility file, not a DB table. Use k=5 as the suppression threshold (justified below).

---

## Standard Stack

### Core (no new packages required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.38.x (existing) | New migration, wellbeing consent query | Already the project ORM |
| pdfkit | 0.18.0 (existing) | Extend buildInstitutionReport with wellbeing row | Already delivered in Phase 15 |
| recharts | 3.8.0 (existing) | Weekly attention flag chart | Already used in WellbeingChart.tsx |
| @tanstack/react-query | existing | New admin wellbeing query hook | Already used for all admin data |
| zod | existing | Extend wellbeingCheckinSchema | Already the project validation library |

### No new npm packages needed.

**Drizzle migration command:**
```bash
pnpm --filter @indomitable-unity/server run db:generate
pnpm --filter @indomitable-unity/server run db:migrate
```

---

## Architecture Patterns

### Recommended File Structure (additions only)

```
packages/server/src/
├── db/
│   ├── schema.ts                      # MODIFY: add institutionalReporting column to wellbeingCheckins
│   └── drizzle/0004_phase16_*.sql     # NEW: generated migration
├── lib/
│   └── swemwbs-rasch.ts               # NEW: Rasch lookup table + bandFromMetricScore()
└── routes/
    └── admin.ts                       # MODIFY: add GET /wellbeing/band, GET /attention/trend

packages/shared/src/
└── schemas/
    └── wellbeing.ts                   # MODIFY: add institutionalReporting field

packages/web/src/
├── api/
│   └── attention.ts                  # MODIFY: add getTrendData()
├── hooks/
│   └── useAttention.ts               # MODIFY: add useAttentionTrend()
├── components/
│   └── attention/
│       └── AttentionTrendChart.tsx   # NEW: recharts BarChart for weekly flag counts
└── pages/
    └── admin/
        └── AttentionDashboard.tsx    # MODIFY: add trend indicator pill + chart
```

---

## SWEMWBS Rasch Transformation

### What it is and why it's required

REQUIREMENT WELL-02: "Band derived from Rasch-transformed SWEMWBS metric scores, not raw sums."

The SWEMWBS 7-item scale stores raw sum scores (7-35) in `wemwbs_score`. These have a non-linear response distribution ("column effects" from extreme responses). The Rasch model corrects for this, producing metric scores that are more normally distributed. The official conversion table has 29 rows (one per raw score 7-35) mapping to metric scores in the range approximately 7.0-35.0.

The official conversion table PDF is at:
`https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/using/howto/swemwbs_raw_score_to_metric_score_conversion_table.pdf`

This URL is publicly listed in Scottish Government and other official publications, but may require a Warwick registration login to download. **The plan must include a task where the implementer downloads and embeds the table.** The table has been referenced in peer-reviewed PMC publications (PMC5539899, PMC5376387) but the exact values are not reproduced there.

### Band thresholds (from peer-reviewed literature — MEDIUM confidence)

Source: Taggart et al. (PMC5376387) — "Evaluating and establishing national norms for mental wellbeing using SWEMWBS" (Health Survey for England):

| Band | Cut-off (raw score) | Description |
|------|-------------------|-------------|
| Low | 7 – 19.5 | Below population mean minus 1 SD |
| Typical | 19.6 – 27.4 | Within 1 SD of population mean |
| High | 27.5 – 35 | Above population mean plus 1 SD |

Population parameters: mean = 23.5, SD = 3.9 (UK general population, N = ~9,000).

**Important:** These thresholds apply to **raw scores**, not Rasch metric scores. The Rasch-transformed metric scores have a different distribution. The plan must apply banding to metric scores, not raw scores. Until the exact metric-score thresholds are embedded from the official table, an implementer note should flag this as requiring validation.

**Recommendation for implementation:** Apply banding to metric score using equivalent percentile cut-offs. The Rasch metric scores correlate monotonically with raw scores — the band order is preserved. A practical approach: apply the Rasch transform first, then use the metric-score equivalents of the raw-score band cut-offs as found in the official table.

### Recommended label colours (Claude's Discretion)

The locked labels are "Low", "Typical", "High". For text colour in the PDF (pdfkit hex):
- Low: `#b91c1c` (red-700 equivalent — signals attention)
- Typical: `#d97706` (amber-600 equivalent — neutral-positive)
- High: `#16a34a` (green-600 equivalent — positive)

These match the SWEMWBS_NORMS colour pattern already in `packages/web/src/lib/wellbeing-norms.ts` (using "Average" for what the PDF will call "Typical").

### Implementation pattern

```typescript
// packages/server/src/lib/swemwbs-rasch.ts
// Source: University of Warwick SWEMWBS conversion table
// Implementer: embed the 29 values from the official PDF before committing

// Raw score index: rawScore - 7 = index into this array
// Values below are PLACEHOLDER — replace with official table values before use
const RASCH_METRIC: readonly number[] = [
  // raw 7  8   9   10  11  12  13  14  15  16  17  18  19  20  21
  // raw 22  23  24  25  26  27  28  29  30  31  32  33  34  35
  // TODO: embed 29 values from official Warwick conversion table
];

export function rawToMetric(rawScore: number): number {
  if (rawScore < 7 || rawScore > 35) throw new Error(`SWEMWBS raw score out of range: ${rawScore}`);
  return RASCH_METRIC[rawScore - 7];
}

export type WellbeingBandLabel = "Low" | "Typical" | "High";

export function metricToBand(metricScore: number): WellbeingBandLabel {
  // TODO: thresholds below use raw-score equivalents as approximations
  // Replace with metric-score equivalents from official conversion table
  if (metricScore < 19.6) return "Low";     // approximate — validate against table
  if (metricScore < 27.5) return "Typical"; // approximate — validate against table
  return "High";
}
```

---

## Consent Architecture

### Current state

`wellbeing_checkins` has:
- `consent_record_id` (FK to `consent_records`) — existing per-checkin GDPR consent for health data
- `wemwbs_score` (integer 7-35) — the raw sum, stored per check-in

`consent_records.purpose` currently stores `"wellbeing_checkin"` as a string. There is NO existing `institutional_reporting` consent field on the check-in.

### What Phase 16 adds

Add `institutional_reporting` as a nullable boolean column on `wellbeing_checkins`:
- `NULL` = submitted before Phase 16 (excluded from all wellbeing analytics)
- `false` = contributor explicitly declined at check-in time
- `true` = contributor consented at check-in time

**Why on `wellbeing_checkins`, not `consent_records`:** The consent is per-checkin (a contributor may consent at one check-in, withdraw at a future one). Placing it on `wellbeing_checkins` keeps it co-located with the data it covers, avoids a join for the suppression query, and is the simplest schema change.

### Migration pattern

```sql
-- drizzle/0004_phase16_institutional_reporting.sql (generated by drizzle-kit)
ALTER TABLE "wellbeing_checkins"
  ADD COLUMN "institutional_reporting" boolean;
-- NULL means pre-Phase-16 (excluded), false = declined, true = consented
```

### Drizzle schema change

```typescript
// packages/server/src/db/schema.ts — add to wellbeingCheckins
institutionalReporting: boolean("institutional_reporting"),  // nullable
```

### Server-side consent filter

```typescript
// All wellbeing analytics queries MUST filter:
.where(eq(wellbeingCheckins.institutionalReporting, true))
```

### WellbeingForm change

Add a second opt-in checkbox below the existing GDPR health data consent. It must be:
- Optional (not required to submit the check-in — contributor can decline and still complete)
- Tracked separately from `consentGranted` (which is required for submitting health data)

```typescript
// packages/shared/src/schemas/wellbeing.ts — extend schema
export const wellbeingCheckinSchema = z.object({
  // ... existing fields ...
  institutionalReporting: z.boolean().optional().default(false),
});
```

The server stores this boolean on the `institutional_reporting` column.

---

## k-Anonymity Suppression

### Recommendation: k = 5

**Rationale:**

UK ONS statistical disclosure control guidance uses a minimum cell count of 5 for health survey data suppression (counts below 5 are suppressed or rounded). NHS Digital and public health data organisations commonly use "fewer than 5" as the primary suppression threshold, with "fewer than 10" reserved for abortion/sensitive clinical contexts.

For this application:
- The data is an anonymised band (one of three values), not an individual score
- The audience is a single institution's CM — not public
- The pilot institution size is likely 5-50 contributors
- k=10 would make the feature useless for most pilot institutions during early rollout

**k=5 implementation:**

```typescript
// If consented contributor count < 5, suppress wellbeing band
const consentedCount = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(wellbeingCheckins)
  .innerJoin(contributorInstitutions, ...)
  .where(
    and(
      eq(contributorInstitutions.institutionId, institutionId),
      eq(wellbeingCheckins.institutionalReporting, true),
    ),
  );

if (consentedCount[0].count < 5) {
  return { suppressed: true, reason: "insufficient_consent" };
}
```

### Suppression message wording (Claude's Discretion)

Recommended: **"Wellbeing data not available — fewer than 5 contributors have shared their wellbeing data for this report period."**

This is informative without implying the data exists but is being withheld from the CM.

---

## Attention Trend (ATTN-05 and ATTN-06)

### Trend indicator (ATTN-05)

**What:** Inline indicator next to the active flag count: "3 active flags ↑ Increasing"

**Data source:** `ithink_attention_flags.created_at` — already exists, no schema change needed.

**Trend comparison period (Claude's Discretion):** Recommend **4 weeks** (28-day vs 28-day comparison). Rationale: 8 weeks is too long for the CM to act on — the signal arrives well after the cohort cycle. 4 weeks gives one full comparison period that matches typical iThink check-in cadence.

**Algorithm:**

```
current_period = flags created in last 28 days (inclusive)
previous_period = flags created 28-56 days ago
direction = if current > previous → "Increasing"
            if current < previous → "Decreasing"
            otherwise → "Stable"
```

**Display format (locked):** Arrow + word. Arrow chars:
- Increasing: `↑`
- Stable: `→`
- Decreasing: `↓`

**Trend tone/framing (Claude's Discretion):** Use neutral language — the CM needs to make a judgment call. Do not apply "good/bad" colouring to the trend direction (flags being cleared may cause "Decreasing" even if underlying issues persist). Recommended: all three states display in `text-neutral-700` with no colour coding on the arrow.

### Trend chart (ATTN-06)

**What:** A weekly bar chart of attention flag counts per institution over time.

**Chart type (Claude's Discretion):** Recommend **BarChart** (not LineChart).

Rationale:
- Flag counts are discrete weekly aggregates — bars communicate "count in this week" more naturally than a line connecting points
- WellbeingChart.tsx already uses LineChart for continuous scores — differentiation keeps chart semantics clear
- BarChart is already in the recharts bundle installed in the project (same package, no additional import)

**Chart time window (Claude's Discretion):** Recommend **12 weeks** (3 months), with sparse data handled by showing zero-count bars for weeks with no flags.

**Chart access (Claude's Discretion):** Recommend **inline on AttentionDashboard** (not a new tab). A "Signal History" tab already exists — the chart sits within that tab above the history list, or as a new "Trends" tab. A new tab is simpler to implement than a click-through route.

**Sparse data handling (Claude's Discretion):** Generate all 12 ISO weeks in the window server-side, left-joining flag counts. Weeks with no flags return count=0. Frontend always receives 12 data points (no gaps).

### Server-side aggregation

```typescript
// GET /api/admin/attention/trend
// Returns: array of { isoWeek: string, count: number } for the last N weeks

// PostgreSQL ISO week: date_trunc('week', created_at)
const trendRows = await db.execute(sql`
  WITH weeks AS (
    SELECT generate_series(
      date_trunc('week', now()) - interval '11 weeks',
      date_trunc('week', now()),
      '1 week'
    ) AS week_start
  )
  SELECT
    to_char(w.week_start, 'YYYY-"W"IW') AS iso_week,
    coalesce(count(f.id)::int, 0) AS count
  FROM weeks w
  LEFT JOIN ithink_attention_flags f
    ON date_trunc('week', f.created_at AT TIME ZONE 'UTC') = w.week_start
    AND f.institution_id = ${institutionId}
  GROUP BY w.week_start
  ORDER BY w.week_start
`);
```

**Note:** This uses `sql` template from drizzle-orm directly — Drizzle's typed query builder cannot express `generate_series` or `date_trunc` without raw SQL. This is established practice in `admin.ts` (existing `sql` usage at lines 496, 581).

### Route placement

Both new routes go in `adminRouter` (admin.ts), following the same institution-scoping pattern as existing `/attention` routes:

- `GET /api/admin/attention/trend` — returns 12-week flag count series
- Wellbeing band data is fetched via the PDF report endpoint (WELL-01) AND a new `GET /api/admin/institutions/:slug/wellbeing` endpoint for the dashboard display

**Route ordering note:** Register `GET /attention/trend` before `GET /attention/:flagId/anything` to prevent "trend" being matched as a flagId. The existing `GET /attention/history` is already registered before `POST /attention/:flagId/resolve` — follow the same pattern.

---

## PDF Extension (WELL-01)

### Extension to buildInstitutionReport

`buildInstitutionReport` in `packages/server/src/pdf/institution-report.ts` is a pure function that receives `ReportData` and returns a `PDFDocument`. Extending it requires:

1. Add optional `wellbeingBand?: WellbeingBandLabel | "suppressed"` to `ReportData`
2. After the existing stats table, add a wellbeing row

**No change to the streaming route** — all changes are inside the builder function and the `ReportData` interface.

```typescript
// institution-report.ts — extend ReportData
export interface ReportData {
  institutionName: string;
  institutionCity: string | null;
  stats: { contributors: number; challenges: number; hours: number };
  generatedAt: Date;
  dateRange: { startDate: Date | null; endDate: Date | null };
  wellbeingBand?: WellbeingBandLabel | null;  // null = suppressed, undefined = not computed
  wellbeingBandSuppressedReason?: string;     // display when band is suppressed
}
```

**PDF wellbeing row format:** Add below the stats table, same row style as existing stat rows. Example:

```
Wellbeing Band     Typical
```

If suppressed:

```
Wellbeing Band     [Wellbeing data not available — fewer than 5 contributors
                    have shared their wellbeing data for this report period.]
```

**PDF colour for band label (Claude's Discretion):**
- "Low" in `#b91c1c` (red)
- "Typical" in `#16a34a` (green) — positive framing matches "Typical" being the population norm
- "High" in `#16a34a` (green, same shade — both are not concerning)

Alternative: use navy `#1a1d2e` for all three (fully neutral). Planner should default to navy for simplicity; colour is a cosmetic decision.

### Route change for PDF endpoint

The `/institutions/:slug/report.pdf` handler in `admin.ts` (currently ~line 610) must:
1. Look up institution's contributors with `institutional_reporting = true`
2. Count them; if < 5, set band to suppressed
3. If >= 5, compute modal band from Rasch-transformed scores
4. Pass `wellbeingBand` to `buildInstitutionReport`

**Modal band, not mean:** A band distribution ("40% Typical, 35% High, 25% Low") aggregated to a single label should use **modal band** (most frequent). This is simpler and avoids implying a precise mean when band labels are ordinal. If there is a tie for modal band, prefer "Typical" as the display value.

---

## Architecture Patterns

### Pattern 1: Institution-scoped wellbeing consent query

**What:** Query consented wellbeing check-ins for an institution's contributors, applying k-anonymity guard.

```typescript
// Source: admin.ts institution-scoping pattern (existing) + wellbeingCheckins
import { and, eq, sql } from "drizzle-orm";
import { wellbeingCheckins, contributorInstitutions } from "../db/schema.js";
import { rawToMetric, metricToBand } from "../lib/swemwbs-rasch.js";

async function getInstitutionWellbeingBand(
  db: ReturnType<typeof getDb>,
  institutionId: string,
  k: number = 5,
): Promise<{ band: WellbeingBandLabel | null; count: number }> {
  // Fetch most recent consented check-in per contributor at this institution
  const rows = await db
    .select({
      wemwbsScore: wellbeingCheckins.wemwbsScore,
    })
    .from(wellbeingCheckins)
    .innerJoin(
      contributorInstitutions,
      eq(contributorInstitutions.contributorId, wellbeingCheckins.contributorId),
    )
    .where(
      and(
        eq(contributorInstitutions.institutionId, institutionId),
        eq(wellbeingCheckins.institutionalReporting, true),
      ),
    )
    .orderBy(wellbeingCheckins.completedAt);  // for most-recent-per-contributor logic

  if (rows.length < k) return { band: null, count: rows.length };

  // Compute modal band from Rasch metric scores
  const bandCounts = { Low: 0, Typical: 0, High: 0 };
  for (const row of rows) {
    const metric = rawToMetric(row.wemwbsScore);
    const band = metricToBand(metric);
    bandCounts[band]++;
  }

  // Modal band (tie-break: Typical > High > Low)
  const modal = (Object.keys(bandCounts) as WellbeingBandLabel[])
    .sort((a, b) => bandCounts[b] - bandCounts[a])[0];

  return { band: modal, count: rows.length };
}
```

### Pattern 2: Recharts BarChart for weekly flag counts

**What:** A `BarChart` using the existing recharts install, following the `WellbeingChart.tsx` pattern for `ResponsiveContainer`, custom `Tooltip`, and `XAxis`/`YAxis`.

```tsx
// packages/web/src/components/attention/AttentionTrendChart.tsx
// Source: WellbeingChart.tsx pattern adapted for BarChart
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface TrendPoint {
  isoWeek: string;   // "2026-W12"
  count: number;
}

interface Props {
  data: TrendPoint[];
}

export function AttentionTrendChart({ data }: Props) {
  if (!data.length) {
    return <p className="text-neutral-500 text-sm py-8 text-center">No trend data available.</p>;
  }

  // Convert ISO week to readable label: "W12" or "Mar W3"
  const chartData = data.map((d) => ({
    ...d,
    label: d.isoWeek.replace(/^\d{4}-/, ""),  // "W12"
  }));

  return (
    <div className="h-56" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [value, "Flags"]}
          />
          <Bar dataKey="count" fill="#1a1d2e" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### Pattern 3: Trend indicator in AttentionDashboard

**What:** The trend summary — rendered inline above the active flags list or as a summary strip at the top of the page.

```tsx
// packages/web/src/pages/admin/AttentionDashboard.tsx — new TrendIndicator component
function TrendIndicator({ activeCount, trend }: { activeCount: number; trend: "Increasing" | "Stable" | "Decreasing" }) {
  const arrow = { Increasing: "↑", Stable: "→", Decreasing: "↓" };
  return (
    <p className="text-sm text-neutral-700">
      {activeCount} active {activeCount === 1 ? "flag" : "flags"}{" "}
      <span aria-label={trend}>{arrow[trend]}</span>{" "}
      {trend}
    </p>
  );
}
```

### Pattern 4: Most-recent-per-contributor query

**What:** When computing the wellbeing band, use the MOST RECENT consented check-in per contributor, not all check-ins. Including all check-ins would over-weight contributors with many check-ins.

```typescript
// PostgreSQL: most recent per contributor using DISTINCT ON
const rows = await db.execute(sql`
  SELECT DISTINCT ON (wc.contributor_id)
    wc.wemwbs_score
  FROM wellbeing_checkins wc
  INNER JOIN contributor_institutions ci
    ON ci.contributor_id = wc.contributor_id
  WHERE ci.institution_id = ${institutionId}
    AND wc.institutional_reporting = true
  ORDER BY wc.contributor_id, wc.completed_at DESC
`);
```

This is a raw SQL query (Drizzle cannot express `DISTINCT ON` without `sql`).

### Anti-Patterns to Avoid

- **Using mean band instead of modal band:** Computing mean of ordinal bands is statistically invalid. Use the modal (most frequent) band.
- **Including all check-ins per contributor:** Weight each contributor equally — use only their most recent consented check-in.
- **Applying band thresholds to raw scores:** WELL-02 requires Rasch-transformed metric scores. Apply `rawToMetric()` before `metricToBand()`.
- **Grandfathering existing check-ins:** The locked decision is that existing contributors must opt in at their next check-in. Never backfill `institutional_reporting = true` for historical rows.
- **Registering trend route after parameterised route:** Register `GET /attention/trend` BEFORE `GET /attention/:flagId/*`. Same ordering pitfall as the existing `/attention/history` route.
- **Leaking wellbeing data when k is not met:** When fewer than k contributors have consented, return `{ suppressed: true }` — never return partial data or the exact count in the public-facing payload. (Returning the exact count of a small group could itself be identifying.)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rasch transformation | Custom scoring formula | Official Warwick lookup table (29 values) | The Rasch model is calibrated from a population sample — not a formula |
| Weekly aggregation | In-memory grouping of flag rows in TypeScript | PostgreSQL `generate_series` + `date_trunc` | Handles ISO week boundaries, timezones, empty weeks |
| Chart rendering | SVG drawing by hand | recharts BarChart (already installed) | Already used in WellbeingChart.tsx; same import patterns |
| DISTINCT ON per contributor | Application-level dedup loop | PostgreSQL `DISTINCT ON` | Correct and efficient at the DB layer |
| ISO week labels | Custom date arithmetic | `to_char(date, 'YYYY-"W"IW')` in PostgreSQL | Produces ISO 8601 week labels; correct for year-boundary weeks |

---

## Common Pitfalls

### Pitfall 1: Rasch table values — registration wall

**What goes wrong:** The official Warwick PDF requires a registration account to download. The implementer may substitute approximate values or skip the transform entirely.

**Why it happens:** The URL is publicly cited but the file may redirect to a login page.

**How to avoid:** The plan must include an explicit task step: "Download the SWEMWBS raw score to metric score conversion table from `https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/using/howto/swemwbs_raw_score_to_metric_score_conversion_table.pdf` and embed the 29 values (raw scores 7-35) verbatim into `swemwbs-rasch.ts`. If the file requires registration, access it via `https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/` — free registration is available."

**Warning signs:** The lookup array in `swemwbs-rasch.ts` contains a `// TODO` placeholder.

### Pitfall 2: Band thresholds applied to raw score, not metric score

**What goes wrong:** The implementer applies the raw-score cut-offs (19.5, 27.5) to the post-Rasch metric score. These thresholds are not interchangeable — the metric score distribution is different from the raw score distribution.

**Why it happens:** Published band thresholds (from Taggart et al.) are stated in raw-score terms. The metric-score equivalents require looking up where 19.5 and 27.5 appear in the conversion table and identifying the corresponding metric scores.

**How to avoid:** After embedding the lookup table: identify the metric scores that correspond to raw scores 19.5 and 27.5 (interpolate between 19/20 and 27/28 rows). Use those metric-score values as band boundaries.

**Warning signs:** A raw score of 19 and 20 produce the same metric score, or the band thresholds in code are the integers 19 and 27.

### Pitfall 3: Multiple check-ins per contributor inflating consent count

**What goes wrong:** The k-anonymity count query returns the number of consented check-in rows, not the number of consented contributors. A single contributor with 5 check-ins makes k=5 appear satisfied.

**Why it happens:** `count(*)` on `wellbeing_checkins` with the consent filter counts rows, not distinct contributors.

**How to avoid:** Use `count(DISTINCT contributor_id)` or a `DISTINCT ON` subquery to count unique consented contributors.

**Warning signs:** k threshold appears satisfied for an institution with only 2 contributors.

### Pitfall 4: `generate_series` returns UTC weeks; flag `created_at` is timestamptz

**What goes wrong:** `generate_series` produces UTC timestamps; `date_trunc('week', created_at)` on a `timestamptz` column truncates in the DB server's timezone. In production the server may be UTC, but if the DB timezone ever differs, week boundaries shift.

**Why it happens:** PostgreSQL `date_trunc` on `timestamptz` uses the session timezone.

**How to avoid:** Explicitly cast: `date_trunc('week', f.created_at AT TIME ZONE 'UTC')` in the join condition. This pins the truncation to UTC consistently.

**Warning signs:** Flags created just before midnight appear in the wrong week in different environments.

### Pitfall 5: Consent checkbox must not block the check-in

**What goes wrong:** Making `institutionalReporting` required (defaulting the submit to be blocked until checked) violates the locked decision: "existing contributors must opt in at NEXT check-in" — a contributor who opts out should still be able to submit a check-in.

**Why it happens:** Copying the pattern from the existing `consentGranted` checkbox (which IS required).

**How to avoid:** `institutionalReporting` checkbox is optional. When unchecked, submit sends `institutionalReporting: false`. The form can submit with `consentGranted: true` and `institutionalReporting: false` — this is valid.

**Warning signs:** TypeScript/Zod validation requires `institutionalReporting: true` to submit.

### Pitfall 6: Opt-out data handling

**What goes wrong:** A contributor submits future check-ins without consent (or with `institutionalReporting: false`). Past consented rows remain in the analytics. This may be the correct behaviour, or it may need to exclude all rows since the most-recent unconsented check-in.

**Why it happens:** The locked decision says "existing contributors NOT grandfathered — must opt in at next check-in." The opt-OUT scenario is not locked.

**How to avoid (Claude's Discretion recommendation):** Use **most-recent-per-contributor** logic. Only the most recent check-in's consent status counts. If a contributor's most recent check-in has `institutional_reporting = false`, exclude all their rows. This respects dynamic consent state without requiring data deletion. This matches the "next cycle" approach rather than immediate deletion.

**Implementation:** The `DISTINCT ON` query (Pattern 4 above) selects the most recent row per contributor and checks its `institutional_reporting` flag — naturally implementing this behaviour.

---

## Code Examples

### Drizzle schema change

```typescript
// packages/server/src/db/schema.ts — add to wellbeingCheckins table definition
export const wellbeingCheckins = pgTable("wellbeing_checkins", {
  // ... existing columns ...
  wemwbsScore: smallint("wemwbs_score").notNull(),
  institutionalReporting: boolean("institutional_reporting"),  // NEW: nullable
  completedAt: timestamp("completed_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### Shared wellbeing schema extension

```typescript
// packages/shared/src/schemas/wellbeing.ts
export const wellbeingCheckinSchema = z.object({
  uclaItems: z.tuple([/* ... */]),
  wemwbsItems: z.tuple([/* ... */]),
  consentGranted: z.literal(true),
  institutionalReporting: z.boolean().default(false),  // NEW: optional, defaults false
});
```

### WellbeingForm checkbox addition

```tsx
// Add below existing consent section in WellbeingForm.tsx
const [institutionalReportingConsent, setInstitutionalReportingConsent] = useState(false);

// In form submit:
const data: WellbeingCheckinInput = {
  uclaItems: ...,
  wemwbsItems: ...,
  consentGranted: true,
  institutionalReporting: institutionalReportingConsent,  // NEW
};

// Checkbox JSX (inside consent section, below existing checkbox):
<label className="flex items-start gap-3 cursor-pointer mt-4">
  <input
    type="checkbox"
    checked={institutionalReportingConsent}
    onChange={(e) => setInstitutionalReportingConsent(e.target.checked)}
    className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-800 focus:ring-primary-700"
  />
  <span className="text-sm text-neutral-700 leading-relaxed">
    I also consent to my anonymised wellbeing data being included in aggregate wellbeing
    reports for my institution. My individual responses will never be shared — only
    group-level data for groups of 5 or more people.
  </span>
</label>
```

### Trend endpoint response type

```typescript
// packages/web/src/api/attention.ts — add
export interface TrendPoint {
  isoWeek: string;   // "2026-W12"
  count: number;
}

export function getAttentionTrend(): Promise<TrendPoint[]> {
  return apiClient<TrendPoint[]>("/api/admin/attention/trend");
}
```

---

## Discretion Decisions — Recommendations Summary

| Area | Recommendation | Rationale |
|------|---------------|-----------|
| k-anonymity threshold | k = 5 | ONS standard for health surveys; k=10 unusable at pilot scale |
| Suppression message | "Wellbeing data not available — fewer than 5 contributors have shared their wellbeing data for this report period." | Informative, not alarming |
| Opt-out handling | Most-recent-per-contributor (next cycle) | Respects dynamic consent without requiring deletion |
| Trend comparison period | 4 weeks vs 4 weeks | Matches iThink check-in cadence; actionable for CM |
| Trend tone | Neutral, no colour coding | CM judges significance; avoid false good/bad signals |
| Chart type | BarChart | Discrete weekly counts; LineChart already used for continuous scores |
| Chart time window | 12 weeks | 3 months of history is actionable context |
| Chart access | Inline in AttentionDashboard (new "Trends" tab) | Simpler than click-through route |
| Band colours in PDF | Navy (#1a1d2e) for all three bands | Fully neutral; simpler; colour adds no information for a text label |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw SWEMWBS score banding | Rasch-transformed metric score banding | WEMWBS User Guide v2 | More statistically valid; required for cross-study comparisons |
| Flat boolean consent | Per-checkin nullable boolean | Phase 16 | Allows dynamic consent change per check-in cycle |
| All-contributor wellbeing average | Modal band from consented contributors only | Phase 16 | Privacy-preserving; consent-scoped |

---

## Open Questions

1. **Rasch lookup table access**
   - What we know: The table URL is `https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/using/howto/swemwbs_raw_score_to_metric_score_conversion_table.pdf` — publicly cited by Scottish Government and academic publications
   - What's unclear: Whether it requires Warwick registration to download (the page may redirect)
   - Recommendation: Plan task must instruct the implementer to download it manually and embed the 29 values. Free registration is available at warwick.ac.uk/fac/sci/med/research/platform/wemwbs/

2. **Metric-score band boundaries**
   - What we know: Raw-score boundaries are 19.5 (Low/Typical) and 27.5 (Typical/High)
   - What's unclear: The exact metric score at raw=19 vs raw=20, and raw=27 vs raw=28 (these are the relevant cells in the lookup table)
   - Recommendation: Once the table is embedded, use the metric scores at raw=19/20 and raw=27/28 to set band boundaries. Document these as constants in `swemwbs-rasch.ts`.

3. **Most-recent-per-contributor scope for PDF**
   - What we know: The PDF currently queries all-time or date-range-filtered contributors for hours/challenges
   - What's unclear: Should the wellbeing band query match the PDF date range (i.e., only check-ins in the selected date range) or always use the most recent ever?
   - Recommendation: Planner should default to **most-recent ever** (ignoring the PDF date range). Wellbeing is a snapshot of current state, not an activity in a time window. This avoids the edge case of "contributor was Typical in Q1 but High in Q2" confusing the band with date filtering.

4. **WellbeingForm change scope — WellbeingCheckin page vs Onboarding**
   - What we know: `WellbeingForm` is shared between `Wellbeing.tsx` (onboarding) and `WellbeingCheckin.tsx` (periodic)
   - What's unclear: Should the `institutional_reporting` checkbox appear at onboarding (first check-in) or only at periodic check-ins?
   - Recommendation: Show it at ALL check-ins (both onboarding and periodic). The locked decision says "must opt in at next check-in" — this implies it appears whenever a check-in is submitted.

---

## Sources

### Primary (HIGH confidence)
- Codebase `packages/server/src/db/schema.ts` — `wellbeingCheckins` table structure, `consentRecords`, `ithinkAttentionFlags` schema
- Codebase `packages/server/src/routes/wellbeing.ts` — existing consent insertion pattern (`purpose: "wellbeing_checkin"`)
- Codebase `packages/server/src/routes/admin.ts` — institution-scoping pattern, PDF route, existing SQL template usage
- Codebase `packages/server/src/pdf/institution-report.ts` — `buildInstitutionReport`, `ReportData` interface, row rendering
- Codebase `packages/web/src/lib/wellbeing-norms.ts` — existing `swemwbsBand()`, band labels ("Low"/"Average"/"High"), colour classes
- Codebase `packages/web/src/components/wellbeing/WellbeingChart.tsx` — recharts `ResponsiveContainer` + `LineChart` pattern
- Codebase `packages/web/src/components/wellbeing/WellbeingForm.tsx` — existing consent checkbox, form structure
- Phase 14 SUMMARY.md — confirmed AttentionDashboard at `/admin/attention`, tab structure, query key names
- Phase 15 SUMMARY.md — confirmed `buildInstitutionReport` delivered and working, `ReportData` interface

### Secondary (MEDIUM confidence)
- Taggart et al. (2016), PMC5376387 — "Evaluating and establishing national norms for mental wellbeing using SWEMWBS": band cut-offs at raw scores 19.5/27.5; population mean 23.5, SD 3.9
- Frontiers in Psychiatry (2025) — "The categorisation of the Short Warwick Edinburgh Mental Wellbeing Scale scores": confirmed three-band approach at ±1 SD
- warwick.ac.uk — SWEMWBS conversion table PDF URL confirmed publicly listed in Scottish Government and academic publications
- ONS Disclosure Control Guidance — k=5 threshold standard for health survey data tables

### Tertiary (LOW confidence)
- Warwick SWEMWBS conversion table exact values: not accessible without potential registration; must be embedded by implementer
- Metric-score band boundaries: computed from the lookup table, not yet known; marked TODO in implementation patterns

---

## Metadata

**Confidence breakdown:**
- Codebase patterns: HIGH — all patterns verified from reading actual delivered code
- SWEMWBS band thresholds (raw score): MEDIUM — multiple peer-reviewed sources agree on 19.5/27.5
- Rasch lookup table values: LOW — table URL verified, values not accessible; implementer must embed
- Metric-score band boundaries: LOW — depend on the lookup table values
- k-anonymity threshold (k=5): MEDIUM — consistent with ONS health data guidance; not a regulatory requirement
- Trend algorithm: HIGH — uses existing flag table structure
- PostgreSQL generate_series + DISTINCT ON: HIGH — standard PostgreSQL features used in existing codebase

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain; Rasch table and SWEMWBS norms are long-established)
