# Stack Research

**Domain:** WCAG 2.2 AA compliance audit and remediation — React/Vite/Tailwind SPA
**Researched:** 2026-03-30
**Confidence:** HIGH (core tools), MEDIUM (vitest-axe maintenance status)

---

## Recommended Stack

### Core Testing Tools

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `axe-core` | ^4.11.1 | Accessibility rules engine — WCAG 2.0/2.1/2.2 | Industry standard, maintained by Deque. Version 4.5+ has WCAG 2.2 rules. Version 4.11.1 is current as of Jan 2025. Catches ~57% of WCAG issues automatically. |
| `@axe-core/playwright` | ^4.11.1 | Full-page axe scans in CI against running app | Scans actual rendered DOM including dynamic content (modals, drawers, charts). Use this for page-level audits — catches issues component tests miss (focus order, landmark structure, skip links). |
| `vitest-axe` | ^0.1.0 | Per-component axe assertions in unit tests | Integrates axe into existing Vitest test suite. Use `jsdom` environment (NOT `happy-dom` — known bug with axe). Note: package has low release velocity; `@chialab/vitest-axe` ^0.19.0 is an actively maintained fork if 0.1.0 stalls. |

### Linting (Shift-Left)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `eslint-plugin-jsx-a11y` | ^6.10.2 | Static AST analysis — catches aria misuse, missing labels, bad semantics at write time | Catches issues before tests run. Integrates into existing ESLint setup. Adds ~30 rules covering alt text, label associations, role validity, keyboard event handlers. ESLint 10 support added in 2026. |

### Remediation Utilities

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `focus-trap-react` | ^12.0.0 | Focus trapping for modals, dialogs, drawers | WCAG 2.1.2 (No Keyboard Trap) requires modals to contain focus. The app has multiple modal/drawer patterns. This is the canonical React wrapper around the `focus-trap` library. React 19 compatible (propTypes dropped in v12). |

### Browser Dev Tooling (Non-installed)

| Tool | Purpose | Notes |
|------|---------|-------|
| axe DevTools browser extension (free) | Manual audit of rendered pages — finds what automation misses | Free tier covers WCAG 2.1/2.2 A and AA. Use for auditing kiosk mode, admin dashboards, and chart interactions that are hard to test programmatically. Available for Chrome, Edge, Firefox. |
| NVDA + Firefox or VoiceOver + Safari | Screen reader smoke testing | Automated tools cannot replicate actual screen reader UX. Required for verifying aria-live announcements, route change announcements, and recharts accessibility. |

