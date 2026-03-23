# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income -- bridging the pension gap while contributing to communities.
**Current focus:** v1.2 Phase 12 — Institution Data Foundation

## Current Position

Milestone: v1.2 — Institution Management & iThink Integration
Phase: 12 of 15 (Institution Data Foundation)
Plan: 2 of 3 in current phase — awaiting checkpoint:human-verify
Status: In progress
Last activity: 2026-03-23 — Completed 12-02-PLAN.md (admin API routes + CM institution management UI)

Progress: [██████████░░░░░░░░░░] 55% (11/20 phases complete across all milestones)

## Performance Metrics

**Velocity (v1.0 + v1.1 baseline):**
- Total plans completed: 30
- Average duration: ~15 min
- Total execution time: ~450 min

**By Phase (v1.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 07-ux-fixes | 3/3 | ~45 min | ~15 min |
| 08-wellbeing-visualisation | 1/1 | ~20 min | ~20 min |
| 09-server-foundation-vantage | 2/2 | ~30 min | ~15 min |
| 10-challenger-portal | 2/2 | ~35 min | ~18 min |
| 11-kiosk-institutional | 3/3 | ~45 min | ~15 min |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions relevant to v1.2:
- Phase 11 Plan 02: statsJson JSONB MVP approach — Phase 12 replaces this with live aggregation
- Phase 9 Plan 02: timingSafeEqual pattern in api-key-auth.ts — Phase 13 copies this exact pattern for HMAC webhook verification
- Phase 9 Plan 01: Drizzle migration applied as targeted SQL (not drizzle-kit) — same approach required for Phase 12 FK migration
- v1.2 research: pdfkit ^0.18.0 chosen over @react-pdf/renderer (3 open ESM breakage issues) and Puppeteer (300MB binary, 2-5s cold start)
- v1.2 research: institution_id FK uses NOT VALID + VALIDATE CONSTRAINT two-step to avoid write-blocking table scan
- Phase 12 Plan 01: Many-to-many junction table (not single FK on contributors) — CONTEXT.md overrides roadmap; enables future multi-institution assignments
- Phase 12 Plan 01: Slug excluded from institution create/update schemas — immutable after creation (kiosk QR code dependency)
- Phase 12 Plan 01: Drizzle FK onDelete uses spaced "set null" not camelCase "setNull"
- Phase 12 Plan 02: CMRoute guard pattern — check role community_manager OR admin, redirect to /dashboard otherwise
- Phase 12 Plan 02: adminRouter uses router.use(authMiddleware, requireRole) at top — all routes automatically protected
- Phase 12 Plan 02: Contributor count in InstitutionManagement card is 0 placeholder — Plan 12-03 adds live aggregation

### Pending Todos

None.

### Blockers/Concerns

- Phase 13 prerequisite: iThink webhook payload contract (contributorEmail, institutionSlug, signalType, cohortSize, flaggedCount) must be agreed before Phase 13 planning begins — any field name deviation breaks Zod schema
- Phase 13 prerequisite: Confirm actual iThink repo file structure before Phase 13 — architecture estimates file paths from project description, not direct inspection
- Employment Agencies Act 1973 classification needs legal advice before payments go live (carried from v1.1)

## Session Continuity

Last session: 2026-03-23
Stopped at: Phase 12 Plan 02 — 2 auto tasks complete, awaiting checkpoint:human-verify (Task 3)
Resume file: .planning/phases/12-institution-data-foundation/12-03-PLAN.md (after checkpoint approved)
