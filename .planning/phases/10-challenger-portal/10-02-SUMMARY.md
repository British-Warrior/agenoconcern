---
phase: 10-challenger-portal
plan: "02"
subsystem: web-ui
tags: [react, challenger-portal, routing, forms, react-query]
dependency_graph:
  requires: [10-01]
  provides: [challenger-portal-ui]
  affects: [web-routing, auth-flow]
tech_stack:
  added: []
  patterns: [react-query-mutations, zod-client-validation, route-guards, csv-to-array-input]
key_files:
  created:
    - packages/web/src/api/challenger.ts
    - packages/web/src/hooks/useChallenger.ts
    - packages/web/src/components/layout/ChallengerRoute.tsx
    - packages/web/src/pages/challenger/ChallengerRegister.tsx
    - packages/web/src/pages/challenger/ChallengerDashboard.tsx
    - packages/web/src/pages/challenger/SubmitChallenge.tsx
    - packages/web/src/pages/challenger/ChallengeDetail.tsx
  modified:
    - packages/web/src/components/layout/ProtectedRoute.tsx
    - packages/web/src/lib/constants.ts
    - packages/web/src/App.tsx
decisions:
  - "ChallengerRoute redirects unauthenticated users to /challenger/register, not /login — challengers have their own registration path"
  - "SubmitChallenge uses comma-separated text inputs for domain and skillsNeeded arrays, consistent with existing skillsNeeded UX patterns"
  - "RatingForm is a self-contained sub-component in ChallengeDetail — avoids prop drilling and encapsulates mutation state"
  - "useRateResolution from useCircles.ts reused — endpoint already existed, no duplicate needed"
metrics:
  duration: "7 min"
  completed_date: "2026-03-16"
  tasks_completed: 3
  tasks_total: 3
  status: complete
---

# Phase 10 Plan 02: Challenger Portal UI Summary

**One-liner:** React challenger portal — registration form, challenge submission, status dashboard, circle progress view, and resolution star rating, all behind a ChallengerRoute guard at /challenger/*.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | API client, React Query hooks, ChallengerRoute guard, routing setup | `4b83f4d` | Done |
| 2 | Challenger portal pages — Register, Dashboard, Submit, Detail | `9767d3d` | Done |
| 3 | Human verification checkpoint | — | Approved (2026-03-21) |

## What Was Built

### API Client (`packages/web/src/api/challenger.ts`)
- `challengerApi` object with 5 methods mapping to all `/api/challenger/*` endpoints
- Follows same pattern as `challenges.ts` — thin wrappers around `apiClient`

### React Query Hooks (`packages/web/src/hooks/useChallenger.ts`)
- `useRegisterChallenger()` — mutation, invalidates `["auth", "me"]` on success
- `useChallengerOrg()` — query for org data
- `useMyChallengerChallenges()` — query for all org's challenges
- `useChallengeDetail(id)` — query with enabled guard
- `useSubmitChallenge()` — mutation, invalidates `["challenger", "challenges"]`

### ChallengerRoute Guard (`packages/web/src/components/layout/ChallengerRoute.tsx`)
- Loading spinner while auth resolves
- Unauthenticated → redirects to `/challenger/register`
- Authenticated but not challenger/admin → redirects to `/dashboard`
- Challenger/admin → renders `<Outlet />`

### ProtectedRoute Update
- Added challenger-role redirect: if role is `challenger` and not already on `/challenger`, redirects to `/challenger`

### Pages
- **ChallengerRegister**: Full form (contactName, email, password, organisationName, organisationType) with `registerChallengerSchema` Zod validation, API error display, redirects to dashboard on success
- **ChallengerDashboard**: Org name in header, challenge cards with status badges (amber/emerald/sky/neutral), circle info inline, skeleton loading, empty state
- **SubmitChallenge**: Form with domain/skills as comma-separated inputs (split to arrays on submit), type select, optional deadline + circle size, `submitChallengerChallengeSchema` validation, success message then navigate
- **ChallengeDetail**: Full challenge details, circle progress section (status badge, member count, member name list with avatar initials), resolution section (submitted date, rating display or rating form with star selector + feedback textarea)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in ChallengeDetail `instanceof` check**
- **Found during:** TypeScript verification after Task 2
- **Issue:** `error` from `useQuery` is typed as `Error | null`, not `unknown`, so `instanceof ApiResponseError` was a type error on the left-hand side
- **Fix:** Simplified the 404 check to `if (error || !challenge)` — sufficient because query errors propagate and challenge will be undefined
- **Files modified:** `packages/web/src/pages/challenger/ChallengeDetail.tsx`
- **Commit:** included in `9767d3d`

## Auth Gates

None — dev server was already running on port 3000.

## Self-Check: PASSED

All 7 created files found. Both task commits (4b83f4d, 9767d3d) verified in git log.
