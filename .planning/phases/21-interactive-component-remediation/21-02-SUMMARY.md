---
phase: 21-interactive-component-remediation
plan: 02
subsystem: ui
tags: [react, wcag, aria, keyboard-navigation, notifications]

# Dependency graph
requires:
  - phase: 20-focus-infrastructure
    provides: useFocusTrap hook and focus-visible ring infrastructure
provides:
  - NotificationBell fully keyboard-operable with aria-expanded, Escape handler, and menu roles
affects: [phase-22, phase-23-wcag-audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Disclosure dropdown: aria-expanded on trigger, role=menu on panel, role=menuitem on items"
    - "Focus-on-open: useEffect with setTimeout(0) to wait one render tick before querying focusable element"
    - "Escape-to-close: document keydown listener (scoped to open=true), restores focus to trigger via ref"

key-files:
  created: []
  modified:
    - packages/web/src/components/layout/NotificationBell.tsx

key-decisions:
  - "Used disclosure pattern (not modal) — Tab flows naturally through items, no focus trap needed"
  - "bellRef + panelRef co-located in same component — no cross-component focus handoff required"
  - "role=menu + role=menuitem chosen over listbox/option — matches intent (action items, not selection)"

patterns-established:
  - "Disclosure trigger pattern: aria-expanded={open} + aria-haspopup='true' on button, role='menu' on panel"

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 21 Plan 02: NotificationBell Keyboard Operability Summary

**NotificationBell dropdown made fully keyboard-operable with aria-expanded, Escape-to-close with focus return, auto-focus on open, and role=menu/menuitem ARIA structure.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-30T00:00:00Z
- **Completed:** 2026-03-30T00:08:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Bell button gains `aria-expanded={open}` and `aria-haspopup="true"` — screen readers announce state on toggle
- Escape keydown handler (scoped to `open=true`) closes dropdown and returns focus to bell button via `bellRef`
- Dropdown panel auto-focuses first interactive element on open via `useEffect` + `setTimeout(0)`
- Dropdown panel gets `role="menu"` + `aria-label="Notifications"`; all interactive items get `role="menuitem"`
- TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add keyboard operability and aria-expanded to NotificationBell** - `af345e6` (feat)

## Files Created/Modified

- `packages/web/src/components/layout/NotificationBell.tsx` - aria-expanded, Escape handler, focus management, menu roles

## Decisions Made

- Used disclosure pattern (not modal/dialog) — Tab flows naturally through buttons inside the dropdown, no focus trap needed
- `role="menu"` + `role="menuitem"` chosen over `listbox`/`option` because items are actions (navigate/mark read), not selections
- `bellRef` and `panelRef` co-located in the same component — no cross-component focus handoff complexity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- NotificationBell satisfies KBD-04 and KBD-05 requirements
- Plan 21-03 can proceed with remaining interactive components
- Established disclosure trigger pattern (aria-expanded + role=menu + Escape) should be applied to any future dropdown components

---
*Phase: 21-interactive-component-remediation*
*Completed: 2026-03-30*
