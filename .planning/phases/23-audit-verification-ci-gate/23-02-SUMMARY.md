---
phase: 23-audit-verification-ci-gate
plan: 02
subsystem: e2e, ci, ui
tags: [axe-core, playwright, a11y, wcag, ci, keyboard-nav, github-actions]

# Dependency graph
requires:
  - phase: 23-01
    provides: Verified heading hierarchy across all 35 page components
provides:
  - axe-core Playwright e2e test suite scanning all public pages
  - GitHub Actions CI workflow gating PRs with accessibility tests
  - Manual keyboard walkthrough sign-off for 5 primary flows
affects: [any future page additions must pass axe-core CI gate]

# Tech tracking
tech-stack:
  added:
    - "@axe-core/playwright ^4.11.1"
    - "@playwright/test ^1.58.0"
  patterns:
    - "axe fixture with wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice tags"
    - "CI: pnpm setup before node setup, build before preview"

key-files:
  created:
    - .github/workflows/a11y.yml
    - packages/e2e/package.json
    - packages/e2e/tsconfig.json
    - packages/e2e/playwright.config.ts
    - packages/e2e/fixtures/axe.ts
    - packages/e2e/tests/a11y-public.spec.ts
    - packages/e2e/tests/a11y-headings.spec.ts
  modified:
    - packages/server/src/middleware/api-key-auth.ts
    - packages/web/src/components/challenges/ChallengeRow.tsx
    - packages/web/src/components/layout/AppShell.tsx
    - packages/web/src/components/wellbeing/WellbeingForm.tsx
    - packages/web/src/pages/CookiePolicy.tsx
    - packages/web/src/pages/Landing.tsx
    - packages/web/src/pages/PrivacyPolicy.tsx
    - packages/web/src/pages/portal/PortalLogin.tsx

key-decisions:
  - "best-practice tag included in axe fixture — heading-order and page-has-heading-one are best-practice, not wcag2aa"
  - "CI uses vite preview on port 4173, dev uses port 5173 — matches Vite defaults"
  - "Chromium-only for CI — sufficient for axe-core rule coverage"

patterns-established:
  - "All new pages must pass axe-core scan with zero violations"
  - "Public pages array maintained in e2e tests — update when adding new unauthenticated routes"

# Metrics
duration: ~30min
completed: 2026-04-16
---

# Phase 23 Plan 02: axe-core CI Gate & Manual Sign-off Summary

**axe-core Playwright tests scanning all public pages with CI gate on every PR, plus a11y fixes for focus rings, rate limiter, and keyboard visibility — manual keyboard walkthrough approved**

## Performance

- **Duration:** ~30 min (automated tasks) + manual sign-off
- **Commits:** `16ece66` (e2e package setup), `8757775` (CI gate + a11y fixes)
- **Tasks:** 3 of 3
- **Files created:** 7
- **Files modified:** 8

## Accomplishments

- Created `packages/e2e` workspace with @axe-core/playwright scanning all public pages for WCAG 2.2 AA + best-practice violations
- Created heading hierarchy test suite verifying single h1 and no skipped heading levels per page
- Created GitHub Actions CI workflow (`.github/workflows/a11y.yml`) gating every PR with axe tests
- Fixed rate limiter IPv6 validation error in api-key-auth middleware
- Removed overflow-hidden clipping focus rings on ChallengeRow cards
- Added focus-within outlines to WellbeingForm radio labels for keyboard visibility
- Fixed minor a11y issues on Landing, CookiePolicy, PrivacyPolicy, PortalLogin, and AppShell
- Manual keyboard walkthrough of 5 primary flows completed and approved

## Task Commits

1. **Task 1: Create e2e workspace with axe-core tests** — `16ece66` (chore) + `8757775` (feat)
2. **Task 2: Create GitHub Actions CI workflow** — `8757775` (feat)
3. **Task 3: Manual keyboard and screen reader sign-off** — Approved by user 2026-04-16

## A11y Fixes (discovered during axe testing)

- `api-key-auth.ts` — Fixed IPv6 address validation in rate limiter
- `ChallengeRow.tsx` — Removed overflow-hidden that clipped focus rings
- `AppShell.tsx` — Minor a11y improvement
- `WellbeingForm.tsx` — Added focus-within ring to radio labels for keyboard users
- `CookiePolicy.tsx`, `Landing.tsx`, `PrivacyPolicy.tsx`, `PortalLogin.tsx` — Minor a11y fixes

## Deviations from Plan

- Additional a11y fixes were needed beyond just the test infrastructure — axe scans revealed pre-existing issues that were fixed inline

## Issues Encountered

None blocking.

## Next Phase Readiness

- Phase 23 (final phase of v1.4) is now complete
- All automated axe-core tests pass on public pages
- CI gate will catch regressions on future PRs
- Manual keyboard sign-off confirmed all 5 primary flows work
- v1.4 WCAG Compliance milestone is ready for completion

---
*Phase: 23-audit-verification-ci-gate*
*Completed: 2026-04-16*
