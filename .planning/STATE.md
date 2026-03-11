# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** Phase 1: Foundation and Auth -- COMPLETE

## Current Position

Phase: 2 of 6 (Onboarding and Profiles)
Plan: 1 of 3 in current phase
Status: In progress
Last activity: 2026-03-11 -- Completed 02-01-PLAN.md (Onboarding Backend)

Progress: [████████████░░░░] 5/7 plans (phase 1 complete + plan 2-01)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 7 min
- Total execution time: 36 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 4/4 | 31 min | 8 min |
| 02-onboarding-and-profiles | 1/3 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-02 (11 min), 01-03 (11 min), 01-04 (7 min), 02-01 (5 min)
- Trend: accelerating

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
- [02-01]: pdf-parse v2 uses PDFParse class API ({ data: buffer }) not old default function
- [02-01]: OpenAI structured output uses client.chat.completions.parse (not beta.chat)
- [02-01]: CV parsing is fire-and-forget; frontend polls /parse-status/:jobId
- [02-01]: Stripe Connect skippable; both /stripe/skip and /preferences set status to active
- [02-01]: DOMAIN_TAXONOMY fixed array in shared constants; free-text Other in UI only

### Pending Todos

None yet.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before Phase 5 payments go live
- WEMWBS licensing (free for non-commercial, but ANC takes platform fees) -- verify with University of Warwick before Phase 6
- DPIA and Appropriate Policy Document must be completed before any wellbeing code in Phase 6

## Session Continuity

Last session: 2026-03-11
Stopped at: Completed 02-01 (Onboarding Backend), ready for 02-02 (Onboarding Frontend)
Resume file: .planning/phases/02-onboarding-and-profiles/02-02-PLAN.md
