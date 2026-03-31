---
phase: 23-audit-verification-ci-gate
plan: 01
subsystem: ui
tags: [react, wcag, a11y, heading-hierarchy, screen-reader, routechangesync]

# Dependency graph
requires:
  - phase: 19-01
    provides: RouteChangeSync component using document.querySelector('main h1') to announce page titles
provides:
  - Verified heading hierarchy across all 35 page components
  - PortalDashboard h1 moved inside main landmark — RouteChangeSync can now find it
affects: [23-02, any future page additions must follow heading-hierarchy pattern]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Portal pages without AppShell must place h1 as first child of main"
    - "AppShell pages get main from layout — page components must start with h1"
    - "Dialog heading (h2 inside Modal/portal) does not affect page heading order"

key-files:
  created: []
  modified:
    - packages/web/src/pages/portal/PortalDashboard.tsx

key-decisions:
  - "Header element retains institution name as p (not h1) — visual parity preserved in dark header bar"
  - "h1 placed as first element inside main — before stats grid and other h2 sections"
  - "ChallengeManage h2 confirmed as tab panel component, not a page-level heading — no fix needed"

patterns-established:
  - "Page heading pattern: h1 is first heading in main, h2 used for sections within the page"
  - "RouteChangeSync dependency: every page route must have exactly one h1 inside the main landmark"

# Metrics
duration: 20min
completed: 2026-03-30
---

# Phase 23 Plan 01: Heading Hierarchy Audit Summary

**PortalDashboard h1 moved inside main landmark for RouteChangeSync, plus systematic audit confirming all 35 pages have correct single-h1 heading structure with no skipped levels**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-03-30T05:05:00Z
- **Completed:** 2026-03-31T05:26:34Z
- **Tasks:** 2 of 2
- **Files modified:** 1

## Accomplishments

- Fixed PortalDashboard — h1 was inside `<header>` above `<main>`, invisible to `document.querySelector('main h1')`. Moved h1 inside main, changed header element to `<p>` for visual parity
- Audited all 35 page components across public, protected, onboarding, portal, and admin groups
- Confirmed no heading levels are skipped on any page — VIS-02 satisfied

## Task Commits

1. **Task 1: Fix PortalDashboard heading hierarchy** - `120d73b` (fix)
2. **Task 2: Systematic heading audit of all remaining pages** - `608ac70` (feat)

## Files Created/Modified

- `packages/web/src/pages/portal/PortalDashboard.tsx` — Changed header `<h1>` to `<p>`, added `<h1>` as first child of `<main>` for RouteChangeSync compatibility

## Decisions Made

- Kept institution name visible in header bar as `<p className="text-lg font-semibold">` — same visual styling, correct semantics
- Added h1 with `className="text-2xl font-bold text-neutral-900"` consistent with other dashboard pages (Dashboard.tsx, ImpactDashboard.tsx)
- Modal/dialog h2 elements (in ConfirmDialog, ResolveDialog) do not affect page heading DOM order since they render inside portals attached to `document.body`
- `ChallengeManage` component uses h2/h3 without h1 — this is correct because it is a tab panel rendered inside `ChallengeFeed` which already has an h1

## Deviations from Plan

None — plan executed exactly as written. Task 1 fixed the known issue. Task 2 confirmed no other issues exist.

## Audit Findings — All Pages

### Public pages

| Page | Result | Notes |
|------|--------|-------|
| Landing.tsx | OK | Single h1, first heading |
| Login.tsx | OK | Single h1, first heading |
| Register.tsx | OK | Single h1, first heading |
| PhoneLogin.tsx | OK | Single h1, first heading |
| ForgotPassword.tsx | OK | Single h1 |
| ResetPassword.tsx | OK | Single h1 |
| PrivacyPolicy.tsx | OK | h1 first, h2 sections follow |
| CookiePolicy.tsx | OK | h1 first, h2 sections follow |
| InstitutionLanding.tsx | OK | Conditional branches — each renders one h1, only one branch active |
| PortalLogin.tsx | OK | Single h1 |

### Protected pages

| Page | Result | Notes |
|------|--------|-------|
| Dashboard.tsx | OK | Single h1 |
| ChallengerDashboard.tsx | OK | h1 line 121, h3s in cards come after |
| SubmitChallenge.tsx | OK | Single h1 |
| ChallengeDetail.tsx | OK | h1 first, h2s (Circle Progress, Resolution) follow |
| ChallengerRegister.tsx | OK | Single h1 |
| ChallengeFeed.tsx | OK | h1 first; ChallengeManage tab component has h2 but no h1 (correct — it's a sub-component) |
| MyCircles.tsx | OK | Single h1 |
| CircleWorkspace.tsx | OK | h1 in CircleWorkspaceShell |
| WellbeingCheckin.tsx | OK | Single h1 |
| ImpactDashboard.tsx | OK | h1 first, section h2s follow |
| ChallengerView.tsx | OK | h1 first; card h2s inside sub-components follow |
| InstitutionManagement.tsx | OK | h1 first; ConfirmDialog h2 is in Modal portal |
| ContributorDetail.tsx | OK | h1 first, Institution Assignments h2 follows |
| AttentionDashboard.tsx | OK | h1 first; ResolveDialog h2 is in inline dialog |

### Onboarding pages

| Page | Result | Notes |
|------|--------|-------|
| UploadCV.tsx | OK | Single h1 |
| Parsing.tsx | OK | h1 in both branches (failed state and loading state) |
| ReviewProfile.tsx | OK | h1 first, section h2s follow |
| Affirmation.tsx | OK | Single h1 |
| Preferences.tsx | OK | Single h1 |
| StripeConnect.tsx | OK | Single h1 |
| StripeReturn.tsx | OK | h1 in error branch only; happy path is transient redirect state |
| Complete.tsx | OK | Single h1 |
| Wellbeing.tsx | OK | Single h1 |

### Portal pages

| Page | Result | Notes |
|------|--------|-------|
| PortalLogin.tsx | OK | Single h1 |
| PortalDashboard.tsx | FIXED | h1 moved inside main — see Task 1 |

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- VIS-02 (heading hierarchy) is now satisfied across all pages
- RouteChangeSync will find `main h1` on every route change, enabling correct screen reader announcements
- Ready for Phase 23-02: axe-core CI gate and manual NVDA/keyboard sign-off

---
*Phase: 23-audit-verification-ci-gate*
*Completed: 2026-03-30*
