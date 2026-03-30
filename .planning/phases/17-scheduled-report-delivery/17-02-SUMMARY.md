---
phase: 17-scheduled-report-delivery
plan: 02
subsystem: ui
tags: [react, tailwind, drizzle, admin-ui, delivery-logs]

# Dependency graph
requires:
  - phase: 17-01
    provides: reportDeliveryLogs table, GET /admin/institutions/:id/delivery-logs endpoint, delivery toggle UI scaffolding
provides:
  - useDeliveryLogs hook fetching last 10 delivery attempts per institution
  - DeliveryHistory section in InstitutionManagement detail panel (timestamp, status badge, recipient, error, attempt count, retry time)
  - Bugfix: contactEmail, reportDeliveryEnabled, reportCadence, reportNextRunAt columns included in GET /admin/institutions list query
affects: [phase-18-institution-portal, future-reporting-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useDeliveryLogs(institutionId | null) — null-safe hook pattern, query disabled when no id"
    - "Status badge: green 'Sent' / red 'Failed' via conditional Tailwind classes"
    - "Attempt N/5 + Retry at [time] inline for failed entries with nextRetryAt"

key-files:
  created: []
  modified:
    - packages/web/src/hooks/useInstitutions.ts
    - packages/web/src/pages/admin/InstitutionManagement.tsx
    - packages/web/src/api/admin.ts

key-decisions:
  - "Delivery history rendered as flat list (not table) — compact enough at 10 rows, avoids horizontal scroll on narrow panels"
  - "contactEmail and schedule columns added to GET /admin/institutions select — omitting them caused toggle UI to lose state on page load"

patterns-established:
  - "Null-safe query hook pattern: pass institutionId | null, useQuery enabled only when truthy"

# Metrics
duration: ~30min
completed: 2026-03-30
---

# Phase 17 Plan 02: Delivery Log Viewer Summary

**Delivery history panel in institution detail with sent/failed badges, attempt count, retry time, and a bugfix ensuring schedule fields survive page reload**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-03-30
- **Completed:** 2026-03-30
- **Tasks:** 1 (+ 1 checkpoint)
- **Files modified:** 3

## Accomplishments

- Added `useDeliveryLogs` hook with null-safe enabled guard, returning last 10 delivery attempts for the selected institution
- Rendered DeliveryHistory section in InstitutionManagement: timestamp, green/red status badge, recipient email, inline error message, "Attempt N/5" for failed entries, "Retry at [time]" muted line when nextRetryAt is set, "No deliveries yet" empty state
- Fixed GET /admin/institutions missing contactEmail, reportDeliveryEnabled, reportCadence, reportNextRunAt — toggle/cadence UI was losing state on navigation

## Task Commits

Each task was committed atomically:

1. **Task 1: Delivery log viewer in institution detail panel** - `c0c50fb` (feat)
2. **Auto-fix: include delivery fields in GET institutions list** - `e2cdf31` (fix)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified

- `packages/web/src/hooks/useInstitutions.ts` — added `useDeliveryLogs(institutionId: string | null)` hook
- `packages/web/src/pages/admin/InstitutionManagement.tsx` — added DeliveryHistory section below Report Delivery toggle
- `packages/web/src/api/admin.ts` — no new functions; bug was in server-side select query in packages/server

## Decisions Made

- Delivery history as a flat list rather than a full table — the detail panel is narrow and 10 rows renders cleanly without a scrollable table header
- contactEmail and schedule columns added to GET /admin/institutions select because the toggle and cadence selector depend on them and would silently revert to defaults on page load

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] GET /admin/institutions missing delivery schedule columns**
- **Found during:** Task 1 (delivery log viewer) — toggle UI lost state on page navigation
- **Issue:** The Drizzle select for `GET /admin/institutions` did not include `contactEmail`, `reportDeliveryEnabled`, `reportCadence`, `reportNextRunAt`; these fields were added in 17-01's schema migration but never added to the list query's select object
- **Fix:** Added all four columns to the select clause in the institutions list handler
- **Files modified:** packages/server/src/routes/admin.ts
- **Verification:** TypeScript compilation passes; fields visible in network response; toggle retains state after navigating away and back
- **Committed in:** e2cdf31

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug)
**Impact on plan:** Necessary for correctness — without it the schedule toggle UI would silently reset to "off" on page reload. No scope creep.

## Issues Encountered

None beyond the auto-fixed bug above.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Full scheduled report delivery pipeline is in place and verified: contact email, toggle/cadence, cron job with advisory lock, PDF generation, Resend delivery, exponential backoff retry, and CM log viewer
- Phase 18 (Institution Portal) can build on the existing institution model; portal auth isolation strategy decision is still pending (separate Express router vs subdomain)
- SWEMWBS commercial licence must be confirmed before wellbeing band goes live to institutions (carried concern)

---
*Phase: 17-scheduled-report-delivery*
*Completed: 2026-03-30*