---

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@testing-library/react` | ^16.x | Render components in jsdom for vitest-axe | Needed for component-level axe assertions. RTL's `getByRole` and `getByLabelText` queries enforce accessible naming patterns as a side effect. |
| `@testing-library/jest-dom` | ^6.x | DOM assertion matchers in Vitest | Import via `@testing-library/jest-dom/vitest` in setupFiles. Needed alongside vitest-axe for full assertion coverage. |

Note: Both `@testing-library/*` packages integrate with Vitest via `setupFiles: ['./vitest.setup.ts']` and `environment: 'jsdom'` in the test config block.

---

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Playwright | E2E test runner for `@axe-core/playwright` | Add as devDependency to run page-level axe scans in CI. Run against `vite preview` (production build), not `vite dev`. |
| GitHub Actions / CI | Fail builds on axe violations | Configure `@axe-core/playwright` tests to run on every PR. Set `runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] }` to scope to AA rules only and avoid false positives from best-practice rules. |

---

## Installation

```bash
# Audit engine
npm install -D axe-core

# Component-level a11y assertions in Vitest
npm install -D vitest-axe

# Page-level a11y CI scans
npm install -D @axe-core/playwright playwright

# ESLint linting (static analysis at write time)
npm install -D eslint-plugin-jsx-a11y

# Focus management for existing non-Radix modals/drawers
npm install focus-trap-react

# Testing Library (add if not already present)
npm install -D @testing-library/react @testing-library/jest-dom
```

All packages install into `packages/web/`. `focus-trap-react` is a runtime dependency (not devDependency) because it ships with the app bundle. All others are devDependencies.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@axe-core/playwright` | `pa11y` / `pa11y-ci` | Never for this project — pa11y only supports WCAG 2.1 (open GitHub issue for 2.2 with no timeline). |
| `@axe-core/playwright` | `@axe-core/react` (runtime overlay) | Never — `@axe-core/react` does NOT support React 17+. Deque officially deprecated it. Do not install. |
| `vitest-axe` | `jest-axe` | Only if migrating to Jest. Project uses Vitest; vitest-axe is the direct fork with identical API. |
| `focus-trap-react` for new components | `@radix-ui/react-dialog` | Prefer `@radix-ui/react-dialog` for any net-new modal/dialog work. App already uses Radix (accordion, collapsible). Radix Dialog includes focus trap, aria-modal, escape key, and scroll lock with zero extra config. Only add focus-trap-react for retrofitting existing non-Radix modals. |
| Hand-rolled `RouteAnnouncer` | `react-aria-live` | `react-aria-live` has been unmaintained since 2017. A `<RouteAnnouncer>` component using native `aria-live="polite"` is 15–20 lines of code and has no library dependency. Write it directly. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@axe-core/react` | Does not support React 17+. Deque officially deprecated it. Will conflict with React 19. | `@axe-core/playwright` for full-page scans; `vitest-axe` for component scans |
| `pa11y` / `pa11y-ci` | Only implements WCAG 2.1 rules. Open GitHub issue since 2023 with no timeline for 2.2 support. | `@axe-core/playwright` |
| `react-aria-live` | Unmaintained since 2017, no React 16+ updates. | Write a `RouteAnnouncer` component directly with `aria-live` |
| `happy-dom` as Vitest environment | Confirmed compatibility bug with axe-core (`Node.prototype.isConnected`). axe will silently fail to run. | Use `jsdom` as the Vitest environment for all accessibility tests |
| Accessibility overlay products (accessiBe, AudioEye widget, etc.) | Do not fix underlying code, create false compliance claims, and frequently worsen UX for actual screen reader users. EU EAA and WCAG-related litigation does not accept overlays as compliance evidence. | Audit and fix source code |

---

## Stack Patterns by Variant

**For existing custom (non-Radix) modals and drawers being retrofitted:**
- Wrap with `focus-trap-react`
- Because custom `div`-based overlays have no native focus containment; keyboard users can tab out of the overlay into obscured background content (WCAG 2.1.2 violation)

**For new modal/dialog components built during remediation:**
- Use `@radix-ui/react-dialog` (already in ecosystem via existing Radix deps)
- Because it ships focus trap, aria-modal, escape key, and scroll lock with no additional configuration
- No additional package needed

**For recharts accessibility (keyboard navigation and screen reader):**
- recharts 3.x has no built-in keyboard navigation for chart data points
- Supplement each chart with a visually-hidden `<table>` rendering the same data (WAI-ARIA table pattern)
- Use Tailwind's `sr-only` class for the table — no additional package needed
- This satisfies WCAG 1.1.1 (non-text content) and WCAG 1.3.1 (info and relationships)

**For SPA route change announcements:**
- Build a `<RouteAnnouncer>` component that reads `useLocation()` from react-router and announces the page title via `aria-live="polite"`
- Mount it once in the root layout
- No library — this is ~15 lines of TypeScript

**For CI axe scanning:**
- Run `@axe-core/playwright` tests against `vite preview` output, not `vite dev`
- Tag each test with the page it covers (login, admin dashboard, kiosk, institution portal, challenger portal)
- Use `runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa']` to pin to AA-level rules only

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `axe-core@4.11.1` | React 19, Vite 6, jsdom | Works in any DOM environment |
| `vitest-axe@0.1.0` | Vitest ≥1.0.0, jsdom only | Does NOT work with happy-dom (confirmed bug in happy-dom `isConnected`) |
| `@axe-core/playwright@4.11.1` | Playwright ≥1.x | Version tracks axe-core version |
| `eslint-plugin-jsx-a11y@6.10.2` | ESLint 8, 9, 10 | ESLint 10 flat config supported in 2026 releases |
| `focus-trap-react@12.0.0` | React 19 | propTypes removed in v12; React 19 compatible |
| `@testing-library/react@16.x` | React 19, Vitest | Use `@testing-library/jest-dom/vitest` import path, not the legacy Jest path |

---

## Sources

- [axe-core GitHub releases](https://github.com/dequelabs/axe-core/releases) — v4.11.1 confirmed, Jan 2025 — HIGH confidence
- [Deque axe-core 4.5 WCAG 2.2 announcement](https://www.deque.com/blog/axe-core-4-5-first-wcag-2-2-support-and-more/) — WCAG 2.2 rule coverage confirmed since 4.5 — HIGH confidence
- [Deque axe 4.10 rules list](https://dequeuniversity.com/rules/axe/4.10) — Rule catalog — HIGH confidence
- [@axe-core/playwright npm](https://www.npmjs.com/package/@axe-core/playwright) — v4.11.1, published 2 months ago — HIGH confidence
- [Playwright accessibility testing docs](https://playwright.dev/docs/accessibility-testing) — Official integration guide — HIGH confidence
- [eslint-plugin-jsx-a11y npm](https://www.npmjs.com/package/eslint-plugin-jsx-a11y) — v6.10.2 confirmed — HIGH confidence
- [vitest-axe GitHub](https://github.com/chaance/vitest-axe) — v0.1.0, happy-dom incompatibility confirmed — MEDIUM confidence (low release velocity; @chialab/vitest-axe 0.19.0 is active fork)
- [focus-trap-react npm](https://www.npmjs.com/package/focus-trap-react) — v12.0.0, React 19 compatible — HIGH confidence
- [pa11y WCAG 2.2 open issue](https://github.com/pa11y/pa11y-ci/issues/205) — Confirmed no WCAG 2.2 support — HIGH confidence
- [aria-live SPA patterns 2025](https://k9n.dev/blog/2025-11-aria-live/) — Route announcer implementation pattern — MEDIUM confidence

---

*Stack research for: WCAG 2.2 AA audit and remediation of React/Vite/Tailwind SPA*
*Researched: 2026-03-30*
