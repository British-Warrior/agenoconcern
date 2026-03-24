---
phase: 15-pdf-impact-report
plan: 02
subsystem: frontend
tags: [react, pdf-download, institution-management, blob-fetch]

# Dependency graph
requires:
  - phase: 15-pdf-impact-report
    plan: 01
    provides: GET /api/admin/institutions/:slug/report.pdf streaming endpoint
provides:
  - downloadInstitutionReport function (raw fetch + blob)
  - "Generate Report" button on InstitutionManagement cards
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Raw fetch with credentials:include for binary download (apiClient only handles JSON)
    - Blob URL + temporary anchor element for triggering browser download
    - Collapsible date range inputs with optional from/to params

key-files:
  created: []
  modified:
    - packages/web/src/api/admin.ts
    - packages/web/src/pages/admin/InstitutionManagement.tsx

key-decisions:
  - "Raw fetch instead of apiClient for binary PDF download — apiClient parses JSON only"
  - "Generate Report button disabled when stats is null (no contributors assigned)"

patterns-established:
  - "Binary file download pattern: raw fetch + blob + temporary anchor element"

# Metrics
duration: ~8min
completed: 2026-03-24
---

# Phase 15 Plan 02: CM PDF Download UI Summary

**Generate Report button with loading state, date range inputs, and raw-fetch blob download on InstitutionManagement page — human-verified**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 2

## Accomplishments
- downloadInstitutionReport function using raw fetch + blob + temporary anchor for browser download
- "Generate Report" button on each institution card
- Button disabled when stats is null (no contributors)
- Loading spinner during PDF generation
- Collapsible date range inputs (From/To) with optional filtering
- Error display for 422 and other server errors
- TypeScript compiles cleanly

## Task Commits

1. **Task 1: Download function + Generate Report UI** — `a4d00f6` (feat)
2. **Task 2: Human verification** — approved (PDF downloads with branded content)

## Files Modified
- `packages/web/src/api/admin.ts` — Added downloadInstitutionReport with raw fetch + blob
- `packages/web/src/pages/admin/InstitutionManagement.tsx` — Generate Report button, date range, loading/error states

## Deviations from Plan
None.

## Issues Encountered
None.

---
*Phase: 15-pdf-impact-report*
*Completed: 2026-03-24*
