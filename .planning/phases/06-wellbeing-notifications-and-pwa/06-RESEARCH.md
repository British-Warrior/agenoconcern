# Phase 6: Wellbeing, Notifications, and PWA - Research

**Researched:** 2026-03-14
**Domain:** Wellbeing check-in forms (UCLA + WEMWBS), GDPR special category data, PWA push notifications (web-push + vite-plugin-pwa), email fallback (Resend, already installed)
**Confidence:** MEDIUM-HIGH (PWA/push APIs verified via official docs and vite-pwa-org; WEMWBS licensing confirmed via Warwick University; web-push confirmed via npm registry; GDPR Appropriate Policy Document guidance verified via ICO; UCLA licensing is LOW confidence — no official page confirmed free use)

---

## Summary

Phase 6 is the final v1 milestone and introduces three largely independent subsystems on top of the complete Phases 1–5 platform. The wellbeing subsystem must collect UCLA Loneliness Scale (3-item) and WEMWBS (7-item SWEMWBS short form) scores at onboarding and every 8 weeks. Both scales produce numeric scores stored as GDPR special category health data — requiring explicit consent (separate from general T&C consent), a completed DPIA, and an Appropriate Policy Document before any code is written. **Two legal blockers must be resolved before 06-01 can begin**: WEMWBS commercial licence from University of Warwick (ANC takes platform fees, so it is a commercial entity) and completion of the DPIA + Appropriate Policy Document by the DPO/legal team.

The notification subsystem delivers in-app and push notifications for all seven NOTF requirements. The architecture is: (1) a `notifications` table records every event, (2) a `push_subscriptions` table stores browser VAPID subscription objects per contributor, (3) the `web-push` Node.js library sends encrypted push messages, (4) `Resend` (already installed) handles email fallback, and (5) the service worker handles `push` events to show notifications. Circle activity notifications must be configurable (immediate / daily digest / off) via a `notification_preferences` table or JSONB column on `contributor_profiles`. Email is sent if no push subscription exists for the contributor or if push delivery fails.

The PWA subsystem uses `vite-plugin-pwa` with the `injectManifest` strategy (not `generateSW`) so the service worker can be hand-written to include push event handling alongside Workbox precaching. A manifest with `name`, `short_name`, `icons` (192×192 and 512×512 PNG), `start_url`, `display: standalone`, `theme_color`, and `background_color` is the minimum for browser installability. The beforeinstallprompt event must be captured and surfaced as a deferred install prompt in the UI. The Express server already serves static files and does not need changes for the manifest MIME type in development, but production deployment must serve `manifest.webmanifest` with `application/manifest+json`.

**Primary recommendation:** Resolve legal blockers first (WEMWBS licence + DPIA/APD). Then build 06-01 (wellbeing DB + check-in UI + GDPR consent), 06-02 (notification service + push + email), and 06-03 (PWA manifest + service worker + install prompt) in that order — each plan is independently deployable with no circular dependencies.

---

## Codebase State (Phase 5 Complete)

What already exists — the planner MUST NOT re-build these:

| Item | Location | Status |
|------|----------|--------|
| `consentRecords` table | `packages/server/src/db/schema.ts` | Exists — reuse for wellbeing consent record |
| `contributorProfiles` table | `packages/server/src/db/schema.ts` | Exists — `commFrequency` enum (immediate/daily/weekly) already there |
| Resend SDK (`resend@^4.1.0`) | `packages/server/package.json` | Installed — use for email fallback |
| `RESEND_API_KEY` env var | `packages/server/src/config/env.ts` | Exists (already configured) |
| JWT auth + `authMiddleware` | `packages/server/src/middleware/auth.ts` | Exists |
| `ImpactSummary.wellbeingTrajectory` | `packages/shared/src/types/impact.ts` | `never[]` placeholder — Phase 6 replaces it |
| Express app setup | `packages/server/src/express-app.ts` | Exists — just add new routes |
| React Router with `ProtectedRoute` | `packages/web/src/App.tsx` | Exists — add new routes |
| Vite 6 + React plugin | `packages/web/vite.config.ts` | Exists — add PWA plugin here |
| Onboarding flow (7 steps) | `packages/web/src/pages/onboarding/` | Complete — wellbeing step must insert before Complete.tsx |

