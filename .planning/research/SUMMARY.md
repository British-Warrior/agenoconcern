# Project Research Summary

**Project:** Indomitable Unity — WCAG 2.2 AA Compliance Audit and Remediation
**Domain:** Accessibility retrofit — React/Vite/Tailwind SPA
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

Indomitable Unity is a React 19 / Vite / Tailwind v4 SPA with a stronger accessibility baseline than most retrofits encounter. Colour contrast, landmark structure, skip links, page titles, touch targets, and several components (KioskWarningOverlay, WellbeingChart, WellbeingForm, shared Input/Button/Alert) are already implemented correctly. The remediation work is therefore targeted rather than wholesale: six keyboard/focus failures, six ARIA and screen-reader gaps, two form/auth omissions, and three visual/layout issues make up the complete gap list. The codebase-verified feature inventory eliminates guesswork and allows the roadmap to be scoped precisely.

The recommended approach is infrastructure-first. Three new components — `AnnounceProvider`, `RouteChangeSync`, and `useFocusTrap` — form a foundation that every subsequent fix depends on. Building these first means that modal migrations, notification bell corrections, and mutation announcements each become mechanical one-step changes rather than individual engineering problems. The `components/a11y/` folder keeps accessibility infrastructure separate from visual UI and scales cleanly as the app grows. A new `Modal` shared wrapper then centralises all dialog ARIA requirements, replacing three ad-hoc modal divs that currently lack focus containment.

The primary risk is mistaking automated tooling coverage for compliance. axe-core catches approximately 57% of WCAG violations. The remaining 43% — focus order, live region behaviour under real screen readers, contrast in dynamic states, and all WCAG 2.2-specific criteria — require manual testing with NVDA and keyboard-only navigation. A phase that gates CI on `@axe-core/playwright` results establishes a regression floor, but must be combined with a deliberate manual test plan to constitute a real compliance claim.

---

## Key Findings

### Recommended Stack

The tooling picture is clear and low-risk. `axe-core@4.11.1` (via `@axe-core/playwright`) is the industry standard for automated scanning and has full WCAG 2.2 AA rule support since version 4.5. `eslint-plugin-jsx-a11y@6.10.2` shifts violation detection to write time. `vitest-axe@0.1.0` integrates axe into the existing Vitest suite for component-level assertions — it must use the `jsdom` environment; `happy-dom` has a confirmed incompatibility with axe-core. The one medium-confidence item is `vitest-axe` itself: low release velocity means `@chialab/vitest-axe@0.19.0` is the documented drop-in fallback if it stalls.

No accessibility overlay products, no `@axe-core/react` (deprecated and React 17+ incompatible), and no `pa11y` (stuck at WCAG 2.1 with no 2.2 timeline). For new modal components, prefer `@radix-ui/react-dialog` (already in the Radix ecosystem) over `focus-trap-react`. For retrofitting existing non-Radix modals, `focus-trap-react@12.0.0` is React 19 compatible. For route-change announcements, write a `RouteAnnouncer` component directly — `react-aria-live` has been unmaintained since 2017.

**Core technologies:**
- `@axe-core/playwright@4.11.1`: Full-page WCAG 2.2 AA CI scans — only tool with confirmed 2.2 rule coverage
- `eslint-plugin-jsx-a11y@6.10.2`: Static ARIA and semantic analysis at lint time — catches violations before tests run
- `vitest-axe@0.1.0`: Per-component axe assertions in Vitest — integrates with existing test suite (jsdom only)
- `focus-trap-react@12.0.0`: Focus containment for retrofitting existing non-Radix modals — React 19 compatible
- Custom `RouteChangeSync` (~15 lines): SPA route-change focus sync — no library dependency needed

### Expected Features

The 17 table-stakes items were confirmed by direct codebase inspection. The 10-item baseline already passing requires no work. The gap is 17 specific named failures across four categories.

**Must fix (table stakes — AA failures):**
- Focus trap in `CircleFormationModal`, `AddMemberModal`, `ConfirmDialog` (WCAG 2.1.2, 2.4.3)
- Focus return on modal close and Escape-to-close across all modals (WCAG 2.4.3, 2.1.1)
- Route-change focus management — screen readers unaware of SPA navigation (WCAG 2.4.3)
- `NotificationBell` keyboard access and `aria-expanded` state (WCAG 2.1.1, 4.1.2)
- `aria-expanded` missing on all disclosure widgets — grep-confirmed zero instances in codebase (WCAG 4.1.2)
- Focus indicator contrast: `ring-primary-500/30` (~1.4:1) fails the 3:1 requirement (WCAG 2.4.11)
- `AttentionTrendChart` has no accessible alternative — `WellbeingChart` pattern not followed (WCAG 1.1.1)

