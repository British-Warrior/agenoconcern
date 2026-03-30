---
phase: 22
plan: 01
subsystem: accessibility
tags: [a11y, aria, screen-reader, wcag, forms, loading-states]
dependency_graph:
  requires: []
  provides:
    - aria-describedby on Register privacy checkbox
    - useAnnounce integration in NotificationBell
    - role=status + aria-busy on 8 skeleton loading states
  affects:
    - packages/web/src/pages/Register.tsx
    - packages/web/src/components/layout/NotificationBell.tsx
    - packages/web/src/pages/Dashboard.tsx
    - packages/web/src/pages/challenger/ChallengerDashboard.tsx
    - packages/web/src/pages/impact/ImpactDashboard.tsx
    - packages/web/src/pages/admin/ContributorDetail.tsx
    - packages/web/src/pages/challenger/ChallengeDetail.tsx
    - packages/web/src/pages/institution/InstitutionLanding.tsx
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/pages/portal/PortalDashboard.tsx
tech_stack:
  added: []
  patterns:
    - aria-describedby + aria-invalid for form field error linkage
    - useAnnounce hook for dynamic badge count changes
    - role=status + aria-busy=true on skeleton wrappers
    - sr-only text inside skeleton wrappers for screen reader identification
key_files:
  created: []
  modified:
    - packages/web/src/pages/Register.tsx
    - packages/web/src/components/layout/NotificationBell.tsx
    - packages/web/src/pages/Dashboard.tsx
    - packages/web/src/pages/challenger/ChallengerDashboard.tsx
    - packages/web/src/pages/impact/ImpactDashboard.tsx
    - packages/web/src/pages/admin/ContributorDetail.tsx
    - packages/web/src/pages/challenger/ChallengeDetail.tsx
    - packages/web/src/pages/institution/InstitutionLanding.tsx
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/pages/portal/PortalDashboard.tsx
decisions:
  - SR-02 gap was only the privacy checkbox — Input.tsx wrapper already handles aria-describedby for all standard inputs; only the raw <input type="checkbox"> was uncovered
  - SR-04: announce fires only on unread count increases (new notifications); decreases (marking read) are silent to avoid noise
  - SR-05: SkeletonCard local functions in Dashboard/ChallengerDashboard/ImpactDashboard received attrs directly on their root div, not on the outer grid container — one announcement per card
  - InstitutionManagement existing role=status spinner already had sr-only text; added aria-busy=true and updated text to "Loading..." for consistency
  - PortalDashboard had two separate loading zones (dashboard stats + attention flags); both received aria-busy; visible text preserved via aria-hidden span
metrics:
  duration_minutes: 4
  completed_date: 2026-03-30
  tasks_completed: 2
  tasks_total: 2
---

# Phase 22 Plan 01: Screen Reader ARIA Completeness — Small-Fix Gaps Summary

**One-liner:** Privacy checkbox error linked via aria-describedby, notification badge increases announced via useAnnounce with prevCountRef guard, and role=status + aria-busy=true added to all 8 skeleton loading states.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SR-02 privacy checkbox error linking + SR-04 badge count announcement | a1fda16 | Register.tsx, NotificationBell.tsx |
| 2 | SR-05 skeleton loading states — role=status and aria-busy | 7fe9569 | Dashboard.tsx, ChallengerDashboard.tsx, ImpactDashboard.tsx, ContributorDetail.tsx, ChallengeDetail.tsx, InstitutionLanding.tsx, InstitutionManagement.tsx, PortalDashboard.tsx |

## What Was Done

### Task 1: SR-02 + SR-04

**Register.tsx (SR-02):**
- Added `aria-describedby={fieldErrors.privacy ? "privacy-consent-error" : undefined}` to the privacy consent `<input type="checkbox">`
- Added `aria-invalid={fieldErrors.privacy ? true : undefined}` to the same checkbox
- Added `id="privacy-consent-error"` to the error `<p>` element (which already had `role="alert"`)
- The Input.tsx wrapper already handles aria-describedby for all standard inputs — this was the only uncovered case

**NotificationBell.tsx (SR-04):**
- Imported `useAnnounce` from `../a11y/AnnounceProvider.js`
- Added `prevCountRef = useRef<number>(unreadCount)` to track previous count
- Added `useEffect` that fires `announce()` only when `unreadCount > prevCountRef.current` (increases only)
- Decreases (user marking items read) produce no announcement

### Task 2: SR-05 — 8 files

**SkeletonCard components (Dashboard, ChallengerDashboard, ImpactDashboard):**
- Added `role="status"`, `aria-busy="true"`, `aria-label="Loading"` to the root skeleton div
- Added `<span className="sr-only">Loading...</span>` as first child

**Inline animate-pulse blocks (ContributorDetail, ChallengeDetail, InstitutionLanding):**
- Added the same four attributes to the outermost `animate-pulse` wrapper

**InstitutionManagement:**
- Existing `role="status"` spinner already had sr-only text; added `aria-busy="true"` and `aria-label="Loading"`

**PortalDashboard:**
- Both loading zones (dashboard stats, attention flags) already had `role="status"`; added `aria-busy="true"`, `aria-label="Loading"`, and `<span className="sr-only">Loading...</span>` to each
- Preserved visible text ("Loading dashboard...", "Loading attention flags...") via `aria-hidden="true"` span so sighted users still see it

## Verification

- `npx tsc --noEmit`: zero errors
- `npm run lint`: zero errors
- Register.tsx: `aria-describedby={fieldErrors.privacy ? "privacy-consent-error" : undefined}` confirmed
- NotificationBell.tsx: `useAnnounce` import + prevCountRef guard confirmed
- All 8 skeleton files: `aria-busy="true"` + `role="status"` confirmed (grep counts: 1+ per file)

## Success Criteria Verification

- [x] SR-02: Register privacy checkbox error linked via aria-describedby and aria-invalid
- [x] SR-03: Already implemented in UploadCV.tsx — confirmed no changes needed
- [x] SR-04: NotificationBell announces increases via useAnnounce; decreases are silent
- [x] SR-05: All 8 skeleton loading states have role=status, aria-busy=true, sr-only Loading text
- [x] FORM-01: Already correct — confirmed no changes needed
- [x] FORM-02: Already correct — confirmed no changes needed
- [x] TypeScript and lint pass cleanly

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files verified to exist and contain required attributes:

- `packages/web/src/pages/Register.tsx` — contains `aria-describedby`
- `packages/web/src/components/layout/NotificationBell.tsx` — contains `useAnnounce`
- `packages/web/src/pages/Dashboard.tsx` — contains `aria-busy`
- `packages/web/src/pages/challenger/ChallengerDashboard.tsx` — contains `aria-busy`
- `packages/web/src/pages/impact/ImpactDashboard.tsx` — contains `aria-busy`
- `packages/web/src/pages/admin/ContributorDetail.tsx` — contains `aria-busy`
- `packages/web/src/pages/challenger/ChallengeDetail.tsx` — contains `aria-busy`
- `packages/web/src/pages/institution/InstitutionLanding.tsx` — contains `aria-busy`
- `packages/web/src/pages/admin/InstitutionManagement.tsx` — contains `aria-busy`
- `packages/web/src/pages/portal/PortalDashboard.tsx` — contains `aria-busy`

Commits a1fda16 and 7fe9569 verified in git log.