What does NOT yet exist (Phase 6 must create):

| Item | Where to create |
|------|----------------|
| `wellbeingCheckins` table | `packages/server/src/db/schema.ts` |
| `pushSubscriptions` table | `packages/server/src/db/schema.ts` |
| `notifications` table | `packages/server/src/db/schema.ts` |
| Notification preferences column/table | `packages/server/src/db/schema.ts` |
| Wellbeing routes | `packages/server/src/routes/wellbeing.ts` (new file) |
| Notification routes | `packages/server/src/routes/notifications.ts` (new file) |
| Push subscription route | part of notifications routes |
| Wellbeing types/schemas | `packages/shared/src/types/wellbeing.ts`, `packages/shared/src/schemas/wellbeing.ts` |
| Notification types | `packages/shared/src/types/notifications.ts` |
| Wellbeing check-in page | `packages/web/src/pages/onboarding/Wellbeing.tsx` |
| Wellbeing reminder modal/page | `packages/web/src/pages/wellbeing/WellbeingCheckin.tsx` |
| Push subscription hook | `packages/web/src/hooks/usePushSubscription.ts` |
| Notification bell/dropdown | `packages/web/src/components/layout/` |
| `vite-plugin-pwa` plugin | `packages/web/vite.config.ts` |
| Custom service worker | `packages/web/src/sw.ts` |
| PWA manifest config | inside vite.config.ts VitePWA options |
| App icons | `packages/web/public/icons/` (192×192 and 512×512 PNG) |
| VAPID key env vars | `packages/server/src/config/env.ts` |
| web-push Node.js library | `packages/server` (new install) |

---

## Standard Stack

### Core (new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vite-plugin-pwa` | latest (^0.21.x) | PWA manifest + service worker generation for Vite | Official Vite PWA plugin; well-maintained; handles Workbox + manifest |
| `workbox-window` | latest | SW registration lifecycle hooks in the React app | Peer dep of vite-plugin-pwa; required for `virtual:pwa-register/react` |
| `web-push` | 3.6.7 | Send VAPID-authenticated encrypted push notifications from Node | De-facto standard Node.js web push library (MPL-2.0 licence) |
| `@types/web-push` | latest | TypeScript types for web-push | No built-in types |

### Already Installed (no new install needed)

| Library | Version | Purpose |
|---------|---------|---------|
| `resend` | ^4.1.0 | Email fallback for notifications |
| `drizzle-orm` | ^0.38.0 | New tables for wellbeing, push subscriptions, notifications |
| `zod` | ^3.24.0 | Schema validation for check-in payloads |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `web-push` | Firebase Cloud Messaging (FCM) | FCM requires Google accounts for sender ID; web-push is protocol-native and vendor-neutral |
| `vite-plugin-pwa` (injectManifest) | `generateSW` | generateSW cannot include custom push handlers; injectManifest required for push |
| Resend for email | Nodemailer | Resend already installed and configured; no reason to add Nodemailer |
| Custom notification table | Real-time websocket | WebSocket adds deployment complexity; polling + push covers requirements |

**Installation (packages/server):**
```bash
npm install web-push
npm install -D @types/web-push
```

**Installation (packages/web):**
```bash
npm install -D vite-plugin-pwa workbox-window
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
packages/server/src/
├── routes/
│   ├── wellbeing.ts        # POST /api/wellbeing/checkin, GET /api/wellbeing/due
│   └── notifications.ts   # GET /api/notifications, POST /api/notifications/push-sub
├── services/
│   └── notification.service.ts  # sendPush(), sendEmail(), queueNotification()
└── db/schema.ts            # + wellbeingCheckins, pushSubscriptions, notifications tables

packages/shared/src/
├── types/
│   ├── wellbeing.ts
│   └── notifications.ts
└── schemas/
    ├── wellbeing.ts
    └── notifications.ts

packages/web/src/
├── pages/
│   ├── onboarding/
│   │   └── Wellbeing.tsx        # Onboarding check-in step (ONBD-07)
│   └── wellbeing/
│       └── WellbeingCheckin.tsx # 8-week reminder check-in
├── hooks/
│   ├── usePushSubscription.ts  # subscribe/unsubscribe VAPID push
│   └── useNotifications.ts     # fetch notification list
├── components/
│   └── layout/
│       └── NotificationBell.tsx # Bell icon + dropdown in AppShell nav
└── sw.ts                        # Custom service worker (push + precache)

packages/web/
└── public/
    └── icons/
        ├── icon-192x192.png
        └── icon-512x512.png
```

