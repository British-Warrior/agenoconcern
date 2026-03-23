---
phase: 12-institution-data-foundation
plan: "02"
subsystem: ui, api
tags: [express, react, react-query, tailwind, drizzle, zod, typescript]

# Dependency graph
requires:
  - phase: 12-01
    provides: institutions table, contributorInstitutions junction, shared Zod schemas (createInstitutionSchema, updateInstitutionSchema, toggleActiveSchema)

provides:
  - Admin Express router at /api/admin — GET/POST/PUT/PATCH institution endpoints, all protected by authMiddleware + requireRole("community_manager")
  - CMRoute.tsx — route guard for community_manager + admin roles
  - admin.ts API client — typed fetch wrappers for institution CRUD
  - useInstitutions.ts — React Query hooks (useInstitutions, useCreateInstitution, useUpdateInstitution, useToggleActive)
  - InstitutionManagement.tsx — card-grid page with inline create/edit and toggle confirmation dialog at /admin/institutions
  - Navbar admin link visible only to CM/admin roles

affects:
  - 12-03 (contributor count will replace 0 placeholder in InstitutionManagement)
  - Future CM-facing admin features that follow the CMRoute guard pattern

# Tech tracking
tech-stack:
  added: []
  patterns:
    - CMRoute guard pattern (mirrors ChallengerRoute — check role, redirect to /dashboard)
    - Admin router with router.use(authMiddleware, requireRole(...)) at top — all routes inherit protection
    - React Query invalidation pattern — all mutations invalidate ["admin", "institutions"] on success
    - Inline card editing with editingId state (no separate page/route)
    - Toggle confirmation dialog using fixed overlay (mirrors KioskWarningOverlay pattern)

key-files:
  created:
    - packages/server/src/routes/admin.ts
    - packages/web/src/components/layout/CMRoute.tsx
    - packages/web/src/api/admin.ts
    - packages/web/src/hooks/useInstitutions.ts
    - packages/web/src/pages/admin/InstitutionManagement.tsx
  modified:
    - packages/server/src/express-app.ts
    - packages/web/src/components/layout/Navbar.tsx
    - packages/web/src/App.tsx

key-decisions:
  - "Slug immutable after creation — ignored in PUT /institutions/:id body"
  - "router.use(authMiddleware, requireRole) at top of adminRouter — all routes automatically protected"
  - "Card grid (not table) per user decision — 1/2/3 col responsive via Tailwind grid"
  - "Inline editing via editingId state (not separate page) per user decision"
  - "contributor count shows 0 placeholder — Plan 12-03 adds live aggregation"

patterns-established:
  - "CMRoute: check role community_manager OR admin, redirect to /dashboard otherwise"
  - "Admin API client follows same apiClient pattern as circles.ts and challenges.ts"
  - "useToggleActive mutation shape: { id, isActive } — consistent with backend PATCH body"

# Metrics
duration: 25min
completed: 2026-03-23
---

# Phase 12 Plan 02: CM Institution Management UI Summary

**Express CRUD API for institutions at /api/admin plus React card-grid UI with inline editing, toggle confirmation dialog, and CMRoute guard — enables INST-01 through INST-04**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-23
- **Completed:** 2026-03-23
- **Tasks:** 2 of 2 auto tasks complete (checkpoint pending human verify)
- **Files modified:** 8

## Accomplishments
- Four protected admin API endpoints: GET list, POST create, PUT update, PATCH toggle active — all guarded by community_manager role
- CM institution management page at /admin/institutions with responsive card grid, inline create/edit, and toggle with confirmation dialog
- CMRoute guard redirects non-CM users to /dashboard; Navbar Admin link only visible to CM/admin

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin API routes for institution CRUD** - `3101ee8` (feat)
2. **Task 2: CM route guard, admin API client, React Query hooks, institution management page, and Navbar admin link** - `276c390` (feat)

## Files Created/Modified
- `packages/server/src/routes/admin.ts` — Institution CRUD endpoints (GET, POST, PUT, PATCH /active), all protected by CM role middleware
- `packages/server/src/express-app.ts` — Mounts adminRouter at /api/admin
- `packages/web/src/components/layout/CMRoute.tsx` — Route guard for community_manager + admin roles
- `packages/web/src/api/admin.ts` — Typed API client for admin institution CRUD
- `packages/web/src/hooks/useInstitutions.ts` — React Query hooks for institution CRUD with cache invalidation
- `packages/web/src/pages/admin/InstitutionManagement.tsx` — Card grid page with inline create/edit, toggle switch, confirmation dialog
- `packages/web/src/components/layout/Navbar.tsx` — Added conditional Admin nav link
- `packages/web/src/App.tsx` — Added CMRoute + InstitutionManagement route at /admin/institutions

## Decisions Made
- Slug is excluded from PUT body processing — immutable after creation to preserve kiosk QR code URLs
- adminRouter uses router.use(authMiddleware, requireRole("community_manager")) at top so every route inherits protection automatically
- Contributor count in card shows 0 placeholder — Plan 12-03 will add live aggregation query

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- /admin/institutions fully functional for INST-01 through INST-04
- Plan 12-03 can add live contributor count to institution cards (replace 0 placeholder)
- CMRoute pattern ready to wrap future admin pages

---
*Phase: 12-institution-data-foundation*
*Completed: 2026-03-23*