**Should have (differentiators and regression prevention):**
- `@axe-core/playwright` CI gate — automated regression floor on every PR
- `eslint-plugin-jsx-a11y` strict mode — prevents new violations at write time
- Centralised `AnnounceProvider` — single live region for async mutation feedback
- `aria-current="page"` on Navbar links — active page indicator for screen readers
- `prefers-reduced-motion` CSS (3 lines) — respects user motion preferences

**Defer (out of scope for this milestone):**
- WCAG AAA criteria (7:1 contrast already met; enhanced focus appearance; enhanced target size)
- Full extraction of `components/a11y/` to a shared design system package

### Architecture Approach

The recommended architecture adds a `components/a11y/` folder containing three zero-dependency infrastructure components (`AnnounceProvider`, `RouteChangeSync`, `useFocusTrap`) and a new shared `Modal` wrapper in `components/ui/`. No existing directory structure changes are required. Existing components are modified in place; modals are migrated to the new `Modal` wrapper. The approach is layered: infrastructure first with no consumer changes, then shared UI, then layout and nav corrections, then modal consumers migrate mechanically, then chart and ARIA completeness, then full audit.

**Major components:**
1. `AnnounceProvider` — owns the single global `aria-live="polite"` region; exposes `useAnnounce()` hook — mounted in `main.tsx`
2. `RouteChangeSync` — moves focus to `main h1` on pathname change; renders `null`; mounted in each layout shell as sibling to `<Outlet>`
3. `useFocusTrap` — Tab/Shift-Tab containment hook with trigger-capture and focus-restore on deactivate; used internally by `Modal`
4. `Modal` (new shared wrapper) — combines `role="dialog"`, `aria-modal`, backdrop/Escape close, `useFocusTrap`; replaces 3 ad-hoc modal divs
5. `ToggleSwitch` (promoted from `InstitutionManagement`) — already correctly implemented; extracted to `components/ui/` to prevent future duplicates

### Critical Pitfalls

1. **No route-change focus management** — every SPA navigation is silent to screen readers; affects all 25+ pages. Fix first. Mount `RouteChangeSync` in each layout shell. Test with NVDA + Firefox.

2. **Modal focus trap absent** — `aria-modal="true"` is a screen reader hint, not a JavaScript focus lock; keyboard users can Tab out of open modals into obscured background content. Use the new `Modal` wrapper, which embeds `useFocusTrap`.

3. **`aria-expanded` missing everywhere** — grep-confirmed zero instances in the codebase; every disclosure button gives screen readers no open/closed state. Add to `NotificationBell` and all hand-rolled disclosure components.

4. **Semi-transparent focus rings** — 30+ instances of `focus:ring-primary-500/30` produce ~1.4:1 contrast (requirement is 3:1); replace globally with `focus:ring-accent-500`.

5. **Automated audit treated as compliance** — axe-core covers 57% of WCAG issues; the plan must include manual keyboard-only and screen reader testing phases. "Zero axe violations" is a regression floor, not a compliance claim.

---

## Implications for Roadmap

Based on combined research, the build order follows a clear dependency graph: infrastructure before consumers, shared components before feature components, full audit last.

### Phase 1: Foundation

**Rationale:** Route-change focus management affects every page and has no dependencies. ESLint a11y linting prevents regressions during all subsequent phases. `lang` verification, `prefers-reduced-motion`, and `aria-current` on nav links are trivial wins that should be done before any other work. These changes carry zero risk of breaking existing functionality.

**Delivers:** Global SPA focus management active on all routes, static violation detection in the development loop, `aria-current` on active nav links, `lang="en"` verified, motion preferences respected.

**Addresses features:** Route-change focus (feature 4), `lang` verification (feature 17), `prefers-reduced-motion` (feature 18), `eslint-plugin-jsx-a11y` (feature 20), `aria-current` (feature 22)

**Avoids pitfalls:** Pitfall 1 (no route-change focus management), Pitfall 5 (automated audit treated as compliance — establishes correct scope before fixes begin)

### Phase 2: Focus Infrastructure and Shared Modal

**Rationale:** `useFocusTrap` and `Modal` are prerequisites for all three modal migrations in Phase 3. Building the shared wrapper once means subsequent migrations are one-step operations. Fixing focus ring contrast here means all subsequent component work inherits correct focus styles automatically.

**Delivers:** `useFocusTrap` hook, `Modal` shared wrapper, `AnnounceProvider` global live region, focus ring contrast fix (global Tailwind change).

**Addresses features:** Modal focus trap (feature 1), focus return on close (feature 2), Escape-to-close (feature 3), focus indicator contrast (feature 15), announce utility (feature 21)

**Avoids pitfalls:** Pitfall 3 (modals lack focus trap and return), Pitfall 6 (semi-transparent focus ring contrast failure)

