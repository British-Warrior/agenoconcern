---
phase: 12-institution-data-foundation
plan: 01
subsystem: database
tags: [postgres, drizzle-orm, zod, migration, junction-table]

# Dependency graph
requires:
  - phase: 11-kiosk-institutional
    provides: institutions table in PostgreSQL and Drizzle schema

provides:
  - contributor_institutions junction table with composite unique constraint and FK indexes
  - contributorInstitutions Drizzle table export in server/src/db/schema.ts
  - createInstitutionSchema, updateInstitutionSchema, toggleActiveSchema, setContributorInstitutionsSchema in shared package

affects:
  - 12-02 (institution admin API routes use junction table and Zod schemas)
  - 12-03 (institution stats aggregation queries contributor_institutions)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Junction table migration: idempotent CREATE TABLE IF NOT EXISTS with ON CONFLICT DO NOTHING for migration marker"
    - "Drizzle FK onDelete uses spaced string 'set null' not camelCase 'setNull'"
    - "Institution slug omitted from create/update schemas — immutable after creation (kiosk QR codes)"

key-files:
  created:
    - packages/server/scripts/create-contributor-institutions.mjs
    - packages/shared/src/schemas/institution.ts
  modified:
    - packages/server/src/db/schema.ts
    - packages/shared/src/index.ts

key-decisions:
  - "Many-to-many junction table (not single FK on contributors) — per CONTEXT.md override of roadmap"
  - "Slug excluded from createInstitutionSchema and updateInstitutionSchema — immutable after creation"
  - "setContributorInstitutionsSchema accepts full array (PUT semantics) for transaction-based assignment replacement"

patterns-established:
  - "contributorInstitutions follows circleMembers pattern: pgTable with unique constraint in third arg array"
  - "Migration hash format: 0005_contributor-institutions (incrementing prefix, kebab-case name)"

# Metrics
duration: 2min
completed: 2026-03-23
---

# Phase 12 Plan 01: Institution Data Foundation Summary

**contributor_institutions many-to-many junction table with Drizzle schema and four shared Zod validation schemas for institution CRUD and contributor assignment**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-23T06:09:36Z
- **Completed:** 2026-03-23T06:11:24Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- contributor_institutions table in PostgreSQL with composite unique constraint, cascade deletes, and FK indexes (idx_ci_contributor_id, idx_ci_institution_id)
- contributorInstitutions exported from server Drizzle schema following circleMembers pattern with assignedBy nullable FK
- Four Zod schemas in shared package: createInstitutionSchema, updateInstitutionSchema, toggleActiveSchema, setContributorInstitutionsSchema — all excluding slug (immutable)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create junction table migration and update Drizzle schema** - `b0e9b9a` (feat)
2. **Task 2: Create shared Zod schemas for institution management** - `38fe061` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `packages/server/scripts/create-contributor-institutions.mjs` - Idempotent migration: creates contributor_institutions table, FK indexes, marks in drizzle migrations journal
- `packages/server/src/db/schema.ts` - Added contributorInstitutions table export after institutions definition
- `packages/shared/src/schemas/institution.ts` - Four Zod schemas for institution management
- `packages/shared/src/index.ts` - Re-exports all institution schemas and TypeScript inferred types

## Decisions Made

- Used many-to-many junction table (not single FK on contributors.institution_id) — CONTEXT.md overrides roadmap item; this enables future multi-institution assignments
- Slug excluded from all create/update schemas — slug is auto-generated server-side from name and immutable after creation (kiosk QR code dependency)
- setContributorInstitutionsSchema uses full array (PUT semantics) — caller sends complete new list, server replaces in transaction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Drizzle FK onDelete value for assignedBy field**
- **Found during:** Task 1 (Drizzle schema update)
- **Issue:** Used `onDelete: "setNull"` (camelCase) — TypeScript error TS2820, correct value is `"set null"` (spaced)
- **Fix:** Changed `"setNull"` to `"set null"` in contributorInstitutions.assignedBy FK reference
- **Files modified:** packages/server/src/db/schema.ts
- **Verification:** `cd packages/server && npx tsc --noEmit` passes with no errors
- **Committed in:** b0e9b9a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug fix)
**Impact on plan:** Single-character typo in Drizzle FK option string. No scope creep.

## Issues Encountered

None beyond the auto-fixed Drizzle onDelete typo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Junction table and shared schemas ready for Phase 12 Plan 02 (institution admin API routes)
- contributorInstitutions Drizzle export enables typed query building in server routes
- setContributorInstitutionsSchema directly usable as request body validator for PUT /contributors/:id/institutions endpoint
- No blockers

---
*Phase: 12-institution-data-foundation*
*Completed: 2026-03-23*
