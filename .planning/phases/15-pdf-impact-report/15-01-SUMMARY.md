---
phase: 15-pdf-impact-report
plan: "01"
subsystem: server/pdf
tags: [pdf, pdfkit, institution, report, streaming]
dependency_graph:
  requires: [12-institution-data-foundation]
  provides: [pdf-report-endpoint]
  affects: [packages/server/src/routes/admin.ts]
tech_stack:
  added: [pdfkit ^0.18.0, "@types/pdfkit ^0.17.5", "Inter-Regular.ttf (rsms/inter v4.1)", "Inter-Bold.ttf (rsms/inter v4.1)"]
  patterns: [streaming-pdf, piped-document, fileURLToPath-ESM-font-resolution]
key_files:
  created:
    - packages/server/src/pdf/institution-report.ts
    - packages/server/src/pdf/fonts/Inter-Regular.ttf
    - packages/server/src/pdf/fonts/Inter-Bold.ttf
  modified:
    - packages/server/src/routes/admin.ts
    - packages/server/package.json
decisions:
  - "Font files sourced from rsms/inter v4.1 release zip (extras/ttf/), not @fontsource/inter which only ships WOFF/WOFF2 in v5"
  - "Manual text layout for stats rows instead of doc.table() — simpler and more reliable than the undocumented pdfkit table API"
  - "WHERE clause conditions reduced with sql template literal reduce rather than and() from drizzle-orm — avoids variable-length AND helper import"
metrics:
  duration_minutes: 3
  completed: 2026-03-24
---

# Phase 15 Plan 01: PDF Impact Report — Server Implementation Summary

pdfkit-based streaming GET /api/admin/institutions/:slug/report.pdf with Inter font, navy/amber brand colours, optional date-range filtering, and 422 guard for empty institutions.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Install pdfkit + bundle Inter fonts | ee7defa |
| 2 | PDF document builder and streaming route | d8c22f1 |

## What Was Built

### institution-report.ts

Exports `buildInstitutionReport(data: ReportData): PDFKit.PDFDocument`. The function:

- Creates a PDFDocument with the Inter Regular TTF font resolved via `fileURLToPath(import.meta.url)` (ESM-safe)
- Draws a full-width navy (`#1a1d2e`) header band with "Indomitable Unity" in white bold 22pt and the brand tagline in amber (`#c89a30`) 11pt
- Renders institution name, city, and date range label in mid-grey (`#787880`) below the header
- Draws a navy-header stats table with 3 rows (Contributors, Challenges participated, Total hours logged) using alternating white/light-grey row backgrounds
- Renders a footer with the generation date
- Returns the document without calling `doc.end()` (caller controls the lifecycle)

### GET /institutions/:slug/report.pdf

- Validates slug against `/^[a-z0-9-]{2,100}$/`
- Parses optional `from`/`to` ISO date query params with validation
- Looks up institution by slug (404 if missing)
- Fetches contributor assignments — returns 422 JSON before any PDF bytes if none assigned
- Queries unique challenge interests and total hours with optional `gte`/`lte` date filters on `loggedAt`
- Sets `Content-Type: application/pdf`, `Content-Disposition: inline; filename=...`, `Cache-Control: no-store`
- Calls `doc.pipe(res)` then `doc.end()` — fully streaming, no temp files

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @fontsource/inter 5.x ships only WOFF/WOFF2, not TTF**
- **Found during:** Task 1
- **Issue:** The plan suggested copying TTF files from `@fontsource/inter`'s `files/` directory, but v5.x of that package only includes WOFF and WOFF2 formats; pdfkit requires TTF
- **Fix:** Downloaded Inter-4.1.zip from `rsms/inter` GitHub releases, extracted `extras/ttf/Inter-Regular.ttf` and `extras/ttf/Inter-Bold.ttf`; then removed @fontsource/inter
- **Files modified:** packages/server/src/pdf/fonts/ (two TTF files added)
- **Commit:** ee7defa

## Self-Check: PASSED

All created files verified present. Both task commits confirmed in git log.
