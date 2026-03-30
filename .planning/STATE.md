# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.
**Current focus:** v1.4 WCAG Compliance — Phase 20: Focus Infrastructure

## Current Position

Milestone: v1.4 — WCAG Compliance
Phase: 20 of 23 (Focus Infrastructure) — In progress
Plan: 1 of TBD
Status: In progress
Last activity: 2026-03-30 — Completed 20-01-PLAN.md (accessibility primitives)

Progress: [██░░░░░░░░] 20% (v1.4: 1/5 phases complete; phase 20 plan 1/TBD done)

## Performance Metrics

**Velocity (v1.0-v1.3):**
- Total plans completed: 48 (v1.0: 19, v1.1: 11, v1.2: 10, v1.3: 6, v1.4: 2)
- Average duration: ~15 min
- Total execution time: ~690 min

## Accumulated Context

### Decisions

All v1.0-v1.3 decisions archived in milestones/ and PROJECT.md Key Decisions table.

v1.4 decisions logged to PROJECT.md as they are made.

**19-01 (2026-03-30):**
- RouteChangeSync mounted in all 4 layout shells (AppShell + 3 guard routes) to cover every route entry path
- NavLink `end` prop on all nav items prevents false-positive active states on parent-path matches
- Active nav link gets `text-primary-900 font-semibold` visual treatment alongside aria-current for sighted users
- `type="button"` added to bare Navbar buttons (Enable Notifications, Install App) — prevents accidental form submission

**19-02 (2026-03-30):**
- ESLint flat config format (eslint.config.js) used — required for ESLint 9+
- jsx-a11y/strict preset chosen (strictest available, aligns with WCAG 2.1 AA)
- Interactive list items: button inside li, not onClick on li (NotificationBell refactored)
- Label association pattern: always htmlFor + matching id on paired control

**20-01 (2026-03-30):**
- useFocusTrap: custom hook (no external library) — focusable selectors target 6 element types, re-query on each keydown for dynamic DOM
- Modal: createPortal to document.body, role=dialog on outer container (not inner panel) so backdrop click and trap ref are co-located
- AnnounceProvider: clear-then-set (50ms) forces screen reader re-announcement on duplicate messages; single region at root prevents announcement race conditions
- AnnounceProvider placed inside QueryClientProvider so future mutation hooks can call useAnnounce without context ordering issues

### Pending Todos

None.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before payments go live (carried from v1.1)
- SWEMWBS commercial licence must be confirmed before wellbeing band goes live to institutions
- axe-core covers ~57% of WCAG violations — Phase 23 must include manual keyboard + NVDA testing, not just CI pass

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 20, Plan 1 complete — accessibility primitives done
Resume file: .planning/phases/20-focus-infrastructure/ (begin 20-02)
