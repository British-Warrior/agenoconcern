---
phase: 02-onboarding-and-profiles
plan: 03
subsystem: web-onboarding
tags: [react, tanstack-query, stripe-connect, domain-taxonomy, form, routing]
dependency_graph:
  requires:
    - 02-02 (onboarding frontend — upload, parsing, review, affirmation)
    - 02-01 (onboarding API backend — preferences, Stripe Connect, skip endpoints)
  provides:
    - Preferences page with availability, domain taxonomy, max Circles, mentoring, communication prefs
    - StripeConnect page with choice-focused framing and skip option
    - Complete page with 5-second auto-redirect to Dashboard
    - Full end-to-end onboarding flow routing
    - Status-based redirect: onboarding contributors routed into flow, active contributors land on Dashboard
  affects:
    - App.tsx routing
    - Dashboard redirect behaviour
    - Any future feature accessing contributor preferences
tech_stack:
  added: []
  patterns:
    - Status-based redirect guard at Dashboard entry point
    - Choice-focused framing for optional external service prompts (Stripe)
    - Auth query invalidation on status-changing mutations (active after preferences save or Stripe skip)
key_files:
  created:
    - packages/web/src/pages/onboarding/Preferences.tsx
    - packages/web/src/pages/onboarding/StripeConnect.tsx
    - packages/web/src/pages/onboarding/Complete.tsx
  modified:
    - packages/web/src/hooks/useOnboarding.ts
    - packages/web/src/App.tsx
decisions:
  - "[02-03]: dotenv added to server for .env loading from repo root (loaded in config/env.ts)"
  - "[02-03]: S3 configured with real AWS credentials for CV storage"
  - "[02-03]: useSavePreferences invalidates both profile and auth queries -- status change from onboarding to active reflected immediately"
  - "[02-03]: Complete page uses a 5-second countdown with auto-redirect; no manual step required"
  - "[02-03]: Dashboard does not re-check availability field to detect mid-flow drop-off -- onboarding status alone drives the redirect"
metrics:
  duration: 5 min
  completed: 2026-03-11
  tasks_completed: 2
  tasks_total: 2 (plus human-verify checkpoint)
---

# Phase 2 Plan 3: Onboarding Flow Completion — Preferences, Stripe Connect, and Active Status Summary

**Final three onboarding screens plus end-to-end routing: Preferences form with DOMAIN_TAXONOMY checkboxes, choice-framed Stripe Connect prompt with skip, 5-second auto-redirecting Complete page, and status-based Dashboard guard.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-11T10:59:21Z
- **Completed:** 2026-03-11T11:00:13Z
- **Tasks:** 2 (plus 1 human-verify checkpoint — approved)
- **Files modified:** 5

## Accomplishments

- Preferences page collects all required fields: availability (radio, 4 options), domain preferences (DOMAIN_TAXONOMY checkboxes + free-text Other), max Circles (number, 1-10, default 3), mentoring willingness (checkbox), communication channel and frequency (radios)
- StripeConnect page uses choice-focused neutral framing with equally prominent "Set up payments" and "Set up later" buttons — neither path blocks onboarding completion
- Complete page celebrates with a 5-second countdown auto-redirect to Dashboard; handles both Stripe-connected and Stripe-skipped flows identically
- Full onboarding routing wired: App.tsx ComingSoon placeholders replaced with real components; Dashboard guards against onboarding-status contributors accessing it prematurely
- Human verification confirmed full end-to-end flow (register → upload → parse → review → affirm → preferences → Stripe prompt → skip → complete → Dashboard) works and feels affirming

## Task Commits

Each task was committed atomically:

1. **Task 1: Preferences, Stripe Connect, and Complete pages** - `fedd899` (feat)
2. **Task 2: Onboarding flow routing and status-based redirects** - `9732fc1` (feat)

## Files Created/Modified

- `packages/web/src/pages/onboarding/Preferences.tsx` - Availability, domain taxonomy checkboxes, max Circles, mentoring, communication prefs form (304 lines)
- `packages/web/src/pages/onboarding/StripeConnect.tsx` - Choice-focused Stripe Connect prompt with skip option (114 lines)
- `packages/web/src/pages/onboarding/Complete.tsx` - Celebration page with 5-second auto-redirect to Dashboard (62 lines)
- `packages/web/src/hooks/useOnboarding.ts` - Added useSavePreferences, useStartStripeConnect, useSkipStripe hooks (+48 lines)
- `packages/web/src/App.tsx` - Replaced ComingSoon placeholders with Preferences, StripeConnect, Complete; removed ComingSoon helper

## Decisions Made

- dotenv added to server for `.env` loading from repo root — required for real AWS and OpenAI keys to load in development
- S3 configured with real AWS credentials for CV storage (not mocked)
- `useSavePreferences` invalidates both `profile` and `auth` queries on success so the status change (onboarding → active) is reflected immediately in the Dashboard redirect guard without a page reload
- Complete page uses 5-second auto-redirect with visible countdown — no friction, no manual navigation required
- Dashboard onboarding redirect checks `contributor.status === "onboarding"` only (does not inspect availability field) — simpler and sufficient; mid-flow drop-off can be handled later if analytics show it is a real pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no new external service configuration required for this plan. AWS S3 and Stripe keys were already configured during plan 02-01.

## Next Phase Readiness

Phase 2 (Onboarding and Profiles) is fully complete. The end-to-end contributor onboarding flow is verified:
- New contributor registers → redirected into onboarding → uploads CV → profile parsed and reviewed → affirmed → sets preferences → prompted for Stripe (skippable) → marked active → lands on Dashboard
- All 7 ONBD requirements covered (ONBD-01 through ONBD-06, ONBD-08; ONBD-07 deferred to Phase 6 per roadmap decision)

Phase 3 can begin immediately. Blockers from STATE.md remain:
- Employment Agencies Act 1973 classification needs legal advice before Phase 5 payments go live
- WEMWBS licensing must be verified before Phase 6

## Self-Check

**Files exist:**
- packages/web/src/pages/onboarding/Preferences.tsx — created in fedd899
- packages/web/src/pages/onboarding/StripeConnect.tsx — created in fedd899
- packages/web/src/pages/onboarding/Complete.tsx — created in fedd899
- packages/web/src/hooks/useOnboarding.ts — modified in fedd899
- packages/web/src/App.tsx — modified in 9732fc1

**Commits verified:** fedd899 and 9732fc1 confirmed in git log.

## Self-Check: PASSED

---
*Phase: 02-onboarding-and-profiles*
*Completed: 2026-03-11*
