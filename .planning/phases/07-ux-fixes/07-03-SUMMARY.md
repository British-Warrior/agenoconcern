---
phase: 07-ux-fixes
plan: 03
subsystem: ui
tags: [react, role-gates, error-handling, uuid-sanitisation, circles]

# Dependency graph
requires:
  - phase: 07-ux-fixes-01
    provides: Navigation fixes and role-gate patterns established in phase
provides:
  - Role-conditional empty state and subtitle in MyCircles for CM vs contributor
  - UUID-safe error messages in CircleFormationModal, CircleWorkspace, InterestButton
  - Edit Resolution button with disabled state when form is already open
  - "Unknown contributor" fallback for missing/UUID member names in CircleFormationModal
affects: [circles, challenges, ux-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UUID_PATTERN const at module level, applied in error display and name display paths"
    - "isCM derived from contributor.role === community_manager || admin — same pattern as ChallengeFeed"
    - "disabled={showEditForm} + conditional className for visual disabled state on action buttons"

key-files:
  created: []
  modified:
    - packages/web/src/pages/circles/MyCircles.tsx
    - packages/web/src/components/circles/ResolutionCard.tsx
    - packages/web/src/components/circles/CircleFormationModal.tsx
    - packages/web/src/pages/circles/CircleWorkspace.tsx
    - packages/web/src/components/challenges/InterestButton.tsx

key-decisions:
  - "UUID_PATTERN defined at module scope (not inside component) to avoid recreation on render"
  - "CircleWorkspace uses safeMessage variable so is403 branch still shows hardcoded string (UUID guard applies only to generic fallback)"
  - "displayName fallback is 'Unknown contributor' not empty string — avatar initial uses charAt(0) so needs non-empty value"

patterns-established:
  - "UUID guard pattern: const safeMessage = rawMessage && !UUID_PATTERN.test(rawMessage) ? rawMessage : 'Fallback message'"
  - "Role-conditional empty state: isCM ? (<CM content>) : (<contributor content>) with separate heading, subtext, and CTA"

# Metrics
duration: 15min
completed: 2026-03-16
---

# Phase 7 Plan 03: UX Fixes — Circles Role Gates and Error Sanitisation Summary

**CM role-conditional circles page, UUID-scrubbed error messages across 4 components, and disabled-state Edit Resolution button**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-16
- **Completed:** 2026-03-16
- **Tasks:** 2 of 2
- **Files modified:** 5

## Accomplishments

- MyCircles shows role-appropriate empty state: CM sees "No Circles formed yet" + Manage Challenges CTA; contributor sees existing "Express interest" copy
- UUID_PATTERN guard added to CircleFormationModal, CircleWorkspace, and InterestButton — raw UUIDs can no longer surface as user-facing error messages
- Edit Resolution button in ResolutionCard is visually disabled (opacity-50, cursor-not-allowed) when the edit form is already open
- CircleFormationModal renders "Unknown contributor" for missing or UUID-valued member names, with correct avatar initial fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Add CM role-conditional content to MyCircles page** - `02ff835` (feat)
2. **Task 2: Fix Edit Resolution button state and sanitise error messages** - `42cb6f5` (fix)

**Plan metadata:** pending (docs commit below)

## Files Created/Modified

- `packages/web/src/pages/circles/MyCircles.tsx` - Added useAuth import, isCM derivation, role-conditional subtitle and empty state
- `packages/web/src/components/circles/ResolutionCard.tsx` - Edit Resolution button gets disabled={showEditForm} and conditional opacity/cursor styles
- `packages/web/src/components/circles/CircleFormationModal.tsx` - UUID_PATTERN, displayName guard for member list, UUID guard on error display
- `packages/web/src/pages/circles/CircleWorkspace.tsx` - UUID_PATTERN, safeMessage variable for generic error path
- `packages/web/src/components/challenges/InterestButton.tsx` - UUID_PATTERN, UUID guard in both catch blocks (handleExpress + handleWithdraw)

## Decisions Made

- UUID_PATTERN defined at module scope to avoid recreation on every render
- In CircleWorkspace, the is403 branch continues to use its hardcoded string — UUID guard only applies to the generic non-403 fallback path
- "Unknown contributor" chosen over empty string as the displayName fallback because `charAt(0)` is used for the avatar initial and needs a non-empty value

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 7 (UX Fixes) is complete — all 3 plans done
- Phase 8 (Wellbeing charts) can proceed; wellbeing-norms.ts singleton from Plan 02 is ready for reuse
- No blockers introduced by this plan

---
*Phase: 07-ux-fixes*
*Completed: 2026-03-16*
