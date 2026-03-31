# Phase 23: Audit, Verification & CI Gate - Research

**Researched:** 2026-03-30
**Domain:** WCAG 2.2 AA automated testing, Playwright + axe-core, GitHub Actions CI, heading hierarchy audit, manual keyboard/screen reader testing
**Confidence:** HIGH

---

## Summary

Phase 23 is the final accessibility gate for the application. It has two distinct workstreams: (1) an audit-and-fix of heading hierarchy across all pages, and (2) setting up `@axe-core/playwright` in a CI pipeline that fails PRs on any new WCAG violation.

The heading hierarchy audit is largely codebase investigation work. A scan of the current codebase reveals that most pages have a single `<h1>` that is reached first, but `PortalDashboard.tsx` has a structural problem: an `<h2>` ("Attention Flags") appears in the DOM before the page's `<h1>` (the institution name), because the AttentionFlagsCard is rendered before the header section in the component tree. This is the primary heading bug to fix. No other pages show multiple `<h1>` elements or outright skipped levels, though the audit should verify this systematically.

The CI gate uses `@axe-core/playwright` (latest 4.11.1) on top of `@playwright/test` (latest 1.58). Since there is no existing Playwright or GitHub Actions configuration in this repo, both must be built from scratch. The recommended monorepo placement is a dedicated `packages/e2e` workspace package, with `playwright.config.ts` pointing `webServer` at `vite preview` in CI and `vite dev` locally. For pnpm, `pnpm/action-setup` is required in the GitHub Actions workflow before `actions/setup-node` to enable pnpm caching.

**Primary recommendation:** Install Playwright in a new `packages/e2e` workspace. Use `AxeBuilder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])` so that `heading-order` and `page-has-heading-one` (both tagged `best-practice`) are included in the automated gate. Fix the `PortalDashboard.tsx` heading order bug first, then establish the baseline, then gate.

---

## Codebase State Audit (CRITICAL — read before planning)

### Heading Hierarchy Findings

| Page | h1 present? | h1 comes first? | Issue |
|------|-------------|-----------------|-------|
| `Landing.tsx` | Yes | Yes | None |
| `Login.tsx` | Yes | Yes | None |
| `Dashboard.tsx` | Yes | Yes | None |
| `ChallengeFeed.tsx` | Yes | Yes | None |
| `MyCircles.tsx` | Yes | Yes | None |
| `WellbeingCheckin.tsx` | Yes | Yes | None |
| `ChallengerDashboard.tsx` | Yes | Yes (h3 in card before h1 in main — card is reused component, structural) | Check in context |
| `ChallengeDetail.tsx` | Yes | Yes | None |
| `ImpactDashboard.tsx` | Yes | Yes | None |
| `AttentionDashboard.tsx` | Yes | Yes | None |
| `InstitutionManagement.tsx` | Yes | Yes | None |
| `PortalDashboard.tsx` | Yes | **NO — h2 at line 48 before h1 at line 130** | **BUG: fix required** |
| `PortalLogin.tsx` | Yes | Yes | None |
| `InstitutionLanding.tsx` | Multiple conditional h1s | Yes (conditional branches) | Verify only one renders |

**Key concern on `PortalDashboard.tsx`:** The `AttentionFlagsCard` component renders an `<h2>` at line 48 before the institution header section renders the `<h1>` at line 130. This violates the heading-order axe rule (`best-practice` tag) and WCAG 1.3.1 implied structure. The fix is to restructure the component so the `<h1>` renders before any `<h2>` children, which likely means reordering JSX or extracting the page header higher in the tree.

**axe rule `heading-order`:** Tagged `cat.semantics, best-practice`. Will NOT be caught by `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` alone — must add `'best-practice'` to the tag list.

**axe rule `page-has-heading-one`:** Tagged `cat.semantics, best-practice`. Same — must include `'best-practice'` tag.

### Existing Infrastructure

