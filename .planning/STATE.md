# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-15)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** v1.1 Pilot-Ready — Phase 9: Server Foundation and VANTAGE

## Current Position

Phase: 11 of 11 (Kiosk Mode and Institutional Pages) — In progress
Plan: 3 of 3 — Task 1 complete, awaiting checkpoint:human-verify
Status: Phase 11 Plan 03 Task 1 committed. Stopped at checkpoint:human-verify (Task 2).
Last activity: 2026-03-21 — Completed Task 1 of 11-03-PLAN.md (InstitutionLanding component + routing)

Progress: [████████████░░░░] v1.1 ~68% (12/~16 plans, v1.0 complete)

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
- Phase 9 Plan 01: Migration applied manually (targeted SQL) because Drizzle journal was empty while DB had all prior tables — drizzle-kit migrate would have re-created existing tables. Applied only ALTER TYPE + CREATE TABLEs + FKs, marked 0002 as applied in drizzle.__drizzle_migrations.
- Phase 9 Plan 02: Rate limiter applied before apiKeyMiddleware — throttles unauthenticated flooding without DB hit
- Phase 9 Plan 02: timingSafeEqual secondary check after DB hash lookup — prevents timing attacks on comparison
- Phase 9 Plan 02: last_used_at update is fire-and-forget — non-blocking, failure logged but not surfaced to caller
- Phase 9 Plan 02: Key creation uses cookie/JWT admin auth, not API key auth — bootstrapping concern (admin creates the first key)
- Phase 10: Challenger registration flow decision (Option A: full account vs Option B: guest submission) — defer to Phase 10 kickoff
- Phase 10 Plan 01: ChallengerPortalChallenge (not ChallengerChallenge) — avoids conflict with existing ChallengerChallenge in types/impact.ts
- Phase 10 Plan 01: challenge_type enum extended with community/premium/knowledge_transition — challenger portal uses different type taxonomy than CM-created challenges
- Phase 10 Plan 01: Migration applied manually (targeted SQL) — same Drizzle journal issue as Phase 9
- Phase 10 Plan 02: ChallengerRoute redirects unauthenticated to /challenger/register (not /login) — challengers have their own registration path
- Phase 10 Plan 02: SubmitChallenge uses comma-separated text inputs for domain/skillsNeeded arrays — consistent with existing UX patterns
- Phase 10 Plan 02: useRateResolution from useCircles.ts reused in ChallengeDetail — endpoint already existed, no duplication needed
- Phase 11 Plan 01: Module-level _kioskActivated flag used for kiosk state persistence — useSearchParams alone resets on SPA navigation
- Phase 11 Plan 01: KioskProvider inside BrowserRouter > AuthProvider so useSearchParams has Router ancestor
- Phase 11 Plan 01: performLogout uses window.location.href (not navigate()) — hard navigation ensures full in-memory state clear
- Phase 11 Plan 01: queryClient.clear() over invalidateQueries — kiosk requires complete data wipe, not stale refresh
- Phase 11 Plan 02: statsJson JSONB MVP approach — no live aggregation, stats updated manually or via batch job
- Phase 11 Plan 02: Public institution endpoint has no authMiddleware — kiosk landing pages must be accessible without login
- Phase 11 Plan 02: req.params.slug cast to string — Express types params as string | string[], Drizzle eq() requires string; cast is safe for named route params
- Phase 11 Plan 03: InstitutionLanding does not import useKiosk — links to ?kiosk=true, KioskProvider detects param (clean decoupling)
- Phase 11 Plan 03: ROUTES.INSTITUTION is a function (slug: string) => string — parameterised route constant pattern
- Phase 11 Plan 03: NotFoundError subclass used in useQuery retry callback to skip retries on 404

### Pending Todos

None.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before payments go live
- WEMWBS licensing — APPROVED by user (2026-03-15), registration pending
- DPIA and Appropriate Policy Document — APPROVED by user (2026-03-15), documents pending
- Phase 9: Postgres enum migration is irreversible — must test on staging before production
- Phase 11: Kiosk session security requires end-to-end verification (network tab + touch device) before any institutional deployment

## Session Continuity

Last session: 2026-03-21
Stopped at: Phase 11 Plan 03 Task 1 committed. Awaiting checkpoint:human-verify (Task 2).
Resume file: .planning/phases/11-kiosk-mode-and-institutional-pages/11-03-PLAN.md (resume from Task 2 after human verification)
