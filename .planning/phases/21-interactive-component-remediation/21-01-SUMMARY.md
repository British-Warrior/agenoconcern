---
phase: 21-interactive-component-remediation
plan: 01
subsystem: ui
tags: [react, wcag, aria, modal, focus-trap, a11y]

# Dependency graph
requires:
  - phase: 20-focus-infrastructure
    provides: Modal wrapper (useFocusTrap, createPortal, role=dialog, Escape-close, backdrop-close)
provides:
  - CircleFormationModal using shared Modal wrapper (focus trap + Escape-close)
  - AddMemberModal using shared Modal wrapper (focus trap + Escape-close, state reset on close)
  - ConfirmDialog in InstitutionManagement using shared Modal wrapper
  - aria-expanded on ConsentBanner Manage Preferences toggle
  - aria-expanded on ManageChallengeRow View Interests and View Team Suggestions buttons
affects: [23-wcag-audit, any phase adding new modals or disclosure widgets]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - All modals delegate role=dialog, aria-modal, backdrop, focus trap to Modal wrapper — consumers only provide isOpen/onClose/titleId and content
    - Non-Radix disclosure buttons carry aria-expanded={stateVar} synced to their controlled boolean
    - ConsentBanner Manage Preferences button always rendered (not conditionally hidden) — toggles state with aria-expanded

key-files:
  created: []
  modified:
    - packages/web/src/components/circles/CircleFormationModal.tsx
    - packages/web/src/components/circles/AddMemberModal.tsx
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/components/ui/ConsentBanner.tsx
    - packages/web/src/components/challenges/ManageChallengeRow.tsx

key-decisions:
  - "ConfirmDialog keeps isOpen=true inside Modal because it is only conditionally mounted by parent — simpler than adding isOpen prop and changing call site"
  - "AddMemberModal passes handleClose (not onClose) to Modal so Escape/backdrop click triggers local state reset (contributorId, error, success) alongside onClose"
  - "ConsentBanner Manage Preferences button moved outside {!showPreferences && ...} guard — always rendered to provide complete aria-expanded disclosure pattern"

patterns-established:
  - "Modal consumer pattern: import Modal, remove own role=dialog/aria-modal/fixed/backdrop, wrap content in <Modal isOpen onClose titleId>"
  - "Disclosure pattern: aria-expanded={stateVar} on button, button text reflects state (View/Hide)"

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 21 Plan 01: Interactive Component Remediation — Modal Migrations and aria-expanded Summary

**Three modal dialogs migrated to shared Modal wrapper (focus trap + Escape-close), plus aria-expanded added to all non-Radix disclosure buttons**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T14:00:00Z
- **Completed:** 2026-03-30T14:15:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- CircleFormationModal, AddMemberModal, and ConfirmDialog now render through shared Modal wrapper — keyboard focus is trapped and Escape closes all three
- Eliminated duplicate role=dialog/aria-modal/backdrop/fixed-positioning from three consumer files
- ConsentBanner "Manage Preferences" button reports aria-expanded, text toggles to "Hide Preferences" when open
- ManageChallengeRow "View Interests" and "View Team Suggestions" buttons both report aria-expanded state

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate CircleFormationModal, AddMemberModal, ConfirmDialog to shared Modal wrapper** - `924b82a` (feat)
2. **Task 2: Add aria-expanded to ConsentBanner and ManageChallengeRow disclosure buttons** - `e25c608` (feat)

## Files Created/Modified
- `packages/web/src/components/circles/CircleFormationModal.tsx` - Migrated to Modal wrapper; removed own role=dialog, backdrop, fixed positioning
- `packages/web/src/components/circles/AddMemberModal.tsx` - Migrated to Modal wrapper; handleClose passed as onClose for full state reset on Escape/backdrop
- `packages/web/src/pages/admin/InstitutionManagement.tsx` - Added Modal import; ConfirmDialog now uses Modal with isOpen=true/onClose=onCancel
- `packages/web/src/components/ui/ConsentBanner.tsx` - Manage Preferences button always rendered, toggles state, aria-expanded added
- `packages/web/src/components/challenges/ManageChallengeRow.tsx` - aria-expanded added to View Interests and View Team Suggestions buttons

## Decisions Made
- ConfirmDialog keeps `isOpen={true}` inside Modal because it is only conditionally mounted by the parent (`{confirmToggle && <ConfirmDialog />}`) — simpler than adding an isOpen prop and changing the call site
- AddMemberModal passes `handleClose` (not `onClose`) to Modal so Escape/backdrop click triggers local state reset (contributorId, error, success) alongside the parent's close callback
- ConsentBanner Manage Preferences button moved outside the `{!showPreferences && ...}` conditional to provide a complete disclosure pattern with aria-expanded; text toggles between "Manage Preferences" and "Hide Preferences"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three application modals now use the shared Modal wrapper — focus trapping and Escape-close work via the wrapper (WCAG SC 2.1.2 and 3.2.2)
- All non-Radix disclosure toggles have aria-expanded (Radix Accordion/Collapsible handle this internally)
- Ready for Phase 21 Plan 02 (remaining WCAG interactive component work)

---
*Phase: 21-interactive-component-remediation*
*Completed: 2026-03-30*