| What exists | Where | Notes |
|-------------|-------|-------|
| `RouteChangeSync` | `src/components/a11y/` | Syncs focus to `main h1` on route change — depends on h1 existing in `<main>` |
| `useFocusTrap` | `src/components/a11y/` | Used by Modal wrapper |
| `AnnounceProvider` + `useAnnounce` | `src/components/a11y/` | Live region announcer |
| `Modal` wrapper | Phase 20/21 | All dialogs migrated to it |
| ESLint flat config | `packages/web/eslint.config.js` | `jsxA11y.flatConfigs.strict` already active |
| GitHub Actions | Not present | `.github/` directory does not exist |
| Playwright | Not present | No `@playwright/test` anywhere in repo |
| `packages/e2e` | Does not exist | Must be created |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@playwright/test` | `^1.58.0` (latest stable) | Browser automation + test runner | Official Microsoft browser testing tool; integrates directly with axe |
| `@axe-core/playwright` | `^4.11.1` (latest) | WCAG accessibility engine for Playwright | Official Deque wrapper; peer requires `@playwright/test` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `axe-core` | (transitive via `@axe-core/playwright`) | Core rule engine | Do not install directly; pulled by the playwright package |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@axe-core/playwright` | `axe-playwright` (community) | `axe-playwright` is a third-party wrapper; official Deque package is more reliable and tracked |
| Playwright + axe | Lighthouse CI | Lighthouse CI requires more infrastructure; axe integrates directly into test files |
| GitHub Actions from scratch | Using `playwright/github-action` | The dedicated action is deprecated; using standard workflow steps is current practice |

**Installation (in `packages/e2e`):**
```bash
pnpm --filter @indomitable-unity/e2e add -D @playwright/test @axe-core/playwright
npx playwright install --with-deps chromium
```

**Add `packages/e2e` to workspace** — `pnpm-workspace.yaml` already includes `packages/*` so a new package at `packages/e2e/package.json` is automatically picked up.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/e2e/
├── package.json              # name: @indomitable-unity/e2e
├── playwright.config.ts      # webServer + baseURL config
├── fixtures/
│   └── axe.ts                # Shared makeAxeBuilder fixture
└── tests/
    ├── a11y-public.spec.ts   # Unauthenticated pages (/, /login, /i/:slug etc.)
    └── a11y-headings.spec.ts # Heading hierarchy assertions per page
```

### Pattern 1: Shared AxeBuilder Fixture

**What:** A Playwright test extension that pre-configures `AxeBuilder` with the project's WCAG tags and any global exclusions.
**When to use:** Always — prevents per-file configuration drift and ensures consistent tag set across all tests.

```typescript
// Source: https://playwright.dev/docs/accessibility-testing
// packages/e2e/fixtures/axe.ts
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type AxeFixture = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<AxeFixture>({
  makeAxeBuilder: async ({ page }, use) => {
    const makeAxeBuilder = () =>
      new AxeBuilder({ page }).withTags([
        'wcag2a',
        'wcag2aa',
        'wcag21a',
        'wcag21aa',
        'best-practice', // Required: includes heading-order and page-has-heading-one rules
      ]);
    await use(makeAxeBuilder);
  },
});

export { expect } from '@playwright/test';
```

### Pattern 2: Per-Page axe Scan

**What:** Navigate to a page, wait for content, run axe, assert zero violations.
**When to use:** For every publicly accessible page that does not require authentication.

```typescript
// Source: https://playwright.dev/docs/accessibility-testing
// packages/e2e/tests/a11y-public.spec.ts
import { test, expect } from '../fixtures/axe';

const publicPages = ['/', '/login', '/register', '/forgot-password', '/privacy', '/cookies'];

for (const url of publicPages) {
  test(`${url} has no axe violations`, async ({ page, makeAxeBuilder }) => {
    await page.goto(url);
    const results = await makeAxeBuilder().analyze();
    expect(results.violations).toEqual([]);
  });
}
```

### Pattern 3: Heading Hierarchy Assertion

**What:** Playwright page evaluation to check that exactly one h1 exists per page and no heading level is skipped.
**When to use:** As a supplement to axe (axe's `heading-order` checks sequential order, but custom logic can verify exact count and level sequence).

```typescript
// packages/e2e/tests/a11y-headings.spec.ts
test('/ has exactly one h1', async ({ page }) => {
  await page.goto('/');
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBe(1);
});
```

### Pattern 4: playwright.config.ts with Vite webServer

**What:** Configure Playwright to start the Vite dev or preview server before tests run.
**When to use:** Always — CI uses `vite preview` (production-like), local dev uses `vite dev`.

```typescript
// Source: https://playwright.dev/docs/test-webserver
// packages/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: process.env.CI
      ? 'pnpm --filter @indomitable-unity/web preview -- --port 5173'
      : 'pnpm --filter @indomitable-unity/web dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stderr: 'pipe',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

**Note:** In CI mode, the web package must be built before `vite preview` can serve it. The GitHub Actions workflow must run `pnpm --filter @indomitable-unity/web build` before `playwright test`.

### Pattern 5: GitHub Actions Workflow

**What:** CI workflow that runs axe Playwright tests on every PR.
**When to use:** The canonical integration point for TOOL-02.

