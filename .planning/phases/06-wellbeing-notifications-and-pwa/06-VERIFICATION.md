---
phase: 06-wellbeing-notifications-and-pwa
verified: 2026-03-15T14:00:00Z
status: gaps_found
score: 11/12 must-haves verified
re_verification: false
gaps:
  - truth: Service worker precaches app shell for offline access
    status: partial
    reason: navigateFallback is missing from vite.config.ts injectManifest block. The plan specified navigateFallback /index.html. Without it offline deep-link navigation returns 404.
    artifacts:
      - path: packages/web/vite.config.ts
        issue: injectManifest block missing navigateFallback
    missing:
      - Add navigateFallback /index.html to injectManifest in packages/web/vite.config.ts
human_verification:
  - test: GDPR DPIA confirmation
    expected: DPIA covering wellbeing scores as UK GDPR Article 9 special category health data
    why_human: DPIA is a legal document external to the codebase
  - test: WEMWBS licence confirmation
    expected: SWEMWBS licence registered with Warwick Medical School
    why_human: Licence registration is external to the codebase
  - test: PWA installability in browser
    expected: Browser shows install prompt over HTTPS; installs and launches in standalone mode
    why_human: Requires live HTTPS environment
  - test: Push notification end-to-end delivery
    expected: With VAPID keys configured, Enable Notifications triggers permission; business event produces system notification; click opens app at correct URL
    why_human: Requires VAPID keys and real browser push environment
  - test: Wellbeing onboarding flow navigation
    expected: After Stripe skip user lands on /onboarding/wellbeing; Submit disabled without consent; navigates to /onboarding/complete on success
    why_human: Interactive form state and navigation require human browser testing
  - test: 8-week dashboard nudge
    expected: Dashboard shows wellbeing check-in due banner when GET /api/wellbeing/due returns due true
    why_human: Requires database manipulation to simulate overdue state
---

# Phase 6: Wellbeing, Notifications, and PWA Verification Report

**Phase Goal:** Platform supports contributor wellbeing, keeps users informed, and works as an installable PWA
**Verified:** 2026-03-15T14:00:00Z
**Status:** gaps_found (1 gap + 6 human verification items)
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User completes wellbeing check-in (UCLA 3-item + SWEMWBS 7-item) at onboarding | VERIFIED | WellbeingForm.tsx has 3 UCLA questions (4 options each) and 7 SWEMWBS statements (5 options each); routed at /onboarding/wellbeing between /onboarding/stripe and /onboarding/complete; StripeConnect skip navigates to /onboarding/wellbeing |
| 2 | User is prompted every 8 weeks after onboarding | VERIFIED | GET /api/wellbeing/due returns due:true when no check-in or last >56 days ago; Dashboard.tsx renders nudge banner; wellbeing-reminder.job.ts cron fires daily at 09:00 UTC |
| 3 | Wellbeing data stored with GDPR special category protections | VERIFIED (code) / HUMAN (DPIA) | consentGranted: z.literal(true) in Zod schema; server inserts consentRecord with purpose=wellbeing_checkin; consentRecordId FK is NOT NULL; DPIA requires human confirmation |
| 4 | User receives notifications for all 6 types | VERIFIED | challenge_match in challenges.ts; circle_formed and circle_activity in circles.ts with preference filtering; wellbeing_reminder via cron; payment_received in payments.ts; resolution_feedback type exists as planned infrastructure |
| 5 | Notifications via PWA push with email fallback; Circle activity configurable | VERIFIED | notification.service.ts tries web-push then Resend email; notifyCircleActivity with immediate/daily_digest/off; circles.ts filters by preference |
| 6 | Notifications stored persistently with read/unread status | VERIFIED | notifications table with readAt nullable; GET /api/notifications returns 50 desc; PATCH /:id/read and POST /read-all; NotificationBell shows unread count badge |
| 7 | Application is installable as PWA from home screen | VERIFIED (code) / HUMAN (browser) | VitePWA injectManifest strategy; manifest has name, short_name, icons, display:standalone, start_url, theme_color; both icon PNGs present |
| 8 | Service worker handles push events and notification clicks | VERIFIED | sw.ts addEventListener(push) shows system notification; addEventListener(notificationclick) opens app at URL; addEventListener(pushsubscriptionchange) re-subscribes |
| 9 | Service worker precaches app shell for offline access | PARTIAL | precacheAndRoute(__WB_MANIFEST) in sw.ts; Workbox globPatterns in vite.config.ts; BUT navigateFallback missing -- offline deep-link navigation returns 404 |
| 10 | User can subscribe to push notifications via UI button | VERIFIED | usePushSubscription.ts checks isSupported + VAPID key, requests permission, subscribes, POSTs to /api/notifications/push-sub; Navbar renders Enable notifications conditionally |
| 11 | Install prompt captured and surfaced as in-app install button | VERIFIED | useInstallPrompt.ts captures beforeinstallprompt; Navbar renders Install App when canInstall; triggerInstall calls deferredPrompt.prompt() |
| 12 | Impact dashboard shows wellbeing trajectory | VERIFIED | ImpactSummary.wellbeingTrajectory typed as WellbeingTrajectoryPoint[] (not never[]); impact.ts queries wellbeingCheckins and returns real data |

