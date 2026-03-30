---
phase: 16-wellbeing-attention-analytics
verified: 2026-03-26T05:43:21Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: Open institution PDF with >= 5 opted-in contributors
    expected: Stats table shows Wellbeing Band row with Low/Typical/High as plain text
    why_human: PDF rendering cannot be verified programmatically
  - test: Open institution PDF with fewer than 5 opted-in contributors
    expected: Wellbeing Band row shows a dash and suppression note
    why_human: Requires live data at k < 5 threshold
  - test: Open AttentionDashboard and read trend indicator above tabs
    expected: Text reads e.g. 3 active flags up Increasing
    why_human: Requires authenticated CM session and live flag data
  - test: Click the Trends tab in AttentionDashboard
    expected: Bar chart with week labels W01..W12; sparse notice when total < 3
    why_human: Recharts rendering requires a real browser
  - test: Submit check-in without ticking institutional reporting checkbox
    expected: Submission succeeds; institutional_reporting stored as false
    why_human: Requires live contributor session and DB inspection
---

# Phase 16: Wellbeing and Attention Analytics -- Verification Report

**Phase Goal:** The CM dashboard and PDF impact report surface anonymised wellbeing bands and attention trend data derived from real contributor metrics.
**Verified:** 2026-03-26T05:43:21Z
**Status:** PASSED
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PDF displays wellbeing band when >= k opted-in contributors; hidden below threshold | VERIFIED | institution-report.ts L156-189: renders band row when wellbeingBand defined; admin.ts L777-780: null + suppression when rows < K_ANONYMITY |
| 2 | Wellbeing band derived from Rasch-transformed scores, not raw sums | VERIFIED | admin.ts L790-791: rawToMetric then metricToBand; Rasch mandatory before band; raw sum never used |
| 3 | Only institutional_reporting-consented contributors counted | VERIFIED | admin.ts L773: WHERE eq(institutionalReporting, true); non-consenting rows excluded |
| 4 | Attention dashboard shows trend direction indicator per institution | VERIFIED | AttentionDashboard.tsx L303-316: TrendIndicator renders activeCount + arrow + direction above tabs at L374 |
| 5 | CM can open weekly trend chart of flag counts for any institution | VERIFIED | Trends tab wired to AttentionTrendChart.tsx recharts BarChart with 12-week data |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/server/src/lib/swemwbs-rasch.ts | rawToMetric, metricToBand | VERIFIED | 69 lines; RASCH_METRIC table raw 7-35; all exports present |
| packages/server/src/db/schema.ts | institutionalReporting column | VERIFIED | L459: boolean(institutional_reporting) nullable |
| packages/server/src/pdf/institution-report.ts | wellbeingBand in ReportData | VERIFIED | L26-27: optional wellbeingBand + wellbeingMessage; L155-190: band row in PDF stats table |
| packages/server/src/routes/admin.ts | wellbeing query + trend endpoint | VERIFIED | L507-565: /attention/trend; L759-808: wellbeing query with k=5 and Rasch conversion |
| packages/web/src/components/wellbeing/WellbeingForm.tsx | optional consent checkbox | VERIFIED | L228-243: checkbox; canSubmit L71 excludes it; value passed in data |
| packages/web/src/components/attention/AttentionTrendChart.tsx | recharts BarChart | VERIFIED | 73 lines; L40-43: sparse notice; formatWeekLabel for axis labels |
| packages/web/src/pages/admin/AttentionDashboard.tsx | TrendIndicator + Trends tab | VERIFIED | L303-316: TrendIndicator; L360-419: three-tab layout; AttentionTrends wired |
| packages/web/src/api/attention.ts | getAttentionTrend | VERIFIED | L38-40: calls /api/admin/attention/trend; AttentionTrendData interface defined |
| packages/web/src/hooks/useAttention.ts | useAttentionTrend | VERIFIED | L24-28: TanStack Query hook calling getAttentionTrend() |
| packages/shared/src/schemas/wellbeing.ts | institutionalReporting field | VERIFIED | L25-28: z.boolean().default(false) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| WellbeingForm.tsx | wellbeing API | useSubmitCheckin mutateAsync | VERIFIED | L83-84: institutionalReporting in data; L87: mutateAsync call |
| wellbeing.ts route | DB insert | institutionalReporting stored on insert | VERIFIED | Route L19 + L58: destructures and stores the value |
| PDF route admin.ts | wellbeing query | selectDistinctOn consent-filtered | VERIFIED | L766-775: DISTINCT ON latest per contributor, consent=true |
| PDF route | rawToMetric / metricToBand | import from swemwbs-rasch.ts | VERIFIED | admin.ts L17: import present |
| admin.ts trend route | ithink_attention_flags | SQL generate_series LEFT JOIN | VERIFIED | L525-542: real SQL 12-week ISO-week series |
| useAttentionTrend | /api/admin/attention/trend | getAttentionTrend apiClient | VERIFIED | Full chain: hook to server route at L507 |
| AttentionDashboard.tsx | AttentionTrendChart.tsx | import + use in AttentionTrends | VERIFIED | L5 import; L353: rendered with weeks data |
| TrendIndicator | useAttentionTrend | direct hook call | VERIFIED | L304: const data = useAttentionTrend() |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| PDF wellbeing band when >= k consented contributors; hidden below threshold | SATISFIED | k=5; suppression when wellbeingRows.length < 5 |
| Band from Rasch-transformed scores not raw sums | SATISFIED | rawToMetric called before metricToBand |
| Only institutional_reporting-consented contributors counted | SATISFIED | Query WHERE filters institutionalReporting = true |
| Attention dashboard trend direction indicator | SATISFIED | TrendIndicator above tabs with arrow + direction word |
| CM can open weekly trend chart for any institution | SATISFIED | Trends tab renders 12-week BarChart |
| Text label only, no coloured badge (CONTEXT.md locked) | SATISFIED | PDF renders plain text bandValue in navy |
| Plain language Wellbeing Band, no SWEMWBS branding (CONTEXT.md locked) | SATISFIED | Label is Wellbeing Band; SWEMWBS absent from PDF |
| Consent at next check-in, not grandfathered (CONTEXT.md locked) | SATISFIED | Checkbox in form; NULL legacy rows treated as non-consenting |
| Trend inline N active flags arrow Direction (CONTEXT.md locked) | SATISFIED | TrendIndicator L311-314 renders correct format |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| AttentionDashboard.tsx | 77, 80 | placeholder= | Info | HTML input placeholder -- not a stub marker |