```yaml
# Source: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs
#         https://playwright.dev/docs/ci-intro
# .github/workflows/a11y.yml
name: Accessibility CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  a11y:
    timeout-minutes: 30
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v5
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm --filter @indomitable-unity/e2e exec playwright install --with-deps chromium

      - name: Build web package
        run: pnpm --filter @indomitable-unity/web build

      - name: Run accessibility tests
        run: pnpm --filter @indomitable-unity/e2e exec playwright test

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: packages/e2e/playwright-report/
          retention-days: 30
```

### Anti-Patterns to Avoid

- **Using `withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])` only:** The `heading-order` and `page-has-heading-one` rules are tagged `best-practice`, not wcag. Omitting `'best-practice'` means heading structure is not gated.
- **Scanning authenticated pages without auth setup:** Pages behind `ProtectedRoute` will redirect to `/login` during the axe scan, passing trivially. Either mock auth or restrict automated scans to public pages + manually verify protected pages.
- **Using `vite dev` in CI:** The dev server hot-reloads but is non-deterministic under CI load. Use `vite build && vite preview` for CI runs.
- **Adding `packages/e2e` to `packages/*` manually:** The workspace already matches `packages/*` — just create the directory and `package.json`.
- **Excluding entire pages to silence violations:** Use `disableRules(['rule-id'])` for specific known false positives with a comment explaining why, never `exclude()` whole page sections.
- **Running axe on pages mid-loading:** Always `await page.waitForLoadState('networkidle')` or wait for a known element before calling `.analyze()` — premature scans produce false positives from missing content.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WCAG rule execution | Custom DOM walker checking ARIA attributes | `@axe-core/playwright` | axe covers 57%+ of WCAG violations with 400+ rules; hand-rolled checks miss shadow DOM, ARIA propagation, contrast ratios |
| Heading order validation | Custom `querySelectorAll('h1,h2,h3')` depth checker | `axe` `heading-order` rule + custom count assertion | axe handles nested documents, iframes, shadow DOM; custom code misses edge cases |
| CI failure gating | Shell script parsing axe JSON output | `expect(results.violations).toEqual([])` in Playwright test | Test runner handles exit codes, reports, artifacts natively |
| Browser launch + teardown | Managing chromium processes | `@playwright/test` | Handles parallel workers, browser contexts, teardown reliably |

**Key insight:** The 57% axe coverage ceiling is a known limitation — it does not mean hand-rolling fills the gap. The remaining 43% of WCAG violations require human judgment (e.g. "does this alt text convey the image meaning?"). Automated gates cover what can be automated; the manual sign-off in plan 23-02 covers the rest.

---

## Common Pitfalls

### Pitfall 1: best-practice tag omitted — heading rules not gated

**What goes wrong:** CI passes on every PR but the heading hierarchy violations `heading-order` and `page-has-heading-one` are never caught because they are tagged `best-practice`, not `wcag2aa`.
**Why it happens:** Documentation examples show only `['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']` — this is correct for pure WCAG conformance but misses Deque best-practice rules that address VIS-02.
**How to avoid:** Always include `'best-practice'` in the `withTags()` array for this project.
**Warning signs:** Axe passes but manually running `axe` in browser console reports `heading-order` violations.

### Pitfall 2: PortalDashboard h2-before-h1 structure

**What goes wrong:** `PortalDashboard.tsx` renders `AttentionFlagsCard` (which contains `<h2>`) before the institution name `<h1>` in the JSX tree. The axe `heading-order` rule fires on this page.
**Why it happens:** The component was built with visual layout as priority — card appears at top of screen visually — without considering DOM order.
**How to avoid:** Reorder the JSX so `<h1>` is the first heading element in the DOM. The visual layout can be preserved with CSS if needed.
**Warning signs:** `heading-order` violation in the axe report for `/portal/dashboard`.

### Pitfall 3: Authenticated pages not reachable by Playwright

**What goes wrong:** Pages under `ProtectedRoute` (e.g. `/dashboard`, `/challenges`) redirect to `/login` when Playwright navigates to them without a valid session, so axe scans an empty/redirect state rather than the actual page.
**Why it happens:** The app uses server-side session auth; Playwright has no credentials.
**How to avoid:** For Phase 23, limit CI axe scans to public pages (no auth required). Authenticated pages are covered by manual keyboard testing sign-off. Document this limitation explicitly.
**Warning signs:** Scan of `/dashboard` returns the login page DOM with no violations — looks like a pass but is not testing the real content.

