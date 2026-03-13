# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-09)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** Phase 4: Circles and Collaboration

## Current Position

Phase: 4 of 6 (Circles and Collaboration) — In progress
Plan: 2 of 3 in phase 4 (04-02 complete)
Status: In progress
Last activity: 2026-03-13 -- Completed 04-02-PLAN.md (Circle formation flow and workspace UI: API client, hooks, CircleFormationModal, CircleWorkspace, NoteComposer, NoteCard, MyCircles, routing)

Progress: [█████████████████████████░░░░░] 12/16 plans (phases 1-3 complete, 04-01 and 04-02 complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 6 min
- Total execution time: 40 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-auth | 4/4 | 31 min | 8 min |
| 02-onboarding-and-profiles | 3/3 | 14 min | 5 min |
| 03-challenges-and-matching | 3/3 | ~115 min | ~38 min |
| 04-circles-and-collaboration | 1/3 | 14 min | 14 min |

**Recent Trend:**
- Last 5 plans: 02-02 (4 min), 02-03 (5 min), 03-01 (25 min), 03-03 (~60 min), 04-01 (14 min)
- Trend: backend-only plans (04-01) faster than full-stack plans

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
- [02-03]: dotenv added to server for .env loading from repo root (loaded in config/env.ts)
- [02-03]: S3 configured with real AWS credentials for CV storage
- [02-03]: useSavePreferences invalidates both profile and auth queries -- status change reflected immediately at Dashboard guard
- [02-03]: Complete page auto-redirects to Dashboard after 5-second countdown -- no manual step
- [03-01]: Match scoring done in TypeScript (not SQL) — avoids Drizzle JSONB arrayOverlaps bug #4935
- [03-01]: interestCount incremented with sql`count + 1` — concurrency-safe atomic update
- [03-01]: /my-interests route declared before /:id to prevent route shadowing
- [03-01]: skillsNeeded stored as jsonb — MVP scale, TypeScript scoring sidesteps operator bug
- [03-02]: Timeline filter (any/this-week/this-month) is client-side — API only accepts domain and type
- [03-02]: slideDown/slideUp keyframes in app.css @theme block for Radix accordion content height animation
- [03-03]: Dev role switcher added (POST /api/auth/dev-role + floating widget) for testing all roles in dev mode without separate accounts
- [03-03]: domain changed from single string to string[] — checkbox list + custom input, jsonb storage, matching checks ANY overlap
- [03-03]: circleSize validation softened — no hard min/max limits, amber "are you sure?" prompt for values outside 2–10
- [03-03]: updateChallengeSchema extended with status field for close/archive flow
- [03-03]: CM challenges fetched by filtering feed results by createdBy — no separate endpoint at pilot scale
- [03-03]: "Select this team" on TeamCompositionCard is local state only — Circle formation is Phase 4
- [04-01]: Attachment upload URLs generated inline in circles.ts with custom s3Key prefix (circle-notes/${circleId}/...) — generateUploadUrl hard-codes cvs/ prefix and cannot accept custom keys
- [04-01]: Multi-circle limit enforced at circle creation and member addition — compares active circle count against contributorProfiles.maxCircles (default 3)
- [04-01]: Presigned download URLs not generated eagerly in GET /notes response — frontend requests them lazily via /notes/:noteId/download/:attachmentId
- [04-01]: GET /resolution accessible by circle members AND challenger — challenger needs to view before rating
- [04-01]: Shared type names in index.ts disambiguated with 'SchemaInput' suffix for Zod-inferred types that conflict with interface type names
- [04-02]: NoteComposer uploads files sequentially with per-file progress counter before posting note — simpler than parallel upload, sufficient at pilot scale
- [04-02]: NoteCard fetches download URL lazily on button click via getDownloadUrl then window.open — matches 04-01 decision against eager presigned URLs
- [04-02]: CircleWorkspaceShell Add Member button is a stub — full implementation in Plan 03
- [04-02]: TeamCompositionCard shows Form Circle button only after team is selected (local state toggle) — avoids accidental circle creation

### Pending Todos

None yet.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before Phase 5 payments go live
- WEMWBS licensing (free for non-commercial, but ANC takes platform fees) -- verify with University of Warwick before Phase 6
- DPIA and Appropriate Policy Document must be completed before any wellbeing code in Phase 6

## Session Continuity

Last session: 2026-03-13
Stopped at: Phase 4, Plan 2 COMPLETE -- Circle formation flow and workspace UI: API client, hooks, CircleFormationModal, CircleWorkspace, NoteComposer, NoteCard, MyCircles, routing
Resume file: .planning/phases/04-circles-and-collaboration/04-03-PLAN.md
