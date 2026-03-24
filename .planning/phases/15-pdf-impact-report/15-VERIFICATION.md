---
phase: 15-pdf-impact-report
verified: 2026-03-24T21:00:00Z
status: gaps_found
score: 9/11 must-haves verified
re_verification: false
gaps:
  - truth: "PDF uses Inter font with Indomitable Unity brand colours (navy header, amber tagline)"
    status: partial
    reason: "The amber tagline reads Bridging the pension gap through community contribution instead of the authoritative brand tagline from PROJECT.md"
    artifacts:
      - path: "packages/server/src/pdf/institution-report.ts"
        issue: "Line 68: tagline is wrong. Should be: Deploying Expertise That Hasn't Passed Its Sell-By Date."
    missing:
      - "Update line 68 of institution-report.ts to the correct brand tagline from PROJECT.md"
  - truth: "Date range query params (from/to) filter hours and challenges; absent params default to all-time"
    status: partial
    reason: "Hours are correctly filtered (loggedAt with gte/lte), but the challengeInterests query (lines 665-668) applies no date condition"
    artifacts:
      - path: "packages/server/src/routes/admin.ts"
        issue: "Lines 665-668: challengeInterests query has no date filter on createdAt"
    missing:
      - "Add gte/lte date conditions to the challengeInterests query mirroring the hoursConditions pattern"
human_verification:
  - test: "Open the downloaded PDF and verify the complete visual layout"
    expected: "Navy header, Indomitable Unity white bold, amber tagline, Impact Report heading, stats table, footer"
    why_human: "PDF visual rendering and font quality cannot be verified programmatically"
  - test: "Download a report, wait 5 seconds, download again"
    expected: "Both PDFs have different Generated timestamps in the footer"
    why_human: "Requires live browser interaction to verify no-store streaming"
  - test: "Set a date range before generating and compare to all-time report"
    expected: "Hours differ based on date range; challenges show all-time (known gap)"
    why_human: "Requires known data and live generation to validate filter behaviour"
---

# Phase 15: PDF Impact Report Verification Report

**Phase Goal:** The CM can generate a branded PDF impact report for any institution on demand, and the report is streamed directly to the browser without being stored anywhere.
**Verified:** 2026-03-24
**Status:** gaps_found -- 2 gaps blocking full goal achievement
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /api/admin/institutions/:slug/report.pdf streams a valid PDF | VERIFIED | Route at admin.ts:613; Content-Type: application/pdf; doc.pipe(res); doc.end() |
| 2 | PDF contains institution name, date range label, contributor count, challenge count, total hours | VERIFIED | institution-report.ts renders all five; route assembles ReportData with all fields |
| 3 | PDF uses Inter font with Indomitable Unity brand colours (navy header, amber tagline) | PARTIAL | Inter TTFs present (411-420 KB), navy/amber colours correct, tagline text wrong |
| 4 | Empty institution returns 422 JSON before any PDF bytes | VERIFIED | admin.ts:657-660 returns 422 before streaming setup |
| 5 | Date range params filter hours and challenges; absent params default to all-time | PARTIAL | Hours filtered correctly via loggedAt; challengeInterests query ignores date params |
| 6 | CM sees Generate Report button on each institution card | VERIFIED | InstitutionManagement.tsx:257-266 renders button in InstitutionCardView |
| 7 | Clicking button downloads a PDF file to the browser | VERIFIED | handleGenerateReport calls downloadInstitutionReport with fetch+blob+anchor pattern |
| 8 | Button shows loading state while PDF is generating | VERIFIED | loading={isGenerating} passed to Button; toggled in try/finally |
| 9 | Button is disabled when institution has no contributors | VERIFIED | disabled={!stats || isGenerating} at line 261 |
| 10 | CM can optionally select a date range before generating | VERIFIED | From/To date inputs behind showDateRange toggle; values passed to downloadInstitutionReport |
| 11 | 422 error displays user-friendly message | VERIFIED | downloadInstitutionReport parses JSON error; InstitutionCardView shows reportError with role=alert |