### Pattern 1: VAPID Push Subscription Flow

**What:** Browser subscribes using the server's VAPID public key, stores the PushSubscription JSON, then sends it to the server for storage.

**When to use:** On first login for active contributors; re-subscribe if `pushsubscriptionchange` fires.

**Example (client — usePushSubscription.ts):**
```typescript
// Source: MDN Push API docs + web.dev push protocol article
async function subscribeToPush(vapidPublicKey: string) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  // POST subscription JSON to /api/notifications/push-sub
  await fetch('/api/notifications/push-sub', {
    method: 'POST',
    body: JSON.stringify(subscription.toJSON()),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Pattern 2: Server-Side Push with Email Fallback

**What:** When an event fires (circle formed, payment received, etc.), call `notificationService.notify(contributorId, event)`. The service looks up the contributor's push subscription. If found, send push via web-push; if push fails or no subscription, send email via Resend.

**Example (notification.service.ts):**
```typescript
// Source: web-push npm registry (v3.6.7) + Resend docs
import webpush from 'web-push';
import { Resend } from 'resend';

webpush.setVapidDetails(
  'mailto:support@indomitableunity.org',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

async function notify(contributorId: string, payload: NotificationPayload) {
  const sub = await getPushSubscription(contributorId);
  if (sub) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
      return;
    } catch {
      // fall through to email
    }
  }
  await resend.emails.send({ to: [email], subject: payload.title, html: payload.body });
}
```

### Pattern 3: Service Worker Push Handler (injectManifest)

**What:** A hand-written `sw.ts` file that uses Workbox precaching AND handles push events. The `injectManifest` strategy compiles it and injects the precache manifest.

**Example (packages/web/src/sw.ts):**
```typescript
// Source: vite-pwa-org injectManifest guide + web.dev push notifications series
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Indomitable Unity', {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data.url;
      const existing = clientList.find((c) => c.url === url);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
