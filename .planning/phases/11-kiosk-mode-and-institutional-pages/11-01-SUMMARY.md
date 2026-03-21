---
phase: 11-kiosk-mode-and-institutional-pages
plan: "01"
subsystem: web-frontend
tags: [kiosk, idle-timer, session-management, accessibility]
dependency_graph:
  requires: []
  provides:
    - kiosk-mode-activation
    - idle-auto-logout
    - kiosk-ui-variant
  affects:
    - packages/web/src/App.tsx
    - packages/web/src/components/layout/Navbar.tsx
    - packages/web/src/components/layout/AppShell.tsx
tech_stack:
  added:
    - react-idle-timer@5.7.3
  patterns:
    - module-level flag for cross-navigation state persistence
    - context + useSearchParams for URL parameter detection
    - queryClient.clear() + window.location.href for hard session wipe
key_files:
  created:
    - packages/web/src/contexts/KioskContext.tsx
    - packages/web/src/hooks/useKioskTimer.ts
    - packages/web/src/components/layout/KioskWarningOverlay.tsx
  modified:
    - packages/web/src/components/layout/Navbar.tsx
    - packages/web/src/components/layout/AppShell.tsx
    - packages/web/src/App.tsx
    - packages/web/package.json
decisions:
  - "Module-level _kioskActivated flag used to persist kiosk state across navigations — useSearchParams alone would reset on SPA navigation"
  - "KioskProvider placed inside BrowserRouter > AuthProvider so useSearchParams has Router ancestor"
  - "performLogout uses window.location.href (not navigate()) for hard navigation — ensures all in-memory state is fully cleared"
  - "queryClient.clear() preferred over invalidateQueries — kiosk requirement is complete data wipe, not stale refresh"
  - "KioskWarningOverlay rendered from Navbar (not AppShell) — co-located with useKioskTimer hook that owns showWarning state"
metrics:
  duration: "~3 minutes"
  completed: "2026-03-21"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 11 Plan 01: Kiosk Mode Implementation Summary

**One-liner:** URL-parameter kiosk mode with react-idle-timer (10 min/60 sec countdown), module-level flag persistence, touch-accessible overlay, and full session wipe via queryClient.clear() + hard navigation.

## What Was Built

Kiosk mode for shared computers (libraries, community centres) that activates via `?kiosk=true` URL parameter and provides a secure, simplified UI that auto-cleans sessions after inactivity.

### KioskContext (`packages/web/src/contexts/KioskContext.tsx`)

Module-level `let _kioskActivated = false` variable persists the kiosk flag across SPA navigations. `KioskProvider` reads `useSearchParams()` on mount and sets `_kioskActivated = true` when `?kiosk=true` is detected. `isKiosk` is derived from `_kioskActivated` (not re-read from URL each render, preventing false negatives after navigation strips query params).

### useKioskTimer (`packages/web/src/hooks/useKioskTimer.ts`)

Wraps `useIdleTimer` from react-idle-timer. Constants: `IDLE_TIMEOUT_MS = 10 * 60 * 1000`, `PROMPT_BEFORE_MS = 60 * 1000`. When `enabled = false`, `useIdleTimer` is disabled (non-kiosk users unaffected). `onPrompt` starts 60-second countdown via `setInterval`. `onIdle` calls `performLogout`. `performLogout` does: POST `/api/auth/logout` → `queryClient.clear()` → `window.location.href = "/"` — complete wipe, no data leakage between users.

### KioskWarningOverlay (`packages/web/src/components/layout/KioskWarningOverlay.tsx`)

Full-screen fixed overlay (z-50, bg-black/70). Displays 8xl countdown number. Two touch-friendly buttons (min-h-[3.5rem], text-lg): "Continue Session" → `onContinue`, "End Session Now" → `onEndNow`. ARIA: `role="alertdialog"`, `aria-modal="true"`, `aria-live="polite"` on countdown.

### Navbar changes

`useKiosk()` + `useKioskTimer(isKiosk)` called at top of `Navbar`. When `isKiosk`:
- Nav link classes switch from `text-sm` to `text-base`
- "Enable Notifications" and "Install App" buttons hidden
- "End Session" Button rendered (ghost variant, red text, min-h-[3rem])
- "Logout" Button hidden (End Session replaces it)
- `KioskWarningOverlay` rendered when `showWarning === true`

### AppShell changes

`useKiosk()` called. When `isKiosk`: footer hidden entirely, `ConsentBanner` hidden, `DevRoleSwitcher` hidden.

### App.tsx wiring

`KioskProvider` wraps `<Routes>` subtree inside `<BrowserRouter><AuthProvider><KioskProvider>`.

## Verification Results

- `npx tsc --noEmit`: zero type errors
- `pnpm build`: TypeScript compilation passes; Vite PWA build fails on pre-existing `navigateFallback` config error (unrelated to this plan — verified by stash test)
- All grep checks pass: `KioskProvider` in App.tsx, `useKiosk` in Navbar.tsx and AppShell.tsx, `useKioskTimer` in Navbar.tsx, `queryClient.clear()` in useKioskTimer.ts, `window.location.href` in useKioskTimer.ts
- No `queryClient.invalidateQueries` in useKioskTimer.ts

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 224d3e5 | feat(11-01): install react-idle-timer, add KioskContext and useKioskTimer |
| 465e004 | feat(11-01): kiosk UI — warning overlay, Navbar/AppShell modifications, App wiring |

## Self-Check: PASSED

- FOUND: packages/web/src/contexts/KioskContext.tsx
- FOUND: packages/web/src/hooks/useKioskTimer.ts
- FOUND: packages/web/src/components/layout/KioskWarningOverlay.tsx
- FOUND: commit 224d3e5
- FOUND: commit 465e004
