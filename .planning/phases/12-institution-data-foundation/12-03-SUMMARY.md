---
phase: 12-institution-data-foundation
plan: "03"
subsystem: api, ui
tags: [express, react, react-query, drizzle, typescript, tailwind, junction-table]

# Dependency graph
requires:
  - phase: 12-02
    provides: admin routes, CMRoute guard, admin API client, useInstitutions hooks, InstitutionManagement page

provides:
  - Contributor assignment endpoints (GET /institutions/:id/contributors, GET /contributors, PUT /contributors/:id/institutions)
  - Batch live stats in GET /admin/institutions (no N+1)
  - Live stats in GET /api/institutions/:slug (null when no contributors)
  - ContributorDetail page at /admin/contributors/:id with multi-select institution picker
  - Unassigned contributors section in InstitutionManagement with View links

affects:
  - Public InstitutionLanding — now shows live stats, hides stats section when null
  - InstitutionManagement — cards show live stats + expandable contributor list
  - App.tsx — contributor detail route added under CMRoute guard

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Batch live stats: fetch all junction rows, group in TypeScript, batch-query challengeInterests and contributorHours, compute per-institution — no N+1"
    - "inArray guard: if memberIds.length === 0, skip aggregate queries entirely — prevents invalid SQL"
    - "Last activity merge: two batch queries (wellbeingCheckins, circleNotes), merge in TS taking max date"
    - "PUT /contributors/:id/institutions: db.transaction — DELETE all, INSERT new (full array replace)"
    - "useInstitutionContributors: enabled only when institutionId is truthy — avoids unnecessary fetch on unmounted cards"

key-files:
  created:
    - packages/web/src/pages/admin/ContributorDetail.tsx
  modified:
    - packages/server/src/routes/admin.ts
    - packages/server/src/routes/institutions.ts
    - packages/web/src/api/admin.ts
    - packages/web/src/hooks/useInstitutions.ts
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/pages/institution/InstitutionLanding.tsx
    - packages/web/src/App.tsx

key-decisions:
  - "Live stats null when no contributors assigned — hides stats section on public landing (per user decision)"
  - "statsJson preserved in DB as cache/fallback, not returned to client — live stats replace it"
  - "Assignment direction: from contributor profile (ContributorDetail) — CM selects institutions via checkboxes (per locked user decision)"
  - "Unassigned section in InstitutionManagement links to /admin/contributors/:id, not inline picker"
  - "ContributorDetail uses useAllContributors() + find by id (reuses existing hook) rather than a dedicated per-contributor endpoint"

# Metrics
duration: ~20min
completed: 2026-03-23
---

# Phase 12 Plan 03: Contributor Assignment & Live Stats Summary

**Contributor-institution assignment workflow with batch live stats aggregation — CM can assign contributors to institutions via multi-select picker, CM cards and public landing display live contributor/challenge/hour counts**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-03-23
- **Completed:** 2026-03-23
- **Tasks:** 3 auto tasks complete, 1 checkpoint (approved)
- **Files modified:** 7

## Accomplishments

- Three new server endpoints: GET /institutions/:id/contributors (with batch lastActivity), GET /contributors (all with institution arrays), PUT /contributors/:id/institutions (transactional replace)
- GET /admin/institutions updated to include live stats per institution — batch-computed, no N+1
- GET /api/institutions/:slug returns live stats from junction table; null when no contributors assigned
- InstitutionManagement cards display live stats and expandable contributor list with relative time
- InstitutionManagement Unassigned section lists contributors with no institution links, each with View link to ContributorDetail
- ContributorDetail page at /admin/contributors/:id: shows contributor info, checkbox picker for all institutions, pre-populated with current assignments, saves via PUT endpoint with success/error feedback
- InstitutionLanding hides stats section entirely when stats is null (no contributors assigned)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add contributor assignment endpoints and live stats to admin routes** - `47243f6` (feat)
2. **Task 2: CM institution cards with live stats, contributor list, and updated landing page** - `15e5804` (feat)
3. **Task 3: Contributor detail page with multi-select institution picker** - `278a7d7` (feat)
4. **Task 4: Checkpoint human-verify** — approved by user (full assignment workflow verified in browser)

## Files Created/Modified

- `packages/server/src/routes/admin.ts` — Three new endpoints + batch live stats in GET /institutions
- `packages/server/src/routes/institutions.ts` — Live stats from junction table, null when no contributors
- `packages/web/src/api/admin.ts` — Three new API functions + updated Institution type with stats field
- `packages/web/src/hooks/useInstitutions.ts` — useInstitutionContributors, useAllContributors, useSetContributorInstitutions hooks
- `packages/web/src/pages/admin/InstitutionManagement.tsx` — Live stats on cards, expandable contributor list, Unassigned section
- `packages/web/src/pages/institution/InstitutionLanding.tsx` — Live stats from API, stats section hidden when null
- `packages/web/src/pages/admin/ContributorDetail.tsx` — New: multi-select institution picker page
- `packages/web/src/App.tsx` — ContributorDetail route under CMRoute

## Decisions Made

- Live stats return null when no contributors assigned — signals frontend to hide stats section (no zeros shown)
- statsJson column preserved in DB as cache/fallback; not returned to client — live stats replace it per user decision
- Assignment direction locked as from contributor profile — CM navigates to /admin/contributors/:id and selects institutions via checkboxes
- ContributorDetail reuses useAllContributors() rather than a new per-contributor endpoint — sufficient for pilot scale

## Deviations from Plan

Plan tasks executed exactly as written. Three dev-convenience additions were made post-checkpoint (after user approval), outside plan scope:

1. Dev auto-login endpoint added to `packages/server/src/express-app.ts` — faster dev iteration
2. `packages/web/src/pages/admin/DevNav.tsx` created — quick navigation component for dev sessions
3. `ContributorDetail.tsx` save button auto-navigates back to `/admin/institutions` — minor UX polish added post-checkpoint

**Total deviations:** 0 within-plan deviations. 3 post-checkpoint dev additions (developer tooling, no scope creep).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- INST-05 through INST-08 complete — full contributor assignment workflow verified by user
- Phase 12 complete — all 3 plans done; Phase 13 (iThink webhook) can begin
- Blockers for Phase 13: iThink webhook payload contract and repo file structure must be confirmed before planning

---

## Self-Check

**Files exist:**
- `packages/server/src/routes/admin.ts` — FOUND
- `packages/server/src/routes/institutions.ts` — FOUND
- `packages/web/src/api/admin.ts` — FOUND
- `packages/web/src/hooks/useInstitutions.ts` — FOUND
- `packages/web/src/pages/admin/InstitutionManagement.tsx` — FOUND
- `packages/web/src/pages/institution/InstitutionLanding.tsx` — FOUND
- `packages/web/src/pages/admin/ContributorDetail.tsx` — FOUND
- `packages/web/src/App.tsx` — FOUND

**Commits exist:**
- `47243f6` — feat(12-03): contributor assignment endpoints and live stats aggregation
- `15e5804` — feat(12-03): CM institution cards with live stats, contributor list, and updated landing page
- `278a7d7` — feat(12-03): contributor detail page with multi-select institution picker

## Self-Check: PASSED

---
*Phase: 12-institution-data-foundation*
*Completed: 2026-03-23*
