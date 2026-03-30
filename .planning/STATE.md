# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.
**Current focus:** v1.3 Phase 18 — Institution Portal

## Current Position

Milestone: v1.3 — Enhanced Reporting & Institution Portal
Phase: 18 of 18 (Institution Portal) — In progress
Plan: 1 of 2
Status: In progress
Last activity: 2026-03-30 — Completed 18-01-PLAN.md (Portal Auth Layer)

Progress: [██████░░░░] 67% (v1.3: 2/3 phases complete)

## Performance Metrics

**Velocity (v1.0-v1.2):**
- Total plans completed: 44 (v1.0: 19, v1.1: 11, v1.2: 10, v1.3: 4)
- Average duration: ~15 min
- Total execution time: ~630 min

## Accumulated Context

### Decisions

All v1.0-v1.2 decisions archived in milestones/.

v1.3 decisions:
- Phase 16: k=5 anonymity threshold (ONS guidance, pilot-scale viable)
- Phase 16: Rasch-transformed SWEMWBS scores, not raw sums, for band classification
- Phase 16: Modal band with Typical tie-break for wellbeing aggregation
- Phase 16: selectDistinctOn for most-recent-per-contributor consented check-in
- Phase 16: Wellbeing band as text label only — no coloured badge, no SWEMWBS branding
- Phase 16: Consent checkbox at wellbeing check-in (not grandfathered)
- Phase 16: Attention trend uses 4-week vs 4-week comparison for direction
- Phase 16: BarChart (not LineChart) for discrete flag counts
- Phase 16: Bar fill #1a1d2e (navy), sparse data notice when total < 3
- Phase 16: TrendIndicator always visible above tabs
- Phase 16: Migration applied via script (project pattern)

v1.3 Phase 17 decisions:
- Phase 17: gatherReportData inlined in report-delivery.job.ts — no shared helper to avoid circular dependency with admin.ts
- Phase 17: computeNextRunAt exported from job service and imported by admin.ts (single source of truth)
- Phase 17: Advisory lock key 7171 for report delivery job
- Phase 17: Cadence radio buttons shown when contactEmail present (pre-select before enabling)
- Phase 17: PUT /institutions/:id extended for contactEmail (no new route needed)
- Phase 17-02: Delivery history as flat list (not table) — compact enough at 10 rows, avoids horizontal scroll
- Phase 17-02: contactEmail and schedule columns added to GET /admin/institutions select — required for toggle to survive page reload

v1.3 Phase 18 decisions:
- Phase 18-01: Portal auth uses type=portal JWT discriminant (same JWT_SECRET, type field provides isolation)
- Phase 18-01: Partial unique index (WHERE is_active=true) allows historical deactivated accounts while enforcing one active per institution
- Phase 18-01: PortalAuthProvider placed on individual route elements in App.tsx (not full app) for complete isolation
- Phase 18-01: Portal routes outside AppShell route — portal has its own minimal layout (no contributor nav)

v1.3 pre-build decisions still pending:
- SWEMWBS commercial licence confirmation before wellbeing band goes live

### Pending Todos

None.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before payments go live (carried from v1.1)
- SWEMWBS commercial licence must be confirmed before wellbeing band goes live to institutions

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 18 plan 01 complete — portal auth layer (DB, service, middleware, routes, frontend context, route guard, login page)
Resume file: .planning/phases/18-institution-portal/18-02-PLAN.md