**Uses stack:** `focus-trap-react@12.0.0` (or custom hook per ARCHITECTURE.md; custom hook is the recommendation for this scope)

### Phase 3: Interactive Component Remediation

**Rationale:** With `Modal` and `useFocusTrap` built, modal migrations are mechanical wrap operations. `NotificationBell` and notification item fixes are independent but logically grouped as interactive component work. `aria-expanded` additions are low-effort and address the highest screen-reader UX gap.

**Delivers:** All three modals migrated to `<Modal>`, `NotificationBell` fully keyboard-operable with `aria-expanded`, notification items as native buttons, `aria-expanded` on all remaining disclosure widgets.

**Addresses features:** Modal migrations (features 1–3 migration step), NotificationBell keyboard access (feature 5), notification item keyboard operability (feature 6), `aria-expanded` (feature 7)

**Avoids pitfalls:** Pitfall 2 (`aria-expanded` missing), Pitfall 8 (dropdown cannot be closed by keyboard), Pitfall 13 (notification items not keyboard-operable), Pitfall 9 (multiple simultaneous `role="alert"` in InstitutionManagement)

### Phase 4: Screen Reader and ARIA Completeness

**Rationale:** These items are lower urgency than keyboard failures but are required for AA. They are grouped by pattern: linking ARIA attributes to DOM IDs, adding `role` attributes to dynamic content, wiring `useAnnounce()` into mutation handlers, and adding the `AttentionTrendChart` companion table.

**Delivers:** Error `aria-describedby` linkage in `AddMemberModal`, dropzone accessible label on `NoteComposer`, unread count badge announcement, skeleton loading `role="status"`, `AttentionTrendChart` companion table matching `WellbeingChart` pattern, `autocomplete` on auth forms, kiosk countdown `aria-live` corrected to threshold-only announcements.

**Addresses features:** ARIA linking and labels (features 8–11), `AttentionTrendChart` text alternative (feature 12), `autocomplete` on auth forms (feature 13)

**Avoids pitfalls:** Pitfall 4 (`AttentionTrendChart` no accessible alternative), Pitfall 10 (kiosk countdown `aria-live` per tick), Pitfall 11 (file upload progress not announced)

### Phase 5: Audit, Verification, and CI Gate

**Rationale:** Manual testing and CI configuration cannot be done before fixes are complete. This phase converts the regression floor into a verified compliance claim. It is also the phase where the 43% of WCAG issues not caught by automation are found and resolved.

**Delivers:** `@axe-core/playwright` test suite covering all routes with `runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa']`, screen reader test sign-off (NVDA + Firefox as primary, VoiceOver + Safari as secondary), heading hierarchy audit, `autocomplete` / paste verification for SC 3.3.8, `ConsentBanner` SC 2.4.11 focus-obscured check.

**Addresses features:** Paste not blocked verification (feature 14), heading hierarchy audit (feature 16), CI gate (feature 19)

**Avoids pitfalls:** Pitfall 5 (automated audit treated as compliance — this phase adds the manual layer), Pitfall 12 (ConsentBanner focus obscured by fixed content)

### Phase Ordering Rationale

- Infrastructure (`RouteChangeSync`, `AnnounceProvider`, `useFocusTrap`) must precede consumers — this is the fundamental dependency in the architecture.
- Focus ring contrast fix belongs in Phase 2 (not a dedicated visual phase) because it is a global Tailwind find-and-replace with no dependencies.
- Modal migrations grouped in Phase 3 because they depend on the `Modal` wrapper built in Phase 2.
- Screen reader and ARIA completeness deferred to Phase 4 because these items do not block keyboard navigation, which is the higher-impact user failure category.
- CI axe gate and manual testing are last because they verify the whole system — running them mid-build would produce false positives from unfixed issues.

### Research Flags

Phases with well-documented patterns (skip `research-phase`):

- **Phase 1:** Route announcer pattern is documented by React Router official docs, multiple 2025/2026 SPA accessibility guides, and MDN. Implementation is ~15 lines with no library.
- **Phase 2:** `useFocusTrap` is a known algorithm with full implementation provided in ARCHITECTURE.md. `Modal` wrapper is modelled on `KioskWarningOverlay`, which is already correct in this codebase.
- **Phase 3:** Modal migration is mechanical — wrap existing JSX with `<Modal>`. `aria-expanded` is a one-attribute addition per toggle button.
- **Phase 4:** All items follow the `WellbeingChart` / shared `Input` patterns already present in the codebase.

Phases that may benefit from targeted research during planning:

