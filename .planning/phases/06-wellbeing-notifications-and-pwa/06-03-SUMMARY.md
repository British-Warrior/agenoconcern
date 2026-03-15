---
phase: 06-wellbeing-notifications-and-pwa
plan: 03
status: complete
started: 2026-03-15
completed: 2026-03-15
duration: ~10 min
---

## Summary

Configured the application as an installable PWA with custom service worker, manifest, push notification handling, and home screen install prompt.

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | PWA build pipeline — plugin, service worker, manifest, icons, env | ✓ |
| 2 | Push subscription hook, install prompt hook, navbar integration | ✓ |

## Key Files

### Created
- `packages/web/src/sw.ts` — Custom service worker with Workbox precaching + push handler + notificationclick
- `packages/web/src/hooks/usePushSubscription.ts` — Subscribe/unsubscribe push with VAPID key
- `packages/web/src/hooks/useInstallPrompt.ts` — Capture beforeinstallprompt for deferred install
- `packages/web/public/icons/icon-192x192.png` — PWA icon 192x192 (teal placeholder)
- `packages/web/public/icons/icon-512x512.png` — PWA icon 512x512 (teal placeholder)
- `packages/web/.env.example` — VITE_VAPID_PUBLIC_KEY env var documentation

### Modified
- `packages/web/vite.config.ts` — Added VitePWA plugin with injectManifest strategy and manifest
- `packages/web/src/main.tsx` — Added registerSW for service worker registration
- `packages/web/src/vite-env.d.ts` — Added vite-plugin-pwa/client type reference
- `packages/web/tsconfig.json` — Excluded sw.ts (compiled separately by plugin)
- `packages/web/src/components/layout/Navbar.tsx` — Added notification enable and install app buttons
- `packages/web/package.json` — Added vite-plugin-pwa, workbox-precaching, workbox-window

## Decisions

- [06-03]: sw.ts excluded from main tsconfig — vite-plugin-pwa compiles it separately with WebWorker types
- [06-03]: registerSW auto-updates on refresh — no update prompt UI needed at pilot scale
- [06-03]: Push subscription uses .buffer as ArrayBuffer cast — TypeScript strict ArrayBuffer/SharedArrayBuffer distinction
- [06-03]: Notification and install buttons are text-only in navbar — unobtrusive, no modal prompts

## Commits

- `48f830f`: feat(06-03): PWA build pipeline — plugin, service worker, manifest, icons
- `298d168`: feat(06-03): push subscription hook, install prompt hook, navbar integration

## Self-Check

- [x] sw.ts has push event listener, notificationclick handler, precacheAndRoute
- [x] vite.config.ts has VitePWA with injectManifest strategy
- [x] usePushSubscription integrates with 06-02 notification endpoints
- [x] useInstallPrompt captures beforeinstallprompt
- [x] Navbar renders conditional Enable Notifications and Install App buttons
- [x] Icons exist in public/icons/
- [x] TypeScript compiles clean (npx tsc --noEmit)

## Human Verification

Pending — orchestrator will present checkpoint.
