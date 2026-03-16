# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** v1.1 Pilot-Ready — Phase 8: Wellbeing Visualisation

## Current Position

Phase: 8 of 11 (Wellbeing Visualisation)
Plan: 1 of 1 complete
Status: Phase complete
Last activity: 2026-03-16 — Completed 08-01-PLAN.md (Recharts WellbeingChart + ImpactDashboard integration)

Progress: [████░░░░░░░░░░░░] v1.1 ~25% (4/16 plans, v1.0 complete)

## Performance Metrics

**Velocity (v1.0 baseline):**
- Total plans completed: 19
- Average duration: ~15 min
- Total execution time: ~290 min

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 4/4 | 31 min | 8 min |
| 02-onboarding-and-profiles | 3/3 | 14 min | 5 min |
| 03-challenges-and-matching | 3/3 | ~115 min | ~38 min |
| 04-circles-and-collaboration | 3/3 | ~38 min | ~13 min |
| 05-payments-and-impact | 3/3 | ~30 min | ~10 min |
| 06-wellbeing-notifications-pwa | 3/3 | ~45 min | ~15 min |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table (updated at v1.0 milestone).

Recent decisions for v1.1:
- Phase 7 Plan 01: All navigation paths defined in ROUTES constants — no hardcoded strings in components
- Phase 7 Plan 01: cursor-pointer applied to raw `<button>` elements only — Button component already includes it
- Phase 7 Plan 02: Combined isLoading from 3 queries into one boolean — single skeleton prevents multiple spinners
- Phase 7 Plan 02: wellbeing-norms.ts is single source of truth for UK norm thresholds (reusable in Phase 8 charts)
- Phase 7 Plan 02: UCLA trend arrows inverted vs SWEMWBS (down=green for UCLA because lower=less lonely)
- Phase 7 Plan 03: UUID_PATTERN defined at module scope across all files — prevents recreation on render
- Phase 7 Plan 03: CircleWorkspace is403 branch keeps hardcoded string; UUID guard only applies to generic fallback path
- Phase 7 Plan 03: "Unknown contributor" fallback for member names (not empty string) — avatar initial uses charAt(0) and needs non-empty value
- Phase 8 Plan 01: recharts 3.x uses TooltipContentProps (not TooltipProps) for custom tooltip content — payload/active/label are omitted from TooltipProps via PropertiesReadFromContext
- Phase 8 Plan 01: Tooltip content prop requires a render function, not a JSX element, to satisfy recharts 3.x type checker
- Phase 9: Postgres enum `ALTER TYPE ADD VALUE` is irreversible — staging deploy verification required before production push
- Phase 10: Challenger registration flow decision (Option A: full account vs Option B: guest submission) — defer to Phase 10 kickoff

### Pending Todos

None.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before payments go live
- WEMWBS licensing — APPROVED by user (2026-03-15), registration pending
- DPIA and Appropriate Policy Document — APPROVED by user (2026-03-15), documents pending
- Phase 9: Postgres enum migration is irreversible — must test on staging before production
- Phase 11: Kiosk session security requires end-to-end verification (network tab + touch device) before any institutional deployment

## Session Continuity

Last session: 2026-03-16
Stopped at: Phase 8 Plan 01 complete — recharts WellbeingChart built and integrated
Resume file: .planning/phases/09-*/
