# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** Phase 2: Onboarding and Profiles

## Current Position

Phase: 2 of 6 (Onboarding and Profiles)
Plan: 3 of 3 in current phase (tasks 1-2 complete, awaiting checkpoint verification)
Status: Checkpoint — awaiting human verification
Last activity: 2026-03-11 -- Tasks 1-2 of 02-03-PLAN.md complete (Preferences, Stripe, Complete pages)

Progress: [██████████████░░] 6/8 plans (phase 1 complete + plans 2-01, 2-02; 2-03 in checkpoint)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 6 min
- Total execution time: 40 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 4/4 | 31 min | 8 min |
| 02-onboarding-and-profiles | 2/3 | 9 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-03 (11 min), 01-04 (7 min), 02-01 (5 min), 02-02 (4 min)
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
- [02-02]: react-dropzone used for file drag-and-drop -- minimal API, well-maintained
- [02-02]: Image files (JPG/PNG) route through server OCR path; documents route through presigned S3 PUT then start-parse
- [02-02]: Dashboard redirects to /onboarding/upload when contributor.status === 'onboarding'
- [02-02]: Parsing page animated step labels advance on timer independent of polling -- labels advance on time, not API response
- [02-02]: Affirmation page falls back to generic message if affirmationMessage not in profile

### Pending Todos

None yet.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before Phase 5 payments go live
- WEMWBS licensing (free for non-commercial, but ANC takes platform fees) -- verify with University of Warwick before Phase 6
- DPIA and Appropriate Policy Document must be completed before any wellbeing code in Phase 6

## Session Continuity

Last session: 2026-03-11
Stopped at: 02-03 Task 3 checkpoint (human-verify) -- tasks 1 (fedd899) and 2 (9732fc1) committed
Resume file: .planning/phases/02-onboarding-and-profiles/02-03-PLAN.md
