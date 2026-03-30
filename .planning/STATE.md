# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-25)

**Core value:** Experienced professionals upload CV, get matched to challenges, collaborate in Circles, earn income — bridging the pension gap while contributing to communities.
**Current focus:** v1.3 Phase 17 — Scheduled Report Delivery

## Current Position

Milestone: v1.3 — Enhanced Reporting & Institution Portal
Phase: 17 of 18 (Scheduled Report Delivery) — In progress
Plan: 1 of TBD
Status: In progress
Last activity: 2026-03-30 — Completed 17-01-PLAN.md (schema, cron job, toggle UI)

Progress: [████░░░░░░] 40% (v1.3: 1.5/3 phases complete)

## Performance Metrics

**Velocity (v1.0-v1.2):**
- Total plans completed: 42 (v1.0: 19, v1.1: 11, v1.2: 10, v1.3: 2)
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

v1.3 pre-build decisions still pending:
- SWEMWBS commercial licence confirmation before wellbeing band goes live
- Portal auth isolation strategy (separate Express router vs subdomain)

### Pending Todos

None.

### Blockers/Concerns

- Employment Agencies Act 1973 classification needs legal advice before payments go live (carried from v1.1)
- SWEMWBS commercial licence must be confirmed before wellbeing band goes live to institutions

## Session Continuity

Last session: 2026-03-30
Stopped at: Phase 17 Plan 01 complete — delivery schema, cron job, and toggle UI in place
Resume file: .planning/phases/17-scheduled-report-delivery/17-02-PLAN.md (if exists)
