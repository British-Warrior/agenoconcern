---
phase: 14-cm-attention-dashboard
plan: 01
subsystem: api
tags: [drizzle-orm, postgres, zod, express, attention-flags, institution-scoping]

# Dependency graph
requires:
  - phase: 13-ithink-webhook-integration
    provides: ithink_attention_flags table with clearedBy/clearedAt/followUpNotes fields
  - phase: 12-institution-data-foundation
    provides: contributor_institutions junction table and adminRouter pattern
provides:
  - GET /api/admin/attention — institution-scoped unresolved attention flags
  - GET /api/admin/attention/history — institution-scoped all flags (including resolved)
  - POST /api/admin/attention/:flagId/resolve — clear flag with follow-up notes
affects: [14-02-PLAN.md, 14-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CM institution lookup via contributorInstitutions LIMIT 1 before any flag query
    - Cross-institution enumeration prevention via single 404 for missing OR foreign-institution flags
    - Route ordering: /attention/history before /attention/:flagId to prevent param collision

key-files:
  created: []
  modified:
    - packages/server/src/routes/admin.ts

key-decisions:
  - "Phase 14 Plan 01: /attention/history registered before /:flagId — Express route order prevents 'history' being matched as a UUID param"
  - "Phase 14 Plan 01: Flag fetch checks both id AND institutionId in WHERE — same 404 for non-existent or cross-institution flag (prevents enumeration)"
  - "Phase 14 Plan 01: LIMIT 1 on CM institution lookup is pilot-scale assumption — one CM manages one institution"

patterns-established:
  - "Attention route pattern: lookup CM institution → scope all queries by institutionId (never by query param)"

# Metrics
duration: 9min
completed: 2026-03-23
---

# Phase 14 Plan 01: CM Attention Dashboard API Summary

**Three institution-scoped attention flag routes on adminRouter: GET active flags, GET full history, POST resolve with Zod-validated follow-up notes and 409 idempotency guard**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-03-23T21:09:22Z
- **Completed:** 2026-03-23T21:18:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- GET /attention returns only unresolved flags (clearedAt IS NULL) scoped to CM's institution via DB join
- GET /attention/history returns all flags including resolved, ordered by createdAt DESC
- POST /attention/:flagId/resolve validates UUID param, enforces Zod schema (non-empty followUpNotes), checks institution scope, detects already-resolved with 409, updates with cmId + timestamp
- TypeScript compiles without errors

## Task Commits

Both tasks were implemented in the same file edit (sequential tasks on same file):

1. **Task 1: GET /attention + GET /attention/history routes** - `9d549a4` (feat)
2. **Task 2: POST /attention/:flagId/resolve route** - `9d549a4` (feat — committed with Task 1, same file edit)

## Files Created/Modified
- `packages/server/src/routes/admin.ts` — Added `ithinkAttentionFlags` import, `desc` from drizzle-orm, `z` from zod, `resolveAttentionFlagSchema` Zod schema, and three new routes at end of file

## Decisions Made
- `/attention/history` registered before `/:flagId` — Express matches routes in order, so registering "history" as a literal path before the param route prevents it being captured as a UUID
- Flag lookup in resolve route checks `id AND institutionId` together — single 404 response whether flag doesn't exist or belongs to a different institution, preventing cross-institution enumeration
- LIMIT 1 on CM institution assignment lookup is a documented pilot-scale assumption (one CM per institution)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- All three API routes ready for Phase 14 Plan 02 (frontend CM Attention Dashboard)
- Routes protected by existing `router.use(authMiddleware, requireRole("community_manager"))` at top of adminRouter

---
*Phase: 14-cm-attention-dashboard*
*Completed: 2026-03-23*
