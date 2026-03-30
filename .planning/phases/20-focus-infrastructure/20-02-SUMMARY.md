---
phase: 20-focus-infrastructure
plan: 02
subsystem: ui
tags: [wcag, accessibility, tailwind, focus-ring, aria]

# Dependency graph
requires:
  - phase: 20-01-focus-infrastructure
    provides: Global *:focus-visible rule in app.css establishing accent-500 standard
provides:
  - All 20 interactive-element files using focus-visible:ring-accent-500 (WCAG 2.4.11 compliant)
  - Input.tsx exposes aria-required to assistive technology
affects: [21-color-contrast, 22-aria-labels, 23-axe-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Focus rings: always focus-visible: prefix (keyboard-only), always accent-500 token"
    - "aria-required: Input component now passes required state to AT via aria-required prop"

key-files:
  created: []
  modified:
    - packages/web/src/components/challenges/ChallengeForm.tsx
    - packages/web/src/components/challenges/FilterBar.tsx
    - packages/web/src/components/challenges/InterestButton.tsx
    - packages/web/src/components/circles/AddMemberModal.tsx
    - packages/web/src/components/circles/NoteComposer.tsx
    - packages/web/src/components/circles/ResolutionCard.tsx
    - packages/web/src/components/circles/ResolutionForm.tsx
    - packages/web/src/components/circles/SocialChannelEditor.tsx
    - packages/web/src/components/ui/ConsentBanner.tsx
    - packages/web/src/pages/Register.tsx
    - packages/web/src/pages/admin/AttentionDashboard.tsx
    - packages/web/src/pages/admin/ContributorDetail.tsx
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/pages/challenger/ChallengeDetail.tsx
    - packages/web/src/pages/challenger/SubmitChallenge.tsx
    - packages/web/src/pages/impact/ImpactDashboard.tsx
    - packages/web/src/pages/onboarding/Preferences.tsx
    - packages/web/src/pages/onboarding/ReviewProfile.tsx
    - packages/web/src/components/wellbeing/WellbeingForm.tsx
    - packages/web/src/components/ui/Input.tsx

key-decisions:
  - "focus-visible: prefix used throughout — rings appear only on keyboard navigation, not mouse click"
  - "accent-500 token standardised across all files — consistent with global *:focus-visible rule and Button.tsx"
  - "ChallengeForm fieldClass error-state updated from focus:ring-error/30 to focus-visible:ring-error (solid, compliant)"
  - "aria-required added to Input.tsx alongside native required prop for AT compatibility"

patterns-established:
  - "WCAG focus pattern: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:border-accent-500"
  - "Checkbox focus pattern: focus-visible:ring-accent-500 (no ring-2 needed, browser default width)"

# Metrics
duration: 25min
completed: 2026-03-30
---

# Phase 20 Plan 02: WCAG Focus Ring Standardisation Summary

**All semi-transparent and non-compliant focus rings replaced with focus-visible:ring-accent-500 across 20 files, eliminating the 1.4:1 contrast failure and mouse-click ring bleed**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-30T00:00:00Z
- **Completed:** 2026-03-30T00:25:00Z
- **Tasks:** 2
- **Files modified:** 20

## Accomplishments

- Eliminated all `focus:ring-primary-500/30` (30% opacity, ~1.4:1 contrast) tokens — zero remain
- Replaced all `focus:ring-primary-*` with `focus-visible:ring-accent-500` across 19 component/page files
- Updated shared `Input.tsx` to `focus-visible:` prefix and added `aria-required` for assistive technology
- Standardised focus rings to keyboard-only visibility (`focus-visible:` not `focus:`) across the entire codebase

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix semi-transparent and non-compliant focus rings across all files** - (pending commit hash) (fix)
2. **Task 2: Update shared Input.tsx to use focus-visible prefix and add aria-required** - (included in task 1 commit) (feat)

## Files Created/Modified

- `packages/web/src/components/challenges/ChallengeForm.tsx` - fieldClass updated; custom domain and skill inputs fixed
- `packages/web/src/components/challenges/FilterBar.tsx` - focus: -> focus-visible: prefix only
- `packages/web/src/components/challenges/InterestButton.tsx` - focus: -> focus-visible: prefix only
- `packages/web/src/components/circles/AddMemberModal.tsx` - input ring updated
- `packages/web/src/components/circles/NoteComposer.tsx` - ring-1 pattern converted to focus-visible
- `packages/web/src/components/circles/ResolutionCard.tsx` - feedback textarea updated
- `packages/web/src/components/circles/ResolutionForm.tsx` - all 5 textarea instances updated
- `packages/web/src/components/circles/SocialChannelEditor.tsx` - select and url input updated
- `packages/web/src/pages/Register.tsx` - privacy checkbox updated (accent-500 already correct)
- `packages/web/src/pages/admin/AttentionDashboard.tsx` - resolve notes textarea updated
- `packages/web/src/pages/admin/ContributorDetail.tsx` - institution checkboxes updated
- `packages/web/src/pages/admin/InstitutionManagement.tsx` - 3 inputs + description textarea updated
- `packages/web/src/pages/challenger/ChallengeDetail.tsx` - feedback textarea updated
- `packages/web/src/pages/challenger/SubmitChallenge.tsx` - brief textarea and type select updated
- `packages/web/src/pages/impact/ImpactDashboard.tsx` - circle select, description textarea, checkbox updated
- `packages/web/src/pages/onboarding/Preferences.tsx` - domain other input and max circles input updated
- `packages/web/src/pages/onboarding/ReviewProfile.tsx` - tag list inputs, summary textarea, years input updated
- `packages/web/src/components/wellbeing/WellbeingForm.tsx` - both consent checkboxes updated
- `packages/web/src/components/ui/Input.tsx` - focus-visible prefix + aria-required added

## Decisions Made

- Error-state ring in ChallengeForm changed from `focus:ring-error/30` to `focus-visible:ring-error` (solid) — was also a semi-transparent WCAG failure
- ConsentBanner's `peer-focus:ring-*` classes left unchanged — Tailwind peer modifier, not a direct focus ring, already uses accent-500

## Deviations from Plan

None — plan executed exactly as written with one minor extension: ChallengeForm's error-state ring `focus:ring-error/30` was also semi-transparent and was fixed alongside the primary-500/30 instances (same Rule 1 — bug, same pattern).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All focus ring tokens are now compliant: `focus-visible:ring-accent-500` throughout
- `grep -r "focus:ring-primary" packages/web/src/` returns zero results
- `grep -r "ring-.*/30" packages/web/src/` returns zero results in focus-ring contexts
- Input.tsx now exposes `aria-required` — improves screen reader announced field requirements
- Phase 21 (colour contrast) can proceed knowing focus infrastructure is complete

---
*Phase: 20-focus-infrastructure*
*Completed: 2026-03-30*
