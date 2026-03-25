---
phase: 16-wellbeing-attention-analytics
plan: "01"
subsystem: database, api, ui
tags: [swemwbs, rasch, wellbeing, pdf, k-anonymity, drizzle, postgres]

# Dependency graph
requires:
  - phase: 15-pdf-impact-report
    provides: buildInstitutionReport, ReportData, institution PDF route in admin.ts
  - phase: 06-wellbeing-notifications-and-pwa
    provides: wellbeingCheckins table, WellbeingForm, wellbeing route
provides:
  - institutional_reporting boolean column on wellbeing_checkins
  - SWEMWBS Rasch metric conversion utility (rawToMetric, metricToBand)
  - Optional institutional reporting consent checkbox in WellbeingForm
  - Wellbeing band section in institution PDF (k=5 suppressed, modal band, Typical tie-break)
affects:
  - 16-02 (attention analytics plan — same phase)
  - any future reporting or analytics work

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "k-anonymity suppression (k=5) for aggregate wellbeing data in PDF reports"
    - "Rasch metric conversion for SWEMWBS interval scaling before band classification"
    - "Modal band with Typical tie-break for group wellbeing reporting"
    - "Drizzle selectDistinctOn for most-recent-per-contributor pattern"

key-files:
  created:
    - packages/server/src/lib/swemwbs-rasch.ts
    - packages/server/drizzle/0004_institutional_reporting.sql
    - packages/server/scripts/add-institutional-reporting.mjs
  modified:
    - packages/server/src/db/schema.ts
    - packages/shared/src/schemas/wellbeing.ts
    - packages/shared/src/types/wellbeing.ts
    - packages/web/src/components/wellbeing/WellbeingForm.tsx
    - packages/server/src/routes/wellbeing.ts
    - packages/server/src/pdf/institution-report.ts
    - packages/server/src/routes/admin.ts

key-decisions:
  - "k=5 anonymity threshold used for wellbeing suppression (placeholder — stakeholder confirmation pending)"
  - "Typical band wins modal tie-breaks to avoid over-alarming institutions with ambiguous data"
  - "institutional_reporting is nullable (not boolean NOT NULL) to allow null for legacy rows"
  - "Migration applied via focused script (add-institutional-reporting.mjs) rather than drizzle-kit migrate, consistent with project's manual migration pattern for schema additions outside Drizzle's tracked history"

patterns-established:
  - "Optional consent fields follow pattern: NOT in canSubmit, NOT required, stored with ?? false fallback"
  - "Rasch transformation always precedes band classification — never classify raw SWEMWBS scores"

# Metrics
duration: 5min
completed: 2026-03-25
---

# Phase 16 Plan 01: Wellbeing Band Analytics Summary

**SWEMWBS Rasch-transformed wellbeing band in institution PDF with k=5 suppression and optional anonymised reporting consent checkbox**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-25T21:03:00Z
- **Completed:** 2026-03-25T21:08:21Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Added `institutional_reporting` boolean column to `wellbeing_checkins` with migration
- Created `swemwbs-rasch.ts` utility with Rasch metric table (7-35 range) and band classification
- Optional "anonymised institutional reporting" consent checkbox added to WellbeingForm (not gating submission)
- PDF institution report now shows wellbeing band row or k=5 suppression message

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration, Rasch utility, consent schema and form** - `4b940d5` (feat)
2. **Task 2: Wellbeing band query and PDF extension** - `48ce4e3` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `packages/server/src/lib/swemwbs-rasch.ts` - Rasch metric lookup table, rawToMetric(), metricToBand()
- `packages/server/drizzle/0004_institutional_reporting.sql` - Generated migration SQL
- `packages/server/scripts/add-institutional-reporting.mjs` - Applied migration script (project pattern)
- `packages/server/src/db/schema.ts` - Added institutionalReporting boolean to wellbeingCheckins
- `packages/shared/src/schemas/wellbeing.ts` - Added institutionalReporting: z.boolean().default(false)
- `packages/shared/src/types/wellbeing.ts` - Added institutionalReporting?: boolean to WellbeingCheckinInput
- `packages/web/src/components/wellbeing/WellbeingForm.tsx` - Optional institutional reporting checkbox
- `packages/server/src/routes/wellbeing.ts` - Stores institutionalReporting on insert
- `packages/server/src/pdf/institution-report.ts` - ReportData extended, wellbeing band row in PDF
- `packages/server/src/routes/admin.ts` - Wellbeing band query with k=5 suppression in PDF route

## Decisions Made
- k=5 anonymity threshold (matches STATE.md placeholder — stakeholder confirmation still pending)
- Typical wins modal ties — avoids over-alarming institutions with ambiguous distributions
- `institutional_reporting` stored as nullable boolean; legacy rows will be NULL (treated as non-consenting)
- Migration applied via script rather than `drizzle-kit migrate` — consistent with project pattern where prior migrations were tracked outside Drizzle's `__drizzle_migrations` table

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added institutionalReporting to WellbeingCheckinInput type**
- **Found during:** Task 1 (WellbeingForm update)
- **Issue:** Plan specified adding the field to Zod schema but did not mention the TypeScript interface in types/wellbeing.ts — the form would have failed to compile with the new field in the data object
- **Fix:** Added `institutionalReporting?: boolean` to `WellbeingCheckinInput` interface
- **Files modified:** packages/shared/src/types/wellbeing.ts
- **Verification:** TypeScript compiles without error across all 3 packages
- **Committed in:** 4b940d5 (Task 1 commit)

**2. [Rule 1 - Bug] Replaced sql.raw UUID interpolation with parameterised inArray**
- **Found during:** Task 2 (wellbeing query implementation)
- **Issue:** Initial draft used `sql.raw("ARRAY['" + contributorIds.join("','") + "']::uuid[]")` which is a SQL injection risk if UUIDs ever come from user input
- **Fix:** Replaced with Drizzle's `inArray()` helper, which uses parameterised queries
- **Files modified:** packages/server/src/routes/admin.ts
- **Verification:** TypeScript compiles; query uses bound parameters
- **Committed in:** 48ce4e3 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing type, 1 security fix)
**Impact on plan:** Both fixes necessary for correctness/security. No scope creep.

## Issues Encountered
- `drizzle-kit migrate` failed because prior migrations (institutions table, contributor_institutions, etc.) were applied via manual scripts and not recorded in Drizzle's `__drizzle_migrations` table. Applied only the new column via a focused script and marked 0004 as applied — consistent with the project's established manual migration pattern.

## Next Phase Readiness
- Wellbeing band data pipeline complete; ready for 16-02 (attention analytics)
- SWEMWBS commercial licence confirmation still outstanding (carry-forward blocker from STATE.md)
- k=5 threshold is a placeholder — confirm with stakeholder before shipping

---
*Phase: 16-wellbeing-attention-analytics*
*Completed: 2026-03-25*
