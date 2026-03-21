---
phase: 11-kiosk-mode-and-institutional-pages
plan: 02
subsystem: database, api
tags: [postgres, drizzle, express, jsonb, migration]

# Dependency graph
requires:
  - phase: 11-01
    provides: kiosk context and session management foundation
  - phase: 09-server-foundation
    provides: drizzle schema pattern and migration journal convention
provides:
  - institutions pgTable in schema.ts with slug unique constraint and statsJson JSONB
  - create-institutions-table.mjs idempotent migration script with seed data
  - GET /api/institutions/:slug public endpoint (no auth required)
affects:
  - 11-03 (institution landing page React component fetches from this endpoint)
  - any future admin panel managing institutions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - standalone .mjs migration script using postgres package, CREATE TABLE IF NOT EXISTS, INSERT ON CONFLICT DO NOTHING, marks migration in drizzle.__drizzle_migrations
    - public Express route (no authMiddleware) with slug regex validation before DB query

key-files:
  created:
    - packages/server/src/db/schema.ts (institutions table added)
    - packages/server/scripts/create-institutions-table.mjs
    - packages/server/src/routes/institutions.ts
  modified:
    - packages/server/src/express-app.ts

key-decisions:
  - "statsJson JSONB MVP approach — no live aggregation, stats updated manually or via batch job"
  - "Slug regex /^[a-z0-9-]{2,100}$/ validates before DB query — returns 400, prevents path traversal"
  - "Public endpoint (no auth) — institution landing pages must be accessible without login"
  - "req.params.slug cast to string — Express param type is string | string[], Drizzle eq() requires string"

patterns-established:
  - "Institution route pattern: validate slug format first (400), query with isActive filter, 404 if not found, return subset of columns"

# Metrics
duration: 8min
completed: 2026-03-21
---

# Phase 11 Plan 02: Institutions Database and API Summary

**PostgreSQL institutions table with JSONB stats, idempotent migration script, and public GET /api/institutions/:slug endpoint returning institution data for kiosk landing pages**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-21T15:10:07Z
- **Completed:** 2026-03-21T15:18:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- institutions table in PostgreSQL with unique slug, JSONB stats column, isActive flag, and full timestamps
- Idempotent migration script that creates table, seeds 2 dev institutions (brixton-library, manchester-central), and records migration in drizzle journal
- Public GET /api/institutions/:slug endpoint with slug validation (400), isActive filter, and 404 for unknown slugs
- Route mounted in express-app.ts after challenger routes, before error handler

## Task Commits

Each task was committed atomically:

1. **Task 1: Add institutions table to schema and create migration script** - `842f7bb` (feat)
2. **Task 2: Public institution API endpoint and route wiring** - `65b1f2e` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified
- `packages/server/src/db/schema.ts` - Added institutions pgTable export after challengerOrganisations
- `packages/server/scripts/create-institutions-table.mjs` - Standalone migration: CREATE TABLE IF NOT EXISTS, seed 2 institutions, mark drizzle migration 0004
- `packages/server/src/routes/institutions.ts` - Public GET /:slug route with slug validation and db query
- `packages/server/src/express-app.ts` - Import and mount institutionRoutes at /api/institutions

## Decisions Made
- statsJson JSONB MVP — no live aggregation needed per Phase 11 research; stats can be updated manually or via batch job later
- req.params.slug cast to string — Express types params as `string | string[]` but Drizzle's `eq()` expects `string`; cast is safe because route params are always strings in practice
- Public endpoint (no authMiddleware) — institution landing pages are publicly accessible, matching the kiosk use case where visitors aren't logged in

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cast req.params.slug to string**
- **Found during:** Task 2 (institution route creation)
- **Issue:** TypeScript type error — Express types `req.params.slug` as `string | string[]`, Drizzle `eq()` only accepts `string | SQLWrapper`. Plan specified destructuring `const { slug } = req.params` which triggers the error
- **Fix:** Changed to `const slug = req.params.slug as string` — safe because Express route params are always strings
- **Files modified:** packages/server/src/routes/institutions.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 65b1f2e (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type error bug fix)
**Impact on plan:** Minimal — one-line cast required to satisfy TypeScript. No scope changes.

## Issues Encountered
- `pnpm build` fails due to pre-existing PWA `navigateFallback` workbox error in packages/web — confirmed pre-existing (same error without any of this plan's changes). Server package compiles cleanly.

## User Setup Required
None - no external service configuration required. Migration must be run manually against the dev database:
```
node packages/server/scripts/create-institutions-table.mjs
```
(Already run and verified during this execution.)

## Next Phase Readiness
- institutions table exists in DB with 2 dev seed records
- GET /api/institutions/:slug is live and publicly accessible
- Ready for Plan 03: institution landing page React component that fetches from this endpoint

---
*Phase: 11-kiosk-mode-and-institutional-pages*
*Completed: 2026-03-21*

## Self-Check: PASSED

- packages/server/src/db/schema.ts — FOUND
- packages/server/scripts/create-institutions-table.mjs — FOUND
- packages/server/src/routes/institutions.ts — FOUND
- packages/server/src/express-app.ts — FOUND
- .planning/phases/11-kiosk-mode-and-institutional-pages/11-02-SUMMARY.md — FOUND
- commit 842f7bb — FOUND
- commit 65b1f2e — FOUND