### Pitfall 4: CI build-before-preview not configured

**What goes wrong:** `vite preview` requires a built `dist/` directory. If the workflow runs `playwright test` without first building the web package, the preview server fails to start, all tests error, and the pipeline is misconfigured.
**Why it happens:** The `webServer.command` in `playwright.config.ts` runs `vite preview` but the build step is separate.
**How to avoid:** Add an explicit `pnpm --filter @indomitable-unity/web build` step before running Playwright tests in CI.
**Warning signs:** `ENOENT` or "No such file" errors in the Playwright output pointing to `dist/`.

### Pitfall 5: pnpm not set up before actions/setup-node in GitHub Actions

**What goes wrong:** `actions/setup-node` with `cache: 'pnpm'` requires pnpm to already be on the PATH. If `pnpm/action-setup` comes after `setup-node`, the cache step fails.
**Why it happens:** The ordering matters: pnpm setup must precede Node setup when using pnpm cache.
**How to avoid:** Always order: `pnpm/action-setup` → `setup-node` → `pnpm install`.
**Warning signs:** `Error: pnpm package manager is not found` in the GitHub Actions run.

### Pitfall 6: `RouteChangeSync` depends on `main h1` existing

**What goes wrong:** `RouteChangeSync` calls `document.querySelector('main h1')` on every route change. If a page has no `<h1>` inside `<main>`, focus is not managed and screen reader users get no page title announcement.
**Why it happens:** This is by design — it's the intended behavior of RouteChangeSync.
**How to avoid:** Every page must have an `<h1>` rendered inside the `<main>` landmark. The heading audit (plan 23-01) must verify this, not just that an `<h1>` exists somewhere in the DOM.
**Warning signs:** After navigating to a page, focus does not move — visible via `:focus` devtools outline not appearing on any heading.

---

## Code Examples

Verified patterns from official sources:

### Full-page axe scan with WCAG + best-practice tags
```typescript
// Source: https://playwright.dev/docs/accessibility-testing
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('/ has no accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

### Disabling a specific rule with justification
```typescript
// Source: https://playwright.dev/docs/accessibility-testing
const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
  .disableRules(['color-contrast']) // contrast verified manually against Tailwind v4 OKLCH palette
  .analyze();
```

### Custom h1 count assertion (supplements axe)
```typescript
// Playwright page evaluation — no external source, standard Playwright locator API
test('every public page has exactly one h1', async ({ page }) => {
  for (const url of ['/', '/login', '/register']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const count = await page.locator('h1').count();
    expect(count, `${url} should have exactly 1 h1`).toBe(1);
  }
});
```

### Fixture-based shared configuration
```typescript
// Source: https://playwright.dev/docs/accessibility-testing
import { test as base } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const test = base.extend<{ makeAxeBuilder: () => AxeBuilder }>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() =>
      new AxeBuilder({ page }).withTags([
        'wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice',
      ])
    );
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `axe-playwright` (community package) | `@axe-core/playwright` (official Deque) | ~2021 | Use official package; community package still works but lower trust |
| `microsoft/playwright-github-action` | Standard `actions/checkout` + `pnpm/action-setup` steps | Action deprecated | Don't use the dedicated action; use inline steps |
| Playwright 1.x (no `webServer`) | `webServer` config in `playwright.config.ts` | Playwright 1.20+ | Built-in server management; no need for separate `start-server-and-test` package |
| `npm ci` in GitHub Actions | `pnpm install` with `pnpm/action-setup@v4` | pnpm support added to GitHub Actions | Use pnpm-native caching via `cache: 'pnpm'` in `setup-node` |
| WCAG 2.1 only tags | `wcag21aa` + `wcag22aa` tags in axe 4.5+ | axe-core 4.5 (2022) | `wcag22aa` currently only covers `target-size` rule; include it anyway for future-proofing |

**Deprecated/outdated:**
- `axe-html-reporter`: Optional HTML report package — not required; Playwright's built-in HTML reporter covers this
- `start-server-and-test`: Package for starting servers before tests — replaced by `playwright.config.ts` `webServer` option

---

## Manual Testing Scope (Plan 23-02)

axe-core covers ~57% of WCAG violations. The following must be covered by manual sign-off:

### Five Primary Keyboard Flows
Per the phase success criteria, a keyboard-only walkthrough must complete without getting stuck or losing focus context:

