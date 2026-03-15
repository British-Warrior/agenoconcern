---
phase: 06-wellbeing-notifications-and-pwa
plan: "01"
subsystem: wellbeing
tags: [wellbeing, gdpr, ucla, swemwbs, onboarding, impact]
dependency_graph:
  requires: [05-01, 05-02, 05-03]
  provides: [wellbeingCheckins-table, wellbeing-routes, wellbeing-frontend]
  affects: [impact-summary, onboarding-flow]
tech_stack:
  added: []
  patterns:
    - GDPR explicit consent record per special-category submission
    - Tuple types for validated item arrays (uclaItems, wemwbsItems)
    - Shared WellbeingForm component reused in onboarding and standalone flows
key_files:
  created:
    - packages/shared/src/types/wellbeing.ts
    - packages/shared/src/schemas/wellbeing.ts
    - packages/server/src/routes/wellbeing.ts
    - packages/web/src/api/wellbeing.ts
    - packages/web/src/hooks/useWellbeing.ts
    - packages/web/src/components/wellbeing/WellbeingForm.tsx
    - packages/web/src/pages/onboarding/Wellbeing.tsx
    - packages/web/src/pages/wellbeing/WellbeingCheckin.tsx
  modified:
    - packages/server/src/db/schema.ts
    - packages/shared/src/types/impact.ts
    - packages/shared/src/index.ts
    - packages/server/src/routes/impact.ts
    - packages/server/src/express-app.ts
    - packages/web/src/App.tsx
    - packages/web/src/pages/Dashboard.tsx
    - packages/web/src/pages/onboarding/StripeConnect.tsx
decisions:
  - id: "06-01-A"
    decision: "WellbeingForm shared component wraps both onboarding and standalone pages to avoid duplication"
    rationale: "Single source of truth for UCLA + SWEMWBS questions and consent checkbox logic"
  - id: "06-01-B"
    decision: "consentGranted uses z.literal(true) in Zod schema — schema itself rejects false"
    rationale: "Ensures server never stores a check-in without explicit consent; not just a validation message but a hard schema constraint"
  - id: "06-01-C"
    decision: "Dashboard shows nudge banner (not auto-redirect) when check-in due"
    rationale: "Plan spec explicitly says nudge not gate — respects contributor autonomy"
metrics:
  duration_minutes: 11
  completed_date: "2026-03-15"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 6 Plan 1: Wellbeing Check-in Flows Summary

**One-liner:** UCLA 3-item + SWEMWBS 7-item check-ins with GDPR explicit consent records, 8-week due tracking, and wellbeing trajectory in impact summary.

## What Was Built

### DB Schema

Added `wellbeingCheckins` table to `packages/server/src/db/schema.ts`:
- 10 item columns (uclaItem1-3 scored 1-4, wemwbsItem1-7 scored 1-5)
- uclaScore (3-12) and wemwbsScore (7-35) computed columns
- consentRecordId FK to consentRecords (NOT NULL — no check-in without consent)
- contributorId FK with cascade delete

### Shared Package

- `WellbeingCheckinInput`, `WellbeingCheckin`, `WellbeingDueResponse`, `WellbeingTrajectoryPoint` types
- `wellbeingCheckinSchema` — `consentGranted: z.literal(true)` blocks submission without consent
- `ImpactSummary.wellbeingTrajectory` changed from `never[]` to `WellbeingTrajectoryPoint[]`

### Server Routes (`/api/wellbeing`)

- `POST /checkin` — validates input, computes scores, inserts consentRecord with purpose='wellbeing_checkin', inserts wellbeing check-in row, returns 201
- `GET /due` — returns `{ due: true }` if no check-in exists or last was >56 days ago
- `GET /history` — returns score trajectory ordered by completedAt asc
- `GET /api/impact/summary` — now queries wellbeingCheckins and returns real `wellbeingTrajectory`

### Frontend

- `WellbeingForm` shared component: UCLA questions + SWEMWBS statements with pill-style radio buttons, consent checkbox gates submission
- `/onboarding/wellbeing` — mandatory first check-in, no skip
- `/wellbeing/checkin` — standalone 8-week reminder page with "Skip for now" link
- App routing: `/onboarding/wellbeing` inserted between `/onboarding/stripe` and `/onboarding/complete`
- Dashboard: `useWellbeingDue` hook queried on mount, prominent banner with "Complete now" link shown when due
- StripeConnect skip now navigates to `/onboarding/wellbeing` instead of `/onboarding/complete`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 16 files exist at expected paths. Both task commits verified:
- `cee566f` — feat(06-01): wellbeing DB schema, shared types/schemas, and server routes
- `a0598f6` — feat(06-01): wellbeing check-in frontend — onboarding step + standalone reminder page
