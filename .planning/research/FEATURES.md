# Feature Landscape: WCAG 2.2 AA Compliance

**Domain:** Accessibility audit and remediation for React/Vite/Tailwind SPA
**Researched:** 2026-03-30
**Confidence:** HIGH (codebase-verified findings from parallel researchers)

---

## Existing Baseline (Already Passing)

| Feature | Evidence | WCAG SC |
|---------|----------|---------|
| Skip link | Present in AppShell layout | 2.4.1 |
| Landmark roles | `<main>`, `<nav>`, `<header>` in layouts | 1.3.1 |
| Page titles on 25+ routes | react-router document.title | 2.4.2 |
| Input component | `aria-describedby`, `aria-invalid`, `useId()` | 1.3.1, 3.3.1 |
| Radix Accordion/Collapsible | ARIA managed by library | 4.1.2 |
| Button focus rings | `focus-visible:ring-2` + global `*:focus-visible` | 2.4.7 |
| Touch targets | `min-h-[3rem]` (48px) on interactive elements | 2.5.8 |
| WellbeingChart | `sr-only` companion data table | 1.1.1 |
| KioskWarningOverlay | `alertdialog` + `aria-live` correct | 4.1.3 |
| Colour contrast | Tailwind v4 OKLCH, WCAG AAA 7:1+ ratios | 1.4.3 |

## Table Stakes (Must Fix for AA)

### Critical — Keyboard & Focus

| # | Feature | Current State | WCAG SC | Complexity |
|---|---------|--------------|---------|------------|
| 1 | Focus trap in modals | `CircleFormationModal`, `AddMemberModal` — no Tab cycle confinement | 2.4.3, 2.1.2 | Medium |
| 2 | Focus return on modal close | Focus lost to document body on close | 2.4.3 | Low |
| 3 | Escape closes modals | Not implemented | 2.1.1 | Low |
| 4 | Route-change focus management | No focus movement on SPA navigation — screen reader users unaware of page change | 2.4.3 | Medium |
| 5 | NotificationBell keyboard access | Click-only dropdown, no `aria-expanded`, no Escape to close | 2.1.1, 4.1.2 | Medium |
| 6 | Notification item keyboard operability | Bare `<li onClick>` — not reachable by Tab | 2.1.1 | Low |

### Important — ARIA & Screen Reader

| # | Feature | Current State | WCAG SC | Complexity |
|---|---------|--------------|---------|------------|
| 7 | `aria-expanded` on disclosure widgets | Zero instances in codebase (grep-confirmed) | 4.1.2 | Low |
| 8 | Error `aria-describedby` on ad-hoc forms | `AddMemberModal` error not linked to input | 3.3.1 | Low |
| 9 | Dropzone accessible label | `NoteComposer` file drop zone has no label | 1.1.1, 4.1.2 | Low |
| 10 | Unread count badge announcement | Badge change not announced to screen readers | 4.1.3 | Low |
| 11 | Skeleton loading cards | No `role="status"` or `aria-busy` | 4.1.3 | Low |
| 12 | AttentionTrendChart text alternative | No companion table (WellbeingChart pattern exists but not followed) | 1.1.1 | Medium |

### Form & Auth

| # | Feature | Current State | WCAG SC | Complexity |
|---|---------|--------------|---------|------------|
| 13 | `autocomplete` on auth forms | Missing on login/signup email and password fields | 1.3.5 | Low |
| 14 | Paste not blocked on auth inputs | Needs verification — SC 3.3.8 Accessible Authentication | 3.3.8 | Low |

### Visual & Layout

| # | Feature | Current State | WCAG SC | Complexity |
|---|---------|--------------|---------|------------|
| 15 | Focus indicator contrast | `ring-primary-500/30` semi-transparent — ~1.4:1 contrast (needs 3:1) | 2.4.11 | Medium |
| 16 | Heading hierarchy audit | Not verified across all pages | 1.3.1 | Low |
| 17 | `<html lang="en">` verification | Needs confirmation in index.html | 3.1.1 | Trivial |

## Differentiators (Recommended)

| # | Feature | Value | Complexity |
|---|---------|-------|------------|
| 18 | `prefers-reduced-motion` respect | 3-line CSS addition — respects user motion preferences | Trivial |
| 19 | axe-core CI integration | Automated regression prevention in GitHub Actions | Medium |
| 20 | `eslint-plugin-jsx-a11y` strict mode | Catches static violations at lint time | Low |
| 21 | Centralised `announce()` utility | Live region for async mutation feedback (toast-like) | Medium |
| 22 | `aria-current="page"` on nav links | Current page indicator for screen readers | Low |

## Anti-Features (Do NOT Build)

| Anti-Feature | Why Harmful |
|-------------|------------|
| Accessibility overlay widget | Doesn't fix underlying issues; creates false compliance impression |
| ARIA on everything | Redundant ARIA on semantic HTML causes screen reader confusion |
| Positive `tabindex` values | Breaks natural tab order; impossible to maintain |
| `outline: none` without replacement | Removes focus visibility for keyboard users |
| Auto-playing announcements | `aria-live` regions that fire on load create noise |
| Screen-reader-only duplicate navigation | Maintain one nav, make it accessible |
| Custom focus management library | `useFocusTrap` hook + `focus-trap-react` covers all cases |

## Feature Dependencies

```
Focus trap hook (useFocusTrap) ──→ Modal wrapper ──→ Modal migrations (3 dialogs)
                                                  └→ NotificationBell dropdown
Route announcer ──→ All pages benefit (no per-page work needed)
AnnounceProvider ──→ Mutation feedback across all pages
eslint-plugin-jsx-a11y ──→ Catches static issues before other work begins
```

## WCAG 2.2 AA vs AAA Boundary

| AA (This Milestone) | AAA (Not Required) |
|---------------------|-------------------|
| Focus Not Obscured (Minimum) 2.4.11 | Focus Not Obscured (Enhanced) 2.4.12 |
| Target Size (Minimum) 2.5.8 — 24px | Target Size (Enhanced) 2.5.5 — 44px |
| Contrast 4.5:1 text, 3:1 non-text | Contrast 7:1 text (already met via OKLCH) |
| Keyboard accessible | No keyboard trap exceptions |

## Prioritisation Matrix

| Priority | Items | Rationale |
|----------|-------|-----------|
| P0 — Foundation | 4, 15, 17, 18, 20 | Route announcer, focus contrast, lang, motion, lint — affects every page |
| P1 — Critical Interactive | 1, 2, 3, 5, 6, 7 | Modal focus traps, keyboard nav, aria-expanded — highest user impact |
| P2 — Screen Reader | 8, 9, 10, 11, 12, 13 | ARIA linking, labels, announcements, chart tables |
| P3 — Polish & CI | 14, 16, 19, 21, 22 | Auth verification, heading audit, CI gate, announce utility, nav current |

---
*Researched: 2026-03-30*
*Sources: Codebase inspection, W3C WCAG 2.2 spec, Deque axe-core docs*
