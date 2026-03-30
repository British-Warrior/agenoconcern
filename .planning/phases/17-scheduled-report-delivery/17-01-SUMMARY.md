---
phase: 17
plan: "01"
subsystem: scheduled-report-delivery
tags: [cron, pdf, email, resend, drizzle, advisory-lock, institution-management]
dependency_graph:
  requires:
    - phase-15 (PDF generation via buildInstitutionReport + pdfDocToBuffer)
    - phase-16 (wellbeing band logic reused in gatherReportData)
  provides:
    - Scheduled PDF delivery pipeline (SCHED-01, SCHED-02)
    - Delivery log table for Plan 17-02 log viewer
  affects:
    - packages/server/src/routes/admin.ts (3 new endpoints)
    - packages/server/src/index.ts (cron job registration)
    - packages/web/src/pages/admin/InstitutionManagement.tsx (toggle UI)
tech_stack:
  added:
    - node-cron (already installed, now used for report delivery)
    - Resend SDK (already installed, now used for PDF email attachment)
  patterns:
    - pg_try_advisory_lock / pg_advisory_unlock for distributed cron coordination
    - pdfDocToBuffer: Buffer.concat on 'data' events, resolve on 'end'
    - Exponential backoff: 15min base * 2^(attempt-1) + jitter, max 4h, 5 attempts
key_files:
  created:
    - packages/server/drizzle/0005_scheduled_report_delivery.sql
    - packages/server/src/services/report-delivery.job.ts
    - packages/server/scripts/apply-migration-0005.mjs
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/src/routes/admin.ts
    - packages/server/src/index.ts
    - packages/shared/src/schemas/institution.ts
    - packages/shared/src/index.ts
    - packages/web/src/api/admin.ts
    - packages/web/src/hooks/useInstitutions.ts
    - packages/web/src/pages/admin/InstitutionManagement.tsx
decisions:
  - "Inline gatherReportData in report-delivery.job.ts (no shared helper) — mirrors existing PDF route logic, avoids circular dependency with admin.ts"
  - "computeNextRunAt exported from job service and imported by admin.ts — single source of truth for schedule computation"
  - "PUT /institutions/:id extended for contactEmail — no new route needed, updateInstitutionSchema already had the field after Task 1"
  - "Cadence radio buttons shown when contactEmail present (even when delivery disabled) — allows user to pre-select cadence before enabling"
  - "Disable toggle only when contactEmail is null/empty — shows helper text; cadence selector always visible alongside toggle"
metrics:
  duration: ~25 min
  completed: 2026-03-30
---

# Phase 17 Plan 01: Scheduled Report Delivery — Schema, Cron Job, Toggle UI Summary

Hourly cron job with advisory lock that generates institution PDF reports and emails them via Resend, with CM toggle UI and exponential-backoff retry logging.

## What Was Built

### Task 1: Schema migration + Drizzle schema + shared Zod schemas

Migration `0005_scheduled_report_delivery.sql` adds four columns to `institutions` (`contact_email`, `report_delivery_enabled`, `report_cadence`, `report_next_run_at`) and a new `report_delivery_logs` table (id, institutionId FK cascade, attemptedAt, status, recipientEmail, errorMessage, attemptNumber, nextRetryAt, createdAt). Applied to local DB.

`schema.ts` updated with the four new institution columns and the `reportDeliveryLogs` pgTable (exported).

`updateScheduleSchema` added to shared schemas (`reportDeliveryEnabled: boolean`, `reportCadence: enum(weekly, monthly) | null`). `UpdateScheduleInput` type and both exports added to `shared/src/index.ts`. `contactEmail: z.string().email().optional()` added to `updateInstitutionSchema`.

### Task 2: Cron job — advisory lock, PDF generation, email

`report-delivery.job.ts` exports `startReportDeliveryJob()` which registers an hourly cron (`0 * * * *`).

On each tick:
- Acquires `pg_try_advisory_lock(7171)` — returns early if not acquired
- Queries institutions where `reportDeliveryEnabled=true AND reportNextRunAt<=now AND contactEmail IS NOT NULL`
- For each: computes period range via `computePeriodRange`, gathers report data via `gatherReportData` (mirrors GET /institutions/:slug/report.pdf logic), generates PDF via `buildInstitutionReport` + `pdfDocToBuffer` helper, emails via Resend with buffer attachment
- On success: inserts 'sent' log row, updates `reportNextRunAt` via `computeNextRunAt`
- On failure: inserts 'failed' log row with `nextRetryAt` from `computeNextRetryAt`
- Also processes retry rows (status='failed', nextRetryAt<=now) with up to 5 attempts

`computeNextRunAt` is exported (used by admin.ts schedule endpoint).

Graceful degradation: if `RESEND_API_KEY` is not set, logs warning and returns failed delivery (no crash).

Advisory lock released in `finally` block via `pg_advisory_unlock(7171)`.

`startReportDeliveryJob()` registered in `index.ts` after `startWellbeingReminderJob()`.

### Task 3: Admin API endpoints + CM toggle UI

**Server (`admin.ts`):**
- `PUT /institutions/:id` extended to persist `contactEmail` when present in request body
- `PATCH /institutions/:id/schedule` — validates contactEmail present when enabling, validates cadence non-null when enabling, computes and sets `reportNextRunAt` on enable, clears it on disable (keeps cadence for memory)
- `GET /institutions/:id/delivery-logs` — last 10 log rows ordered by `attemptedAt DESC` (ready for Plan 17-02 log viewer)

**Web API client (`admin.ts`):**
- `Institution` type extended with `contactEmail`, `reportDeliveryEnabled`, `reportCadence`, `reportNextRunAt`
- `DeliveryLog` interface added
- `updateSchedule()` and `fetchDeliveryLogs()` functions added

**Hook (`useInstitutions.ts`):**
- `useUpdateSchedule()` mutation added (invalidates institutions query on success)

**UI (`InstitutionManagement.tsx`):**
- `InstitutionCardEdit` gains Contact Email input with basic email format validation; passed down as `initialContactEmail` when editing
- `ReportDeliverySection` component: toggle switch (disabled if no contactEmail), cadence radio buttons (Weekly/Monthly), "Next delivery: [date]" when enabled, helper text when email missing, error display on mutation failure
- Section rendered inside `InstitutionCardView` above the active/inactive toggle row

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- V1: `SELECT column_name FROM information_schema.columns WHERE table_name = 'institutions' AND column_name IN ('contact_email','report_delivery_enabled','report_cadence','report_next_run_at')` — returns 4 rows
- V2: `SELECT count(*) FROM information_schema.tables WHERE table_name = 'report_delivery_logs'` — returns 1
- V3: TypeScript compilation passes in all three packages (shared, server, web) — no errors
- V4: `startReportDeliveryJob` exported from report-delivery.job.ts and called in index.ts

## Self-Check: PASSED

All key files exist and all task commits verified:
- `packages/server/drizzle/0005_scheduled_report_delivery.sql` — FOUND
- `packages/server/src/db/schema.ts` — FOUND
- `packages/server/src/services/report-delivery.job.ts` — FOUND
- `packages/shared/src/schemas/institution.ts` — FOUND
- `.planning/phases/17-scheduled-report-delivery/17-01-SUMMARY.md` — FOUND
- Commit b106606 (Task 1) — FOUND
- Commit 66cbcc2 (Task 2) — FOUND
- Commit 4881017 (Task 3) — FOUND