No blockers or warnings found.

---

### Human Verification Required

#### 1. PDF Wellbeing Band -- Sufficient Data Path

**Test:** Generate an institution PDF where >= 5 contributors have submitted check-ins with institutional reporting ticked.
**Expected:** Stats table shows Wellbeing Band row with Low, Typical, or High as plain text. No coloured badge. No SWEMWBS branding.
**Why human:** PDF rendering and live data required.

#### 2. PDF Wellbeing Band -- Suppression Path

**Test:** Generate an institution PDF where fewer than 5 contributors have institutional reporting consent.
**Expected:** Wellbeing Band row shows a dash and the suppression note about fewer than 5 contributors.
**Why human:** Requires live data at k < 5 threshold.

#### 3. Trend Indicator Display

**Test:** Log in as a CM and navigate to the Attention Dashboard.
**Expected:** Below the page heading and above the tabs: N active flags [arrow] [direction]. Nothing renders when no data (null guard at L305).
**Why human:** Requires authenticated CM session and live flag data.

#### 4. Trends Tab -- Bar Chart

**Test:** Click the Trends tab in the Attention Dashboard.
**Expected:** Bar chart with week labels W01-W12 and flag count bars. When total flags < 3, Limited data notice appears above the chart.
**Why human:** Recharts rendering requires a real browser.

#### 5. Wellbeing Form -- Institutional Reporting Checkbox Is Optional

**Test:** Submit a wellbeing check-in with main consent ticked but institutional reporting unticked.
**Expected:** Submission succeeds. Submit button not disabled. institutional_reporting stored as false.
**Why human:** Requires live contributor session and DB inspection.

---

### Gaps Summary

No automated gaps found. All five success criteria are satisfied by substantive, wired implementations across both plans (16-01 and 16-02). The five human verification items are standard visual/flow checks that cannot be confirmed programmatically.

One SUMMARY discrepancy noted but immaterial: 16-02-SUMMARY.md lists the trend route as packages/server/src/routes/admin/attention.ts but the route is in packages/server/src/routes/admin.ts. The implementation is correct; the SUMMARY key-files path was inaccurate.

**Notable carry-forward items (not blocking verification):**
- SWEMWBS commercial licence confirmation outstanding. Licence warning present in swemwbs-rasch.ts L6-8.
- k=5 anonymity threshold is a placeholder pending stakeholder confirmation.

---

_Verified: 2026-03-26T05:43:21Z_
_Verifier: Claude (gsd-verifier)_