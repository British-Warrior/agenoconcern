---
phase: 17-scheduled-report-delivery
verified: 2026-03-30T08:15:12Z
status: passed
score: 4/4 must-haves verified
re_verification: false
---

# Phase 17: Scheduled Report Delivery - Verification Report

**Phase Goal:** PDF impact reports are emailed automatically on a CM-configured schedule, with every attempt logged and failures retried.
**Verified:** 2026-03-30T08:15:12Z
**Status:** passed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | CM can toggle automatic PDF delivery on/off and choose weekly or monthly cadence | VERIFIED | ReportDeliverySection renders ToggleSwitch + radio buttons; PATCH /institutions/:id/schedule validates and persists |
| 2  | When delivery is enabled the PDF is automatically emailed to institution contact on schedule | VERIFIED | report-delivery.job.ts hourly cron queries due institutions, generates PDF via buildInstitutionReport+pdfDocToBuffer, sends via resend.emails.send with buffer attachment |
| 3  | Every delivery attempt (sent or failed) appears in a log with timestamp, status, and recipient email | VERIFIED | reportDeliveryLogs table inserted on every attempt; DeliveryHistory component renders date, status badge, and recipient |
| 4  | A failed delivery is retried automatically using exponential backoff until it succeeds or exhausts retries | VERIFIED | computeNextRetryAt() BASE_MS=15min MAX_ATTEMPTS=5 max 4h delay; retry rows processed each cron tick; exhausted when nextRetryAt returns null |

**Score:** 4/4 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/server/drizzle/0005_scheduled_report_delivery.sql | Migration: 4 institution columns + report_delivery_logs | VERIFIED | All 4 ALTER TABLE columns; report_delivery_logs with FK cascade |
| packages/server/src/db/schema.ts | Drizzle schema for new columns + reportDeliveryLogs table | VERIFIED | Lines 498-519: 4 institution columns, reportDeliveryLogs pgTable exported |
| packages/server/src/services/report-delivery.job.ts | Hourly cron job with advisory lock, PDF generation, email | VERIFIED | 443 lines; exports startReportDeliveryJob and computeNextRunAt; full implementation |
| packages/shared/src/schemas/institution.ts | updateScheduleSchema, contactEmail | VERIFIED | updateScheduleSchema at line 20, contactEmail at line 15 |
| packages/server/src/routes/admin.ts | PATCH /schedule, GET /delivery-logs, contactEmail support | VERIFIED | All three endpoints present; schedule fields in GET list select (lines 64-67) |
| packages/web/src/api/admin.ts | updateSchedule, fetchDeliveryLogs, DeliveryLog type | VERIFIED | All present |
| packages/web/src/hooks/useInstitutions.ts | useUpdateSchedule, useDeliveryLogs hooks | VERIFIED | Both hooks at lines 32 and 74; null-safe enabled guard |
| packages/web/src/pages/admin/InstitutionManagement.tsx | DeliveryHistory, ReportDeliverySection, contactEmail field | VERIFIED | All present and wired |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| report-delivery.job.ts | pdf/institution-report.ts | buildInstitutionReport + pdfDocToBuffer | WIRED | Line 8 imports buildInstitutionReport; called in deliverReport() at line 230 |
| report-delivery.job.ts | Resend SDK | resend.emails.send with Buffer attachment | WIRED | Line 3 imports Resend; called at line 248 with PDF buffer |
| packages/server/src/index.ts | report-delivery.job.ts | startReportDeliveryJob() in app.listen | WIRED | Import at line 4, called at line 12 |
| InstitutionManagement.tsx | PATCH /admin/institutions/:id/schedule | useUpdateSchedule mutation | WIRED | updateSchedule.mutate() in handleToggle and handleCadenceChange |
| InstitutionManagement.tsx | GET /admin/institutions/:id/delivery-logs | useDeliveryLogs hook | WIRED | useDeliveryLogs called in DeliveryHistory at line 191; results rendered in table |
| admin.ts (PATCH /schedule) | computeNextRunAt from report-delivery.job.ts | imported helper | WIRED | Exported from job, imported and called at line 896 on enable |

---

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| SCHED-01 | SATISFIED | CM toggle + cadence selector; PATCH /schedule validates contactEmail and cadence before enabling |
| SCHED-02 | SATISFIED | Hourly cron selects due institutions, generates PDF buffer, emails via Resend; reportNextRunAt advanced after each send |
| SCHED-03 | SATISFIED | reportDeliveryLogs row inserted on every attempt; GET /delivery-logs endpoint; DeliveryHistory component in UI |
| SCHED-04 | SATISFIED | computeNextRetryAt() exponential backoff (15min base, 5 attempts max, 4h cap); retry rows processed each tick; null nextRetryAt signals exhaustion |

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder comments or stub implementations in any phase 17 file.

---

### Human Verification Required

#### 1. Actual email delivery

**Test:** Set a contact email on an institution, enable weekly delivery, back-date reportNextRunAt to a past timestamp in the DB, wait for the next cron tick, and check the inbox.
**Expected:** Email arrives with a PDF attachment; a Sent row appears in Delivery History with correct timestamp and recipient.
**Why human:** Cannot verify external Resend API call or email receipt without a real RESEND_API_KEY and live test inbox.

#### 2. Toggle disabled state when no contact email

**Test:** Open an institution that has no contact email set; observe the Report Delivery toggle.
**Expected:** Toggle is visually disabled; helper text about setting a contact email is shown; clicking does nothing.
**Why human:** Visual disabled state and click-guard require browser rendering to confirm.

#### 3. Next delivery date display

**Test:** Enable weekly delivery for an institution; observe the next-delivery line below the toggle.
**Expected:** Shows the next Monday date formatted via en-GB locale (e.g. 06 Apr 2026).
**Why human:** Date arithmetic correctness against a live reportNextRunAt value requires visual confirmation.

---

### Gaps Summary

No gaps. All four phase success criteria are implemented end-to-end:

- Schema migration, Drizzle schema, and shared Zod schemas are in place and fully substantive.
- The hourly cron job is registered in index.ts, acquires advisory lock 7171 (released in finally block), processes due deliveries and pending retries, generates real PDFs, and emails via Resend with exponential backoff.
- The PATCH /schedule endpoint validates the contactEmail prerequisite and cadence before enabling delivery.
- The GET /delivery-logs endpoint returns the last 10 attempts per institution.
- The ReportDeliverySection UI wires the toggle, cadence radio buttons, next-delivery date display, and error state to the useUpdateSchedule mutation.
- The DeliveryHistory component wires useDeliveryLogs to a rendered table with sent/failed badges, attempt count, retry time, and inline error messages.
- The 17-02 bugfix (schedule columns missing from GET /institutions list select) is confirmed applied at lines 64-67 of admin.ts.

Three items require human verification (email delivery, toggle disabled state, next-delivery date display) but no automated check indicates failure.

---

_Verified: 2026-03-30T08:15:12Z_
_Verifier: Claude (gsd-verifier)_
