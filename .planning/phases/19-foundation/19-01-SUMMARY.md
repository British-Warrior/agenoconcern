---
phase: 19-foundation
plan: 01
subsystem: ui
tags: [react, react-router, accessibility, wcag, aria, css]

# Dependency graph
requires: []
provides:
  - RouteChangeSync component — focuses main h1 on every SPA route change
  - Navbar NavLink with automatic aria-current="page" on active route
  - prefers-reduced-motion CSS suppressing all animations/transitions
  - lang="en" confirmed on html element
affects: [20-semantic-structure, 21-interactive-components, 22-forms-and-errors, 23-audit-and-ci]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SPA route focus: RouteChangeSync queries main h1, sets tabIndex=-1, calls focus() on pathname change"
    - "NavLink active styling: className render-prop with isActive for visual + aria-current=page"
    - "Reduced motion: global @media prefers-reduced-motion in app.css with !important overrides"

key-files:
  created:
    - packages/web/src/components/a11y/RouteChangeSync.tsx
  modified:
    - packages/web/src/components/layout/AppShell.tsx
    - packages/web/src/components/layout/CMRoute.tsx
    - packages/web/src/components/layout/ChallengerRoute.tsx
    - packages/web/src/components/layout/InstitutionPortalRoute.tsx
    - packages/web/src/components/layout/Navbar.tsx
    - packages/web/src/styles/app.css

key-decisions:
  - "RouteChangeSync mounted in all 4 layout shells (AppShell, CMRoute, ChallengerRoute, InstitutionPortalRoute) to cover all route guard paths"
  - "NavLink with end prop used for all nav items to prevent parent-path false-positive active state"
  - "Active nav link visually distinguished (text-primary-900 font-semibold) in addition to aria-current"

patterns-established:
  - "a11y components live in packages/web/src/components/a11y/"
  - "RouteChangeSync is a null-render effect component — no DOM output, side-effect only"

# Metrics
duration: 12min
completed: 2026-03-30
---

# Phase 19 Plan 01: Accessibility Foundation Summary

**SPA focus-sync on route change via RouteChangeSync, NavLink aria-current on all nav items, prefers-reduced-motion CSS, and lang="en" verified across all 4 layout shells**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-03-30T~09:00Z
- **Completed:** 2026-03-30
- **Tasks:** 2 of 2
- **Files modified:** 6 (1 created)

## Accomplishments

- Created RouteChangeSync component that focuses `main h1` on every pathname change — screen readers announce the new page name on SPA navigation
- Mounted RouteChangeSync in all 4 layout shells covering every authenticated and unauthenticated route path
- Converted all 7 authenticated Navbar Links to NavLink with `end` prop — React Router automatically sets `aria-current="page"` on the active link
- Added global `@media (prefers-reduced-motion: reduce)` rule to app.css covering all animation and transition properties
- Confirmed `<html lang="en">` already present in index.html — no change needed

## Task Commits

Each task was committed atomically:

1. **Task 1: RouteChangeSync component, mount in all layout shells** - `d37b78c` (feat)
2. **Task 2: Navbar NavLink with aria-current, reduced-motion CSS** - `7e3f197` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `packages/web/src/components/a11y/RouteChangeSync.tsx` — New: null-render effect component, focuses main h1 on route change
- `packages/web/src/components/layout/AppShell.tsx` — Added RouteChangeSync import + render before Outlet inside main
- `packages/web/src/components/layout/CMRoute.tsx` — Wrapped Outlet return with RouteChangeSync Fragment
- `packages/web/src/components/layout/ChallengerRoute.tsx` — Wrapped Outlet return with RouteChangeSync Fragment
- `packages/web/src/components/layout/InstitutionPortalRoute.tsx` — Wrapped Outlet return with RouteChangeSync Fragment
- `packages/web/src/components/layout/Navbar.tsx` — Converted authenticated nav Links to NavLink with end prop + active styling; added type=button to bare buttons
- `packages/web/src/styles/app.css` — Added prefers-reduced-motion media query block

## Decisions Made

- NavLink `end` prop applied to all nav items to prevent the dashboard route matching as active when navigating to sub-routes
- Active link visual treatment (`text-primary-900 font-semibold`) added alongside `aria-current` so sighted users also see the current page indicator
- `type="button"` added to Enable Notifications and Install App buttons (correct hygiene — bare `<button>` defaults to `type="submit"` which can trigger form submissions)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Route focus sync is live across all shells — Phase 20 semantic structure work can rely on `main h1` being present and focusable
- Reduced motion is global — any animated components added in Phase 21+ are automatically suppressed for users with that OS preference
- NavLink aria-current is in place — Phase 23 axe-core audit will pass the active-link check without further work

---
*Phase: 19-foundation*
*Completed: 2026-03-30*