```

**vite.config.ts update:**
```typescript
// Source: vite-pwa-org injectManifest + React guide
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'prompt',
  manifest: {
    name: 'Indomitable Unity',
    short_name: 'ANC',
    description: 'Connect older professionals with organisations that need their expertise',
    theme_color: '#your-primary',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

### Pattern 4: Wellbeing Check-in Schema (Special Category Data)

**What:** Store UCLA (3 items, 1–4 Likert) and WEMWBS/SWEMWBS (7 items, 1–5 Likert) scores separately. Include composite scores and explicit consent reference.

**Database design:**
```typescript
// packages/server/src/db/schema.ts additions
export const wellbeingCheckins = pgTable('wellbeing_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id, { onDelete: 'cascade' }),
  consentRecordId: uuid('consent_record_id').notNull().references(() => consentRecords.id),
  // UCLA 3-item short form (responses 1–4: never/rarely/sometimes/often)
  uclaItem1: smallint('ucla_item_1').notNull(),
  uclaItem2: smallint('ucla_item_2').notNull(),
  uclaItem3: smallint('ucla_item_3').notNull(),
  uclaScore: smallint('ucla_score').notNull(), // sum 3–12
  // SWEMWBS 7-item (responses 1–5: none/rarely/some/often/all)
  wemwbsItem1: smallint('wemwbs_item_1').notNull(),
  wemwbsItem2: smallint('wemwbs_item_2').notNull(),
  wemwbsItem3: smallint('wemwbs_item_3').notNull(),
  wemwbsItem4: smallint('wemwbs_item_4').notNull(),
  wemwbsItem5: smallint('wemwbs_item_5').notNull(),
  wemwbsItem6: smallint('wemwbs_item_6').notNull(),
  wemwbsItem7: smallint('wemwbs_item_7').notNull(),
  wemwbsScore: smallint('wemwbs_score').notNull(), // sum 7–35
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id, { onDelete: 'cascade' }),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationTypeEnum = pgEnum('notification_type', [
  'challenge_match',
  'circle_formed',
  'circle_activity',
  'wellbeing_reminder',
  'resolution_feedback',
  'payment_received',
]);

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  url: text('url'),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Pattern 5: 8-Week Reminder Check (WELL-02)

**What:** A scheduled check or on-login check that determines if a contributor is due a wellbeing check-in (last check-in > 56 days ago, or never completed one).

**Approach:** Since there is no job scheduler installed, implement as a GET endpoint the frontend calls after login (`GET /api/wellbeing/due`). Returns `{ due: boolean, lastCheckinAt: string | null }`. The frontend checks this on Dashboard mount and redirects to `/wellbeing/checkin` if due.

**Alternative:** A cron job (via `node-cron` or platform-level scheduler) for server-driven reminders would trigger the notification rather than requiring user to visit the app. This is more reliable for WELL-04 (notification when check-in is due). Recommend combining: the frontend polls on login AND the server sends a NOTF-04 push/email notification via cron.

### Anti-Patterns to Avoid

- **Using `generateSW` strategy:** Cannot add push event handlers to auto-generated service workers. Always use `injectManifest` when push notifications are needed.
- **Storing raw PushSubscription object as JSON without splitting keys:** Store `endpoint`, `p256dh`, and `auth` as separate columns so web-push can reconstruct the subscription object cleanly.
- **Skipping `event.waitUntil()` in service worker push handler:** The browser will kill the SW before the notification displays. Always wrap `showNotification` in `event.waitUntil()`.
- **Requesting notification permission on page load:** Browser best practice is to request permission in response to a user gesture. Use a prompt after they interact with a "Enable notifications" button.
- **Using localStorage for VAPID public key:** Pass it as a Vite env variable (`VITE_VAPID_PUBLIC_KEY`) — it is public and safe to expose.
- **Single subscription per user:** A contributor may have multiple devices/browsers. Allow multiple push subscriptions per contributor (unique on `endpoint`).
- **Not handling 410 Gone from push service:** When `web-push.sendNotification` throws a 410 status, the subscription has expired — delete it from the database.
- **Forgetting `navigateFallback` for SPA:** Without `navigateFallback: 'index.html'` in the Workbox config, navigating to a cached route while offline shows a browser error instead of the app shell.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Push encryption (ECDH + AES-128-GCM) | Custom encryption | `web-push` | Web Push Protocol encryption is non-trivial; web-push handles VAPID JWT signing + payload encryption |
| Service worker precache manifest | Manual cache list | `vite-plugin-pwa` (injectManifest) | The plugin injects `__WB_MANIFEST` with content hashes; manual lists get stale |
| Email sending | Nodemailer/SMTP config | `resend` (already installed) | Resend is already in use for auth emails in Phase 1 |
| UCLA / WEMWBS scoring | Custom scoring logic | Well-defined arithmetic: UCLA = sum(3 items, 3–12); SWEMWBS = sum(7 items, 7–35) | Simple addition, but score thresholds must match validated instrument norms |
| Notification queue with retries | Custom queue | Simple try/catch with email fallback | Phase 6 volume doesn't warrant a full queue; direct try-push → fallback-email is sufficient |

**Key insight:** The push encryption in the Web Push Protocol is the most deceptively complex part. A single call to `webpush.sendNotification(subscription, payload)` handles all of it — don't attempt to implement ECDH encryption manually.

---

## Common Pitfalls

### Pitfall 1: WEMWBS Commercial Licence Required
**What goes wrong:** Deploying WEMWBS check-in without a commercial licence from University of Warwick. Indomitable Unity charges platform fees (25% of stipends, SME subscriptions), making it a commercial entity.
**Why it happens:** WEMWBS is free for non-commercial/academic use; this is easy to miss.
**How to avoid:** Obtain commercial licence before building 06-01. SWEMWBS (7 questions) is a licenced instrument — the licence covers both full (14-item) and short (7-item) forms. Contact Warwick Innovations: https://warwick.ac.uk/services/innovations/wemwbs/licenses/
**Warning signs:** Any "wellbeing check-in" code written before licence is confirmed.

### Pitfall 2: DPIA and Appropriate Policy Document are Legal Prerequisites
**What goes wrong:** Writing wellbeing check-in code before the DPIA is approved. Under UK GDPR, processing special category health data requires a completed DPIA and — when using Schedule 1 conditions — an Appropriate Policy Document (APD) from the DPO.
**Why it happens:** Developers treat it as a documentation checkbox rather than a gating dependency.
**How to avoid:** 06-01 planning tasks should have an explicit "DPIA + APD signed off" prerequisite step. The consent record stored in `consentRecords` must reference the specific DPIA version.
**Warning signs:** No APD document path referenced in the codebase; no explicit wellbeing consent purpose code in `consentRecords`.

### Pitfall 3: Service Worker Not Updated After Code Change
**What goes wrong:** Changes to `sw.ts` (e.g., new push event handler) are not picked up because the browser has cached the old service worker.
**Why it happens:** Service workers update in the background; cached versions serve until all tabs close (or `skipWaiting` is called).
**How to avoid:** Use `registerType: 'prompt'` in vite-plugin-pwa config to show a "New version available" UI; do not use `autoUpdate` since it force-reloads open tabs.
**Warning signs:** Push notifications not appearing after deploying SW changes; DevTools shows "waiting to activate" SW.

### Pitfall 4: Push Subscription Not Persisted After Browser Update
**What goes wrong:** Browser updates can invalidate push subscriptions. The subscription endpoint returns 410 Gone.
**Why it happens:** Browsers rotate push endpoint keys on updates; the stored subscription becomes stale.
**How to avoid:** In the push sending service, catch HTTP 410/404 responses from `webpush.sendNotification` and delete the corresponding `pushSubscriptions` row. Listen for `pushsubscriptionchange` in the SW to re-subscribe automatically.
**Warning signs:** Notifications stop delivering for specific users; push service returns 410.

### Pitfall 5: Notification Permission Blocked
**What goes wrong:** Browser permission prompt is triggered without a user gesture, so browsers auto-deny it and the contributor never gets push.
**Why it happens:** Calling `Notification.requestPermission()` on page load.
**How to avoid:** Trigger permission request from an explicit "Enable push notifications" button click in the Dashboard or a banner. Store permission status so you don't re-prompt already-denied users.
**Warning signs:** `Notification.permission === 'denied'` for new users.

### Pitfall 6: PWA Install Prompt Not Captured
**What goes wrong:** The `beforeinstallprompt` event fires once before any script can capture it, and the install button doesn't work.
**Why it happens:** The event fires very early; if the script hasn't registered a listener it is lost.
**How to avoid:** Register the `beforeinstallprompt` listener in `main.tsx` or App-level code early in the load cycle. Store the `deferredPrompt` in a module-level variable or React context, then call `deferredPrompt.prompt()` when the install button is clicked.
**Warning signs:** "Add to Home Screen" button appears but `prompt()` throws "not available."

### Pitfall 7: Missing `navigateFallback` for SPA Offline Support
**What goes wrong:** Navigating to `/dashboard` while offline shows a browser "No internet" error even though assets are cached.
**Why it happens:** Workbox precaches files but doesn't know to serve `index.html` for all HTML navigation requests.
**How to avoid:** Add `navigateFallback: '/index.html'` to the Workbox config inside `vite-plugin-pwa`. This tells the SW to serve the cached SPA shell for all navigation requests.
**Warning signs:** App only works offline on the root `/` URL.

---

## Code Examples

Verified patterns from official sources:

### VAPID Key Generation (run once, store as env vars)
```bash
# Source: web-push npm registry CLI
npx web-push generate-vapid-keys
# Outputs:
# Public Key: <base64url>
# Private Key: <base64url>
```

Add to env config:
```typescript
// packages/server/src/config/env.ts — add to schema
VAPID_PUBLIC_KEY: z.string().default(''),
VAPID_PRIVATE_KEY: z.string().default(''),
VAPID_SUBJECT: z.string().default('mailto:support@indomitableunity.org'),
```

Add to Vite env (public key only, safe to expose):
```
# .env
VITE_VAPID_PUBLIC_KEY=<same public key>
```

### Sending a Push Notification (server)
```typescript
// Source: web-push GitHub README (v3.6.7)
import webpush from 'web-push';

webpush.setVapidDetails(
  env.VAPID_SUBJECT,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

const subscription = {
  endpoint: row.endpoint,
  keys: { p256dh: row.p256dh, auth: row.auth },
};

try {
  await webpush.sendNotification(subscription, JSON.stringify({
    title: 'New challenge match',
    body: 'You have been matched to a new challenge.',
    url: '/challenges',
  }));
} catch (err: any) {
  if (err.statusCode === 410 || err.statusCode === 404) {
    // Subscription expired — delete from DB
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, row.endpoint));
  }
  // Fall through to email fallback
}
```

### React Install Prompt Hook
```typescript
// Source: web.dev PWA installability guidance
// packages/web/src/hooks/useInstallPrompt.ts
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  };

  return { canInstall: !!deferredPrompt, triggerInstall };
}
```

### Wellbeing Consent Record (GDPR)
```typescript
// packages/server/src/routes/wellbeing.ts
// Before saving check-in data, insert a consent record
await db.insert(consentRecords).values({
  contributorId,
  purpose: 'wellbeing_checkin',  // distinct purpose from general consent
  granted: true,
  policyVersion: '1.0',          // must match DPIA version
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
// Then save the check-in data with the consentRecordId
```

### Circle Activity Notification Preference
```typescript
// Reuse existing commFrequency enum: immediate | daily | weekly
// Add notifyCircleActivity column to contributorProfiles
// or store in a separate notification_preferences JSONB column
// Recommendation: add to contributorProfiles as a nullable column defaulting to 'immediate'
notifyCircleActivity: commFrequencyEnum('notify_circle_activity').default('immediate'),
```

This avoids a new table for a single preference. If notification preferences expand, migrate to a separate table later.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FCM (Firebase) for web push | VAPID-based Web Push Protocol | ~2018 | No Google dependency; standards-based; works in all modern browsers since March 2023 |
| Manually writing SW registration | `vite-plugin-pwa` virtual module | Vite era | Handles HMR, dev mode, TypeScript types automatically |
| `generateSW` only | `injectManifest` strategy for custom logic | vite-plugin-pwa ~0.14 | Enables combining Workbox precaching with custom push/sync handlers |
| Full WEMWBS (14 items) | SWEMWBS (7 items) | 2009 | Shorter form preferred for repeated administration; validated for longitudinal use |

**Deprecated/outdated:**
- `application/x-web-app-manifest+json` MIME type: Use `application/manifest+json` instead.
- GCM-based web push (requires FCM server key): VAPID is the current standard; GCM deprecated by Google.

---

## Open Questions

1. **WEMWBS commercial licence status**
   - What we know: ANC charges platform fees → commercial entity → commercial licence required from Warwick Innovations
   - What's unclear: Lead time for licence approval; exact cost (not published on Warwick site); whether SWEMWBS (7-item) requires separate licence from full WEMWBS
   - Recommendation: Contact Warwick Innovations at https://warwick.ac.uk/services/innovations/wemwbs/licenses/ before starting 06-01 sprint planning. If licence is delayed, plan 06-03 (PWA) and 06-02 (notifications minus WELL-04 reminder) first.

2. **UCLA Loneliness Scale 3-item licence**
   - What we know: UCLA Loneliness Scale is a published research instrument. The 3-item version (Hughes et al., 2004) is widely used in surveys. Most published literature treats it as freely usable with attribution.
   - What's unclear: Whether a commercial platform deploying it for individual user wellbeing tracking requires formal permission from UCLA or the original authors.
   - Recommendation: (LOW confidence) Consult legal team. Standard academic use is attributed freely; commercial deployment for individual self-monitoring is a grey area. Tentative recommendation: use with attribution to Russell (1996) and Hughes et al. (2004).

3. **DPIA and Appropriate Policy Document completion**
   - What we know: UK GDPR Art. 9 requires explicit consent + appropriate safeguards for health data. ICO guidance requires a DPIA for "large scale processing of special category data." An APD is required when relying on Schedule 1 Part 1 (explicit consent) for special category processing.
   - What's unclear: Whether ANC's scale qualifies as "large scale" (ICO threshold is ambiguous for small platforms at launch).
   - Recommendation: Commission DPIA regardless of scale — it is good practice and required before processing. The APD must name the policy version referenced in consent records. Both documents must exist before 06-01 code begins.

4. **Job scheduler for 8-week reminders (WELL-02 / NOTF-04)**
   - What we know: No cron/job scheduler is currently installed in the codebase. The server is a plain Express app.
   - What's unclear: Whether the production deployment environment (cloud provider not specified) supports a scheduler at the infrastructure level.
   - Recommendation: For v1, implement `GET /api/wellbeing/due` that the frontend polls on login. Additionally, add `node-cron` (lightweight, no extra infrastructure) to the server for scheduled checks that trigger NOTF-04 push/email. This avoids requiring users to log in to receive reminders.

5. **Notification preferences storage**
   - What we know: NOTF-03 requires Circle activity notifications to be configurable (immediate/daily digest/off). The existing `commFrequency` enum on `contributorProfiles` covers immediate/daily/weekly — close but not identical. "Off" is not in the current enum.
   - What's unclear: Whether to reuse `commFrequency` or add a separate `notifyCircleActivity` column.
   - Recommendation: Add a new `notifyCircleActivityEnum` enum with values `immediate | daily_digest | off` to the schema — distinct from `commFrequency` which controls general communication preference. This avoids conflating two different settings.

---

## Legal/Compliance Notes (non-negotiable constraints)

These are hard blockers, not implementation choices:

1. **WEMWBS commercial licence** must be obtained from Warwick Innovations before any WEMWBS questions appear in code.
2. **DPIA** must be completed and approved by the DPO before wellbeing data is collected. The DPIA must document: data minimisation (scores only, no free-text mental health data), retention period, access controls, and right to erasure.
3. **Appropriate Policy Document (APD)** must be in place before relying on explicit consent as the Schedule 1 condition for special category processing. The APD must be referenced in consent records.
4. **Explicit consent** for wellbeing data must be separate from general T&C consent. The `consentRecords` table already supports this via the `purpose` field — use `purpose: 'wellbeing_checkin'`. Consent must be granular and withdrawable (right to erasure of check-in data must be implemented).
5. **Data minimisation**: Store only item responses and composite scores. Do not store free-text wellbeing responses. Do not link wellbeing scores to any other data in API responses accessible to admins.

---

## Sources

### Primary (HIGH confidence)
- https://vite-pwa-org.netlify.app/guide/ — vite-plugin-pwa guide, injectManifest, React setup, auto-update
- https://web.dev/articles/push-notifications-web-push-protocol — VAPID, encryption, subscription data
- https://web.dev/articles/push-notifications-display-a-notification — notification options, notificationclick
- https://web.dev/articles/add-manifest — manifest required fields
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API — Push API browser compatibility (Baseline Widely available since March 2023)
- https://registry.npmjs.org/web-push/latest — web-push v3.6.7, dependencies, exports

### Secondary (MEDIUM confidence)
- https://resend.com/docs/send-with-nodejs — Resend API, confirmed matches existing server usage
- https://warwick.ac.uk/services/innovations/wemwbs — WEMWBS commercial licence requirement confirmed
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/special-category-data/ — ICO special category data guidance (note: under review due to Data Use and Access Act 2025)
- https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html — icon sizes, manifest minimum requirements

### Tertiary (LOW confidence — needs validation)
- UCLA 3-item Loneliness Scale (Hughes et al., 2004) licensing for commercial use — could not find authoritative licence page; research literature treats it as freely usable with attribution
- `node-cron` suitability for 8-week reminder scheduling — no official docs fetched; recommendation based on training data (widely used with Express)

---

## Metadata

**Confidence breakdown:**
- Standard stack (vite-plugin-pwa + web-push): HIGH — versions confirmed via npm registry and official docs
- PWA architecture (injectManifest + push handlers): HIGH — verified against vite-pwa-org official docs
- VAPID push protocol: HIGH — verified via web.dev push notifications series
- WEMWBS licensing: HIGH — confirmed commercial licence required via Warwick University site
- GDPR/APD requirements: MEDIUM — ICO page confirmed special category data rules; APD requirement confirmed; note guidance under review post-Data Use and Access Act 2025
- UCLA licensing: LOW — not verified via authoritative source
- 8-week cron approach: MEDIUM — pattern is standard but `node-cron` not verified against current docs

**Research date:** 2026-03-14
**Valid until:** 2026-04-14 (30 days) — vite-plugin-pwa releases frequently; GDPR guidance may change post-DUA Act 2025