- **Phase 5:** `@axe-core/playwright` CI configuration specifics (tag scoping, fixture setup, Vite preview target). Recommended: read the Playwright accessibility testing docs during sprint planning for Phase 5 before writing the test scaffold.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All primary tools verified against official sources and npm. One medium-confidence item: `vitest-axe` low release velocity — `@chialab/vitest-axe` is the documented fallback. Verify at install time. |
| Features | HIGH | Gap list derived from direct codebase inspection on 2026-03-30. Every gap is named to a specific component and file. No inferred issues. |
| Architecture | HIGH | Component responsibilities verified against existing codebase structure. Build order respects confirmed dependency graph. Full implementation code provided in ARCHITECTURE.md for all four infrastructure patterns. |
| Pitfalls | HIGH | Sources are W3C official specs, Deque, Sara Soueidan, and live codebase analysis. All six critical pitfalls are verified as present in the current codebase. |

**Overall confidence:** HIGH

### Gaps to Address

- **`vitest-axe` maintenance:** If `vitest-axe@0.1.0` is stale or fails to install cleanly, switch to `@chialab/vitest-axe@0.19.0` — identical API, confirmed active maintenance. Verify at install time during Phase 5 setup.

- **`ConsentBanner` SC 2.4.11 (Focus Obscured):** The fixed-position `ConsentBanner` may obscure focused elements near the bottom of the viewport (PITFALLS.md Pitfall 12). Whether it does in practice depends on viewport height and page-specific content length. Verify during Phase 5 manual keyboard audit; do not pre-fix without confirming the failure is reproducible.

- **`KioskWarningOverlay` countdown `aria-live` (Pitfall 10):** Research flags a live-region-per-tick failure. Confirm the exact rendering in Phase 4 before fixing — the overlay uses `aria-live="polite"` on the tick counter element; removing it and adding threshold-only announcements (at 10 seconds and 5 seconds) is the correct fix.

- **Manual screen reader testing scope:** NVDA + Firefox is the primary test target; VoiceOver + Safari is secondary. Phase 5 must include explicit test scripts for route transitions, modal open/close flows, chart data access via companion table, and mutation announcement via `useAnnounce`. No automated tool can substitute for this coverage.

- **`focus:outline-none` audit:** Tailwind's `focus:outline-none` (not `focus-visible:`) overrides the global `*:focus-visible` rule in `app.css` for all focus events. A grep for `focus:outline-none` should be run in Phase 1 to catch any existing instances before they are obscured by other changes.

---

## Sources

### Primary (HIGH confidence)

- W3C WCAG 2.2 specification: https://www.w3.org/TR/WCAG22/
- W3C Understanding 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum
- W3C Failure F110 (sticky footer obscures focused elements): https://www.w3.org/WAI/WCAG22/Techniques/failures/F110.html
- W3C Failure F109 (preventing password paste): https://www.w3.org/WAI/WCAG22/Techniques/failures/F109.html
- Deque axe-core 4.5 WCAG 2.2 announcement: https://www.deque.com/blog/axe-core-4-5-first-wcag-2-2-support-and-more/
- Deque Automated Accessibility Coverage Report (57% statistic): https://www.deque.com/automated-accessibility-coverage-report/
- Deque WAI-ARIA Top 6 Mistakes to Avoid: https://www.deque.com/blog/wai-aria-top-6-mistakes-to-avoid/
- Playwright accessibility testing docs: https://playwright.dev/docs/accessibility-testing
- React Router accessibility how-to: https://reactrouter.com/how-to/accessibility
- Recharts accessibility wiki: https://github.com/recharts/recharts/wiki/Recharts-and-accessibility
- eslint-plugin-jsx-a11y npm (v6.10.2 confirmed): https://www.npmjs.com/package/eslint-plugin-jsx-a11y
- focus-trap-react npm (v12.0.0, React 19 compatible): https://www.npmjs.com/package/focus-trap-react
- Radix UI accessibility overview: https://www.radix-ui.com/primitives/docs/overview/accessibility
- Live codebase inspection: `packages/web/src` — 2026-03-30

### Secondary (MEDIUM confidence)

- vitest-axe GitHub (v0.1.0, happy-dom incompatibility confirmed): https://github.com/chaance/vitest-axe
- aria-live SPA patterns 2025: https://k9n.dev/blog/2025-11-aria-live/
- Focus management in React SPAs (January 2026): https://oneuptime.com/blog/post/2026-01-15-focus-management-react-spa/view
- Sara Soueidan — Accessible notifications with ARIA Live Regions: https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/
- Sara Soueidan — Focus indicators guide: https://www.sarasoueidan.com/blog/focus-indicators/
- MDN React accessibility guide: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_accessibility

### Tertiary (LOW confidence)

- None. All findings were cross-verified against official specifications or direct codebase inspection.

---

*Research completed: 2026-03-30*
*Ready for roadmap: yes*