1. **Auth flow:** `/` → `/register` or `/login` → `/dashboard` (Tab, Enter, form submission, redirect)
2. **Challenge board:** `/challenges` → open a challenge detail → return (Tab, Enter, focus returns to trigger)
3. **Circle workspace:** `/circles` → open workspace → open modal → close modal (Tab, Enter, Escape, focus returns)
4. **Wellbeing check-in:** `/wellbeing` → complete the form → submit (Tab, form navigation, submit)
5. **Notification centre:** Open NotificationBell dropdown → navigate items → close (Tab, Enter, Escape, aria-expanded)

### NVDA + Chrome Manual Checklist (Windows)
- Heading navigation (H key): all page headings announced in logical order
- Landmark navigation (D key for main, B for banner, N for navigation): all present
- Modal announced as dialog with title on open
- aria-expanded toggles announced correctly
- Live region announcements fire when notification count changes
- Skeleton loaders announced as "Loading" (role=status)
- Chart has accessible keyboard navigation AND companion table is reachable

### NVDA Commands Reference
| Key | Action |
|-----|--------|
| H | Next heading |
| 1–6 | Heading by level |
| D | Next landmark |
| F | Next form field |
| K | Next link |
| Insert+F7 | Elements list (headings, landmarks, links) |

---

## Open Questions

1. **`ChallengerDashboard.tsx` card h3 ordering**
   - What we know: Each `SkeletonCard`/challenge card renders an `<h3>` for the challenge title, placed before the page `<h1>` in the component tree.
   - What's unclear: Whether these cards are inside `<main>` and whether their position in the DOM (before h1) actually triggers axe `heading-order` — depends on where they render relative to the `<h1>`.
   - Recommendation: Run the axe scan against the actual page in development and check the violation report before assuming a fix is needed.

2. **Authenticated page axe coverage**
   - What we know: Protected pages require a valid session and redirect without one.
   - What's unclear: Whether Phase 23 should invest in Playwright auth setup (page fixture with stored auth state) or defer authenticated axe coverage to a future phase.
   - Recommendation: For Phase 23, document the limitation. Unauthenticated pages + manual walkthrough satisfies TOOL-02 and the spirit of the phase goal. Playwright auth fixtures can be a Phase 24 item.

3. **`vite preview` port binding in CI**
   - What we know: `vite preview` defaults to port 4173, not 5173.
   - What's unclear: Whether `vite preview -- --port 5173` works correctly with the current Vite 6 config, or if `baseURL` in playwright config needs to be 4173.
   - Recommendation: Either pass `--port 5173` explicitly to `vite preview` in CI, or set `baseURL` to `http://localhost:4173` for CI and `http://localhost:5173` for dev. Keep both consistent in `playwright.config.ts` using `process.env.CI`.

---

## Sources

### Primary (HIGH confidence)
- `https://playwright.dev/docs/accessibility-testing` — AxeBuilder API, withTags, disableRules, fixture pattern, full code examples
- `https://playwright.dev/docs/test-webserver` — webServer config options, Vite integration pattern
- `https://playwright.dev/docs/ci-intro` — GitHub Actions workflow YAML structure
- `https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs` — pnpm caching with pnpm/action-setup
- `https://dequeuniversity.com/rules/axe/4.11` — heading-order and page-has-heading-one rule tags confirmed as `best-practice`
- Direct codebase inspection — PortalDashboard.tsx heading order bug, RouteChangeSync implementation, existing a11y components

### Secondary (MEDIUM confidence)
- `https://www.npmjs.com/package/@axe-core/playwright` — version 4.11.1 confirmed as latest (from search result metadata)
- `https://playwright.dev/docs/release-notes` — Playwright 1.58 confirmed as latest stable
- `https://github.com/dequelabs/axe-core-npm/blob/develop/packages/playwright/README.md` — official package README confirming API
- `https://www.kyrre.dev/blog/end-to-end-testing-setup` — pnpm monorepo Playwright structure (packages/e2e pattern)

### Tertiary (LOW confidence)
- `@axe-core/playwright` peer dependency for `@playwright/test >= 1.51` — from GitHub issue #1162 on dequelabs/axe-core-npm; not confirmed in official README. Recommendation: install latest of both and verify.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — version numbers confirmed from npm/official release notes, API confirmed from official Playwright docs
- Architecture: HIGH — webServer config and fixture patterns from official Playwright docs
- Pitfalls: HIGH — PortalDashboard bug confirmed by direct codebase inspection; CI ordering from GitHub official docs
- Manual testing scope: MEDIUM — NVDA commands from WebAIM/BBC (authoritative sources but not double-checked against NVDA release notes)

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable libraries — Playwright and axe-core release frequently but APIs are stable)
