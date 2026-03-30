# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-30)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.
**Current focus:** v1.4 WCAG Compliance — Phase 19: Foundation

## Current Position

Milestone: v1.4 — WCAG Compliance
Phase: 19 of 23 (Foundation)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-03-30 — Completed 19-02-PLAN.md (ESLint + jsx-a11y baseline)

Progress: [██░░░░░░░░] ~10% (2/21 plans)

## Performance Metrics

**Velocity (v1.0-v1.3):**
- Total plans completed: 46 (v1.0: 19, v1.1: 11, v1.2: 10, v1.3: 6)
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

### Pending Todos

None.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before payments go live (carried from v1.1)
- SWEMWBS commercial licence must be confirmed before wellbeing band goes live to institutions
- axe-core covers ~57% of WCAG violations — Phase 23 must include manual keyboard + NVDA testing, not just CI pass

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 19 complete — both plans done
Resume file: None (Phase 19 complete, begin Phase 20)
