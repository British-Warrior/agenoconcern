---
phase: 20-focus-infrastructure
plan: 01
subsystem: web-a11y
tags: [accessibility, wcag, focus-trap, aria-live, modal, react]
dependency_graph:
  requires: []
  provides:
    - useFocusTrap hook (Tab/Shift-Tab containment + trigger focus restore)
    - Modal shared wrapper (role=dialog, aria-modal, Escape, backdrop, focus trap)
    - AnnounceProvider + useAnnounce hook (global aria-live=polite region)
  affects:
    - packages/web/src/main.tsx
tech_stack:
  added: []
  patterns:
    - useFocusTrap: custom hook capturing trigger, cycling Tab focus within container, restoring on deactivate
    - AnnounceProvider: clear-then-set (50ms) pattern for reliable screen reader re-announcement
    - Modal: createPortal to document.body, useFocusTrap wired to dialog ref
key_files:
  created:
    - packages/web/src/components/a11y/useFocusTrap.ts
    - packages/web/src/components/ui/Modal.tsx
    - packages/web/src/components/a11y/AnnounceProvider.tsx
  modified:
    - packages/web/src/main.tsx
decisions: []
metrics:
  duration: 104s
  completed: 2026-03-30
---

# Phase 20 Plan 01: Focus Infrastructure — Accessibility Primitives Summary

**One-liner:** Three WCAG accessibility primitives — useFocusTrap (Tab containment), Modal (full accessible dialog wrapper), and AnnounceProvider (global aria-live region) — wired into app root.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useFocusTrap hook and Modal wrapper | 3431db3 | useFocusTrap.ts, Modal.tsx |
| 2 | AnnounceProvider, useAnnounce hook, and main.tsx wiring | c3f1417 | AnnounceProvider.tsx, main.tsx |

## What Was Built

### useFocusTrap (`packages/web/src/components/a11y/useFocusTrap.ts`)

Accepts `active: boolean`, returns a `containerRef`. When active:
- Captures `document.activeElement` as trigger before moving focus
- Moves focus to the first focusable child on activation
- Intercepts `keydown` on document: Tab from last element wraps to first; Shift-Tab from first wraps to last
- On cleanup (active becomes false or unmount): restores focus to captured trigger

Focusable selectors: `a[href]`, `button:not([disabled])`, `input:not([disabled])`, `select:not([disabled])`, `textarea:not([disabled])`, `[tabindex]:not([tabindex="-1"])`.

### Modal (`packages/web/src/components/ui/Modal.tsx`)

Named export. Props: `isOpen`, `onClose`, `titleId`, `children`, `className?`. Provides:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}` on outer div
- `useFocusTrap(isOpen)` ref attached to dialog container
- Escape key listener via `useEffect` when `isOpen`
- Backdrop div with `onClick={onClose}` and `aria-hidden="true"`
- `createPortal` rendering to `document.body`
- Returns `null` when `!isOpen`

### AnnounceProvider + useAnnounce (`packages/web/src/components/a11y/AnnounceProvider.tsx`)

Named exports: `AnnounceProvider`, `useAnnounce`. Provides:
- `AnnounceContext` typed as `(msg: string) => void`
- `announce` callback: `setMessage("")` then `setTimeout(() => setMessage(msg), 50)` — forces re-read on duplicates
- `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">` rendered after children
- `useAnnounce` returns `useContext(AnnounceContext)`

### main.tsx wiring

`App` wrapped in `<AnnounceProvider>` inside `<QueryClientProvider>`:
```
<QueryClientProvider>
  <AnnounceProvider>
    <App />
  </AnnounceProvider>
</QueryClientProvider>
```

## Verification

1. `npx tsc --noEmit` — PASSED (zero errors)
2. All three files exist and export named symbols
3. main.tsx has `<AnnounceProvider>` wrapping `<App>`
4. Modal.tsx uses `useFocusTrap`, has `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape handler, `createPortal`
5. useFocusTrap.ts has Tab/Shift-Tab interception and focus restore on cleanup
6. AnnounceProvider.tsx has clear-then-set pattern with 50ms timeout

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: packages/web/src/components/a11y/useFocusTrap.ts
- FOUND: packages/web/src/components/ui/Modal.tsx
- FOUND: packages/web/src/components/a11y/AnnounceProvider.tsx
- FOUND commit 3431db3 (Task 1)
- FOUND commit c3f1417 (Task 2)
