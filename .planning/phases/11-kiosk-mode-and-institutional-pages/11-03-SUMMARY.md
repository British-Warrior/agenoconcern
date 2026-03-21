---
phase: 11-kiosk-mode-and-institutional-pages
plan: "03"
subsystem: web-frontend
tags: [react, tanstack-query, routing, kiosk, institution]

# Dependency graph
requires:
  - phase: 11-01
    provides: KioskProvider with ?kiosk=true URL param detection
  - phase: 11-02
    provides: GET /api/institutions/:slug public endpoint + institutions DB table
provides:
  - InstitutionLanding React page component at /i/:slug
  - ROUTES.INSTITUTION function constant and INSTITUTION_BASE string
  - Public /i/:slug route in App.tsx (outside ProtectedRoute)
affects:
  - any future admin panel or institution management feature

# Tech tracking
tech-stack:
  added: []
  patterns:
    - NotFoundError subclass for distinguishing 404 from network errors in useQuery retry logic
    - Institution page links to ROUTES.LOGIN + ?kiosk=true — kiosk auto-activation without importing KioskContext

key-files:
  created:
    - packages/web/src/pages/institution/InstitutionLanding.tsx
  modified:
    - packages/web/src/lib/constants.ts
    - packages/web/src/App.tsx

key-decisions:
  - "InstitutionLanding does not import useKiosk — it links to ?kiosk=true, KioskProvider from Plan 01 handles detection"
  - "NotFoundError subclass used to prevent useQuery retrying on 404 responses"
  - "INSTITUTION constant is a function (slug) => string — not a static string — because paths are parameterised"

patterns-established:
  - "Parameterised ROUTES: function-shaped constant (slug: string) => /i/${slug} for dynamic paths"

# Metrics
status: awaiting-checkpoint
completed: 2026-03-21
---

# Phase 11 Plan 03: Institution Landing Page Summary

**Public /i/:slug React page with useQuery fetch, animated skeleton loader, 3-column impact stats grid, and Get Started CTA linking to /login?kiosk=true for automatic kiosk activation**

## Status: Awaiting Checkpoint (human-verify)

Task 1 is complete and committed. Task 2 is a `checkpoint:human-verify` — human verification of the full kiosk flow is required before this plan can be marked complete.

## Performance

- **Started:** 2026-03-21
- **Tasks completed so far:** 1 of 2 (Task 2 is checkpoint:human-verify)
- **Files modified:** 3

## Accomplishments
- Created `InstitutionLanding.tsx` — fetches institution data via TanStack Query, renders name, city, description, and 3 stat cards (Contributors, Challenges, Hours Contributed)
- Added `ROUTES.INSTITUTION` function constant and `INSTITUTION_BASE` string to `constants.ts`
- Wired `/i/:slug` public route into `App.tsx` outside `ProtectedRoute`
- "Get Started" CTA links to `/login?kiosk=true` — kiosk mode activates via the KioskProvider from Plan 01 without InstitutionLanding needing to know about it

## Task Commits

1. **Task 1: InstitutionLanding page, route constant, and App.tsx routing** - `09af2ff` (feat)
2. **Task 2: checkpoint:human-verify** — pending human verification

## Files Created/Modified
- `packages/web/src/pages/institution/InstitutionLanding.tsx` - Public institution landing page with skeleton loader, 404/error states, stat cards, and kiosk CTA
- `packages/web/src/lib/constants.ts` - Added ROUTES.INSTITUTION function and INSTITUTION_BASE
- `packages/web/src/App.tsx` - Added import + /i/:slug route among public routes

## Decisions Made
- InstitutionLanding does not import `useKiosk` — it simply sets `?kiosk=true` on the login link. The KioskProvider (Plan 01) detects the param and activates kiosk mode. This keeps the landing page decoupled from kiosk internals.
- `NotFoundError` subclass allows `useQuery` retry callback to return `false` on 404, avoiding unnecessary retries for clearly absent institutions.
- `ROUTES.INSTITUTION` is a function `(slug: string) => \`/i/\${slug}\`` — matches the parameterised route pattern.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. The /api/institutions/:slug endpoint (Plan 02) must be running with the migration applied (already done in Plan 02).

## Next Phase Readiness

Awaiting human verification of the full kiosk flow:
- /i/:slug institution pages render correctly
- "Get Started" → /login?kiosk=true kiosk activation works end-to-end
- Idle timer countdown and auto-logout verified
- No private data remaining after kiosk logout

---
*Phase: 11-kiosk-mode-and-institutional-pages*
*Status: Awaiting checkpoint (human-verify)*

## Self-Check: PASSED

- FOUND: packages/web/src/pages/institution/InstitutionLanding.tsx
- FOUND: packages/web/src/lib/constants.ts (INSTITUTION constant)
- FOUND: packages/web/src/App.tsx (/i/:slug route)
- FOUND: commit 09af2ff
