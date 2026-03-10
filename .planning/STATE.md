# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** Phase 1: Foundation and Auth -- COMPLETE

## Current Position

Phase: 1 of 6 (Foundation and Auth)
Plan: 4 of 4 in current phase
Status: Phase complete
Last activity: 2026-03-10 -- Completed 01-04-PLAN.md (Web UI Shell)

Progress: [████████████] 4/4 plans

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 8 min
- Total execution time: 31 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 4/4 | 31 min | 8 min |

**Recent Trend:**
- Last 5 plans: 01-01 (2 min), 01-02 (11 min), 01-03 (11 min), 01-04 (7 min)
- Trend: stable

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 6-phase structure derived from 50 requirements across 9 categories
- [Roadmap]: Wellbeing check-ins deferred to Phase 6 (DPIA/APD legal work must precede code)
- [Roadmap]: ONBD-07 (first wellbeing at onboarding) grouped with Phase 6 wellbeing, not Phase 2 onboarding
- [01-01]: Shared package consumed as TS source (no build step) -- simpler DX for monorepo
- [01-01]: Lazy database connection -- server starts even without DB
- [01-01]: cm_created auth provider for community-manager-created accounts
- [01-02]: Auth middleware reads access_token cookie and verifies with jose -- ready for Plan 01-03
- [01-02]: MCP server initialised on import, no HTTP transport yet -- added when needed
- [01-02]: Tool stubs return NOT_IMPLEMENTED with received params for debugging
- [01-03]: OAuth redirect URIs use http://localhost:PORT pattern
- [01-03]: All external services degrade gracefully with 501 when env vars missing
- [01-03]: Combined auth service and routes in single files for simplicity at pilot scale
- [01-04]: Tailwind v4 CSS-first config with @theme block -- no tailwind.config.js
- [01-04]: Custom fetch wrapper with auto 401 refresh instead of axios
- [01-04]: OAuth buttons as <a> tags to /api/auth/* for server-side redirects
- [01-04]: ConsentBanner uses localStorage + custom event for reopening

### Pending Todos

None yet.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before Phase 5 payments go live
- WEMWBS licensing (free for non-commercial, but ANC takes platform fees) -- verify with University of Warwick before Phase 6
- DPIA and Appropriate Policy Document must be completed before any wellbeing code in Phase 6

## Session Continuity

Last session: 2026-03-10
Stopped at: Completed Phase 1 (Foundation and Auth), ready for Phase 2
Resume file: .planning/ROADMAP.md (next phase planning)
