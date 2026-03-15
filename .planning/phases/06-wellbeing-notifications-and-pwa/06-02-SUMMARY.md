---
phase: 06-wellbeing-notifications-and-pwa
plan: "02"
subsystem: notifications
tags: [notifications, push, web-push, in-app, scheduled-jobs, node-cron]
dependency_graph:
  requires:
    - 01-01 (auth middleware, contributor model)
    - 04-01 (circles, circleMembers, contributorProfiles)
    - 05-01 (paymentTransactions)
    - 06-01 (wellbeingCheckins table)
  provides:
    - notifications table (in-app persistent store)
    - pushSubscriptions table
    - notifyCircleActivity preference on contributorProfiles
    - notify() / notifyBatch() service functions
    - 7-endpoint /api/notifications REST API
    - NotificationBell component in navbar
    - Daily wellbeing reminder cron job
  affects:
    - challenges.ts (challenge_match notification on interest)
    - circles.ts (circle_formed, circle_activity notifications)
    - payments.ts (payment_received on transfer + webhook)
tech_stack:
  added:
    - web-push: Push notification delivery via VAPID
    - node-cron: Scheduled job for wellbeing reminders
  patterns:
    - Push with email fallback (graceful degradation when VAPID/Resend not configured)
    - Fire-and-forget notifications (.catch logging, no await blocking request)
    - 60s polling in UI (TanStack useQuery refetchInterval)
key_files:
  created:
    - packages/server/src/services/notification.service.ts
    - packages/server/src/routes/notifications.ts
    - packages/server/src/services/wellbeing-reminder.job.ts
    - packages/shared/src/types/notifications.ts
    - packages/shared/src/schemas/notifications.ts
    - packages/web/src/api/notifications.ts
    - packages/web/src/hooks/useNotifications.ts
    - packages/web/src/components/layout/NotificationBell.tsx
  modified:
    - packages/server/src/db/schema.ts (notifications, pushSubscriptions tables, notifyCircleActivity column)
    - packages/server/src/config/env.ts (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
    - packages/server/src/express-app.ts (mount /api/notifications)
    - packages/server/src/index.ts (startWellbeingReminderJob)
    - packages/server/src/routes/challenges.ts (challenge_match notify)
    - packages/server/src/routes/circles.ts (circle_formed, circle_activity notify)
    - packages/server/src/routes/payments.ts (payment_received notify)
    - packages/shared/src/index.ts (export notification types/schemas)
    - packages/web/src/components/layout/Navbar.tsx (NotificationBell)
decisions:
  - "[06-02] VAPID keys use .default('') with graceful degradation — push silently disabled until keys configured"
  - "[06-02] Notifications fire-and-forget (.catch) to avoid blocking HTTP responses"
  - "[06-02] circle_activity notifications only fire for members with 'immediate' preference (null treated as immediate)"
  - "[06-02] 410/404 push errors trigger automatic subscription cleanup"
metrics:
  duration: "~25 min"
  completed: "2026-03-15"
  tasks_completed: 3
  tasks_total: 3
---

# Phase 6 Plan 2: Notification System Summary

Persistent in-app notification system with web-push delivery, Resend email fallback, NotificationBell UI, and scheduled wellbeing reminders.

## What Was Built

### DB Schema (Task 1)
- `notifications` table: stores all in-app notifications (contributorId, type, title, body, url, readAt)
- `pushSubscriptions` table: stores browser push subscription endpoints per contributor
- `notifyCircleActivity` column on `contributorProfiles`: enum `immediate | daily_digest | off`
- `notificationTypeEnum`: 6 types — challenge_match, circle_formed, circle_activity, wellbeing_reminder, resolution_feedback, payment_received

### Notification Service (Task 1)
- `notify(contributorId, payload)`: inserts in-app record, tries push via web-push, falls back to Resend email
- `notifyBatch(contributorIds, payload)`: sequential calls to notify to avoid rate limits
- VAPID keys set on module load with graceful degradation (warning logged if not configured)
- 410/404 push errors trigger automatic subscription row deletion

### REST API (Task 1)
7 endpoints at `/api/notifications`:
- `GET /` — list notifications (most recent 50, desc by createdAt)
- `PATCH /:id/read` — mark single notification read
- `POST /read-all` — mark all unread notifications as read
- `POST /push-sub` — register/upsert browser push subscription
- `DELETE /push-sub` — remove push subscription
- `GET /preferences` — read notifyCircleActivity preference
- `PATCH /preferences` — update notifyCircleActivity preference

### NotificationBell UI (Task 2)
- Bell SVG icon with red unread count badge (hidden when 0)
- Dropdown panel: notifications list, "Mark all read" button, empty state
- Each item: title, body (truncated), relative time, left border accent for unread
- Click: marks read + navigates to deep link URL
- Outside click closes dropdown via useEffect document listener
- TanStack Query polling every 60 seconds
- Integrated into Navbar for authenticated users only

### Scheduled Job + Business Events (Task 3)
- Wellbeing reminder cron: daily 09:00 UTC via node-cron
  - Targets contributors with most recent check-in > 56 days ago
  - Targets contributors with zero check-ins and account > 56 days old
- challenge_match: fires on first-time interest expression in challenges.ts
- circle_formed: fires on circle creation (all initial members)
- circle_activity: fires on note post (members with immediate preference, excluding author)
- payment_received: fires on stipend release and invoice.paid webhook

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] notifyCircleActivityEnum forward reference**
- **Found during:** Task 1
- **Issue:** TypeScript "used before declaration" error — `notifyCircleActivityEnum` was declared after `contributorProfiles` table that references it
- **Fix:** Moved `notifyCircleActivityEnum` declaration to before `contributorProfiles` in schema.ts, with comment "declared early — used in contributorProfiles"
- **Files modified:** packages/server/src/db/schema.ts
- **Commit:** 6ed4630

## Self-Check: PASSED

All key files verified to exist. All 3 commits verified in git log:
- 6ed4630: feat(06-02): add notification DB schema, service, and REST routes
- 2590b80: feat(06-02): add NotificationBell component and navbar integration
- 3a2427f: feat(06-02): scheduled wellbeing reminder job and notify() in business event routes

All typecheck passes across packages/server, packages/shared, packages/web.