**Score:** 9/11 truths verified (2 partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/server/src/pdf/institution-report.ts | Exports buildInstitutionReport, ReportData | VERIFIED | 168 lines; exports both; header, stats table, footer all implemented |
| packages/server/src/pdf/fonts/Inter-Regular.ttf | Inter Regular TTF | VERIFIED | 411,640 bytes (rsms/inter v4.1) |
| packages/server/src/pdf/fonts/Inter-Bold.ttf | Inter Bold TTF | VERIFIED | 420,428 bytes (rsms/inter v4.1) |
| packages/server/src/routes/admin.ts | GET /institutions/:slug/report.pdf route | VERIFIED | Route at line 613; buildInstitutionReport imported at line 16 |
| packages/web/src/api/admin.ts | downloadInstitutionReport function | VERIFIED | Lines 90-119; raw fetch+blob+anchor; API_BASE_URL; credentials:include |
| packages/web/src/pages/admin/InstitutionManagement.tsx | Generate Report button with all states | VERIFIED | Lines 253-308; button, loading, disabled, date inputs, error display all present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| admin.ts (server) | institution-report.ts | import buildInstitutionReport | WIRED | Line 16 imports both exports; called at line 708 |
| admin.ts (server) | contributorInstitutions + contributorHours | Drizzle queries with date filter | PARTIAL | Hours apply gte/lte filter; challengeInterests has no date condition |
| institution-report.ts | pdf/fonts/ | fileURLToPath ESM dirname workaround | WIRED | Lines 5-11 use fileURLToPath + dirname + join |
| InstitutionManagement.tsx | admin.ts (web) | import downloadInstitutionReport | WIRED | Line 12 imports; called at line 188 |
| admin.ts (web) | /api/admin/institutions/:slug/report.pdf | raw fetch with credentials:include | WIRED | Lines 100-103 construct URL and call fetch |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| institution-report.ts | 68 | Wrong brand tagline text | Warning | Uses Bridging the pension gap... instead of the authoritative brand tagline from PROJECT.md |
| admin.ts (server) | 665-668 | Date filter missing from challengeInterests query | Warning | Challenge count is always all-time even when a date range is selected |
| admin.ts (server) | 702-705 | Content-Disposition: inline instead of attachment | Info | Plan specified attachment; frontend blob+anchor download works regardless |

---

## Human Verification Required

### 1. PDF Visual Layout

**Test:** Log in as CM, open institution management, click Generate Report on an institution with contributors, open the downloaded PDF.
**Expected:** Navy header band, Indomitable Unity in white bold 22pt, amber tagline, Impact Report heading in navy, institution name and city in mid-grey, date range label (All time), stats table with navy header and 3 data rows, centred footer with generation date.
**Why human:** PDF visual rendering, font embedding, and layout cannot be verified programmatically.

### 2. Fresh Document on Each Download

**Test:** Download a report, wait 5 seconds, download again.
**Expected:** Both PDFs have different Generated timestamps in the footer; no cached version served.
**Why human:** Verifying Cache-Control: no-store behaviour and fresh generation requires live browser testing.

### 3. Date Range Filtering Behaviour

**Test:** Set a narrow date range (yesterday to today), generate report, compare hours to the all-time report.
**Expected:** Hours reflect the filtered range. Challenge count will match all-time (known partial gap).
**Why human:** Requires known data and live generation to validate filter correctness.

---

## Gaps Summary

**Gap 1 -- Wrong brand tagline (brand identity failure):** The PDF amber tagline reads "Bridging the pension gap through community contribution" rather than the authoritative brand tagline from PROJECT.md (line 76). Fix is a one-line string change in institution-report.ts line 68.

**Gap 2 -- Challenge count ignores date filter (data accuracy failure):** When the CM selects a date range, hours are correctly filtered but challenge interest count always returns all-time data. Fix requires adding gte/lte date conditions to the challengeInterests query in admin.ts lines 665-668, mirroring the hoursConditions pattern at lines 673-679.

Both gaps are small, isolated fixes. The core infrastructure -- PDF generation, streaming, auth, empty-state guard, UI download flow, loading states, error handling, and date range inputs -- is fully functional and correctly wired.

---

_Verified: 2026-03-24_
_Verifier: Claude (gsd-verifier)_