**Score:** 11/12 truths verified (truth 9 partial)

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/server/src/db/schema.ts` | VERIFIED | wellbeingCheckins (10 item columns, 2 score columns, consentRecordId FK); notifications; pushSubscriptions; notifyCircleActivityEnum; notifyCircleActivity on contributorProfiles |
| `packages/shared/src/types/wellbeing.ts` | VERIFIED | 23 lines; WellbeingCheckinInput, WellbeingCheckin, WellbeingDueResponse, WellbeingTrajectoryPoint |
| `packages/shared/src/schemas/wellbeing.ts` | VERIFIED | 27 lines; wellbeingCheckinSchema with z.literal(true) for consentGranted; tuple validation uclaItems (3x 1-4) and wemwbsItems (7x 1-5) |
| `packages/server/src/routes/wellbeing.ts` | VERIFIED | 126 lines; exports wellbeingRoutes; POST /checkin, GET /due, GET /history with real DB queries |
| `packages/web/src/pages/onboarding/Wellbeing.tsx` | VERIFIED | 37 lines; wraps WellbeingForm showSkip=false; navigates to /onboarding/complete on success |
| `packages/web/src/pages/wellbeing/WellbeingCheckin.tsx` | VERIFIED | 42 lines; wraps WellbeingForm showSkip=true; navigates to /dashboard on success |
| `packages/web/src/components/wellbeing/WellbeingForm.tsx` | VERIFIED | 254 lines; full UCLA + SWEMWBS form; canSubmit = uclaComplete && swemwbsComplete && consentChecked; real mutation |
| `packages/server/src/services/notification.service.ts` | VERIFIED | 125 lines; notify() and notifyBatch(); web-push with 410/404 cleanup; Resend email fallback; VAPID graceful degradation |
| `packages/server/src/routes/notifications.ts` | VERIFIED | 152 lines; exports notificationRoutes; all 7 endpoints with real DB queries |
| `packages/shared/src/types/notifications.ts` | VERIFIED | 31 lines; NotificationType, NotifyCircleActivity, Notification, NotificationPreferences, PushSubscriptionInput |
| `packages/web/src/components/layout/NotificationBell.tsx` | VERIFIED | 140 lines; bell SVG with unread badge; dropdown with list, mark all read, relative timestamps, outside-click close |
| `packages/server/src/services/wellbeing-reminder.job.ts` | VERIFIED | 71 lines; exports startWellbeingReminderJob; cron 0 9 * * *; queries both overdue categories; notifyBatch |
| `packages/web/src/sw.ts` | VERIFIED | 50 lines; precacheAndRoute, push event handler, notificationclick handler, pushsubscriptionchange handler |
| `packages/web/vite.config.ts` | PARTIAL | 44 lines; VitePWA injectManifest strategy; manifest correct; navigateFallback missing from injectManifest block |
| `packages/web/src/hooks/usePushSubscription.ts` | VERIFIED | 66 lines; subscribe/unsubscribe with VAPID key check; isSupported guard; graceful degradation |
| `packages/web/src/hooks/useInstallPrompt.ts` | VERIFIED | 30 lines; captures beforeinstallprompt; canInstall + triggerInstall |
| `packages/web/public/icons/icon-192x192.png` | VERIFIED | 548 bytes valid PNG |
| `packages/web/public/icons/icon-512x512.png` | VERIFIED | 1882 bytes valid PNG |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| WellbeingForm.tsx | /api/wellbeing/checkin | useSubmitCheckin mutation POSTs uclaItems, wemwbsItems, consentGranted:true | WIRED |
| Dashboard.tsx | /api/wellbeing/due | useWellbeingDue hook; due:true renders nudge banner linking to /wellbeing/checkin | WIRED |
| packages/shared/src/types/impact.ts | WellbeingTrajectoryPoint | imports from wellbeing.ts; ImpactSummary.wellbeingTrajectory typed correctly | WIRED |
| notification.service.ts | pushSubscriptions table | queries by contributorId; webpush.sendNotification per sub; 410/404 cleanup | WIRED |
| notification.service.ts | Resend | resend.emails.send() when no push succeeded; skips without RESEND_API_KEY | WIRED |
| NotificationBell.tsx | /api/notifications | useNotifications polls every 60s; useMarkRead and useMarkAllRead mutations | WIRED |
| wellbeing-reminder.job.ts | notification.service.ts | notifyBatch(allIds, wellbeing_reminder); started in index.ts listen callback | WIRED |
| challenges.ts | notification.service.ts | notify(contributorId, challenge_match) on interest expression; fire-and-forget .catch | WIRED |
| circles.ts | notification.service.ts | notifyBatch for circle_formed; notifyBatch for circle_activity filtered by immediate preference | WIRED |
| payments.ts | notification.service.ts | notify(payment_received) on stipend transfer and invoice.paid webhook | WIRED |
| usePushSubscription.ts | /api/notifications/push-sub | POST subscription JSON after browser subscribe; DELETE on unsubscribe | WIRED |
| vite.config.ts | sw.ts | injectManifest strategy with filename sw.ts compiles and injects __WB_MANIFEST | WIRED |
| vite.config.ts injectManifest | /index.html offline fallback | navigateFallback should route offline deep-link requests to index.html | NOT_WIRED |

---

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| ONBD-07 | SATISFIED | /onboarding/wellbeing between stripe and complete; StripeConnect skip navigates there |
| WELL-01 | SATISFIED | UCLA 3-item (1-4) + SWEMWBS 7-item (1-5) with correct scales |
| WELL-02 | SATISFIED | 56-day threshold in /due endpoint; Dashboard nudge; daily cron |
| WELL-03 | PARTIALLY SATISFIED | Code enforces explicit consent via z.literal(true) and consentRecord; DPIA requires human confirmation |
| NOTF-01 | SATISFIED | challenge_match fires in challenges.ts on interest expression |
| NOTF-02 | SATISFIED | circle_formed fires via notifyBatch in circles.ts on circle creation |
| NOTF-03 | SATISFIED | notifyCircleActivity column; circles.ts filters by preference before firing circle_activity |
| NOTF-04 | SATISFIED | Daily cron 09:00 UTC fires wellbeing_reminder |
| NOTF-05 | SATISFIED (infrastructure) | resolution_feedback type exists; trigger deferred to future phase by design |
| NOTF-06 | SATISFIED | payment_received fires on stipend transfer and invoice.paid webhook |
| NOTF-07 | SATISFIED | web-push with Resend email fallback; 410/404 subscription cleanup |
| PLAT-03 | PARTIALLY SATISFIED | Manifest and install wired; offline SPA deep-link gap from missing navigateFallback |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `packages/web/vite.config.ts` | Missing navigateFallback in injectManifest | Warning | Offline users navigating to deep links get 404; root URL still works |

No TODO, FIXME, placeholder, or stub patterns found in any phase 6 source files.

---

### Human Verification Required

#### 1. GDPR DPIA Confirmation

**Test:** Confirm a Data Protection Impact Assessment has been completed or formally initiated.
**Expected:** DPIA on file covering wellbeing scores as UK GDPR Article 9 special category health data.
**Why human:** Legal/organizational document external to the codebase.

#### 2. WEMWBS Licence Confirmation

**Test:** Confirm SWEMWBS licence registered at https://warwick.ac.uk/fac/sci/med/research/platform/wemwbs/using/register/
**Expected:** Licence registration email on file. Free for non-commercial use but registration is required.
**Why human:** External registration; cannot be verified in code.

#### 3. PWA Installability in Browser

**Test:** Serve app over HTTPS. Check for install prompt or address bar install icon. Complete install to home screen.
**Expected:** App installs and launches in standalone mode with name Age No Concern and teal theme color.
**Why human:** Requires HTTPS environment; browser install UX is visual.

#### 4. Push Notification End-to-End

**Test:** Configure VAPID keys in packages/server and packages/web .env. Click Enable notifications. Express interest in a challenge. Verify system notification; click it.
**Expected:** System notification with title Interest registered; clicking opens app at /challenges/{id}.
**Why human:** Requires VAPID keys configured and real browser push environment.

#### 5. Wellbeing Onboarding Flow

**Test:** Navigate onboarding to Stripe step; click Skip. Verify /onboarding/wellbeing. Try submitting without consent. Check consent box; submit.
**Expected:** Submit disabled without consent; enabled with consent; navigates to /onboarding/complete on success.
**Why human:** Interactive form state and navigation require browser testing.

#### 6. 8-Week Dashboard Nudge

**Test:** Insert a wellbeing check-in with completedAt 57+ days ago, or clear all check-ins. Navigate to /dashboard.
**Expected:** Teal banner with Your wellbeing check-in is due and Complete now link to /wellbeing/checkin.
**Why human:** Requires database manipulation to simulate overdue state.

---

### Gaps Summary

One gap partially blocks the offline precaching goal:

**Missing navigateFallback in vite.config.ts** -- The plan specified navigateFallback in the injectManifest block. This is absent. The service worker precaches static assets correctly but offline navigation to any URL except root returns 404 instead of serving the SPA index.html. Root URL still works offline. Fix: add `navigateFallback: '/index.html'` to the `injectManifest` object in `packages/web/vite.config.ts`.

All other must-haves are fully implemented and wired. Wellbeing check-in flows, GDPR consent enforcement via z.literal(true) and separate consent records, 8-week reminder scheduling, full notification system with push and email, in-app NotificationBell with 60s polling, all six notification types wired to business events, PWA manifest with correct fields and icons, push subscription hooks with graceful degradation, install prompt hook -- all substantive and correctly connected.

---

_Verified: 2026-03-15T14:00:00Z_
_Verifier: Claude (gsd-verifier)_
