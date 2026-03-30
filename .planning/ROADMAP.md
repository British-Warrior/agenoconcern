# Roadmap: Indomitable Unity

## Milestones

- [x] **v1.0 MVP** — Phases 1-6 (shipped 2026-03-15)
- [x] **v1.1 Pilot-Ready** — Phases 7-11 (shipped 2026-03-21)
- [x] **v1.2 Institution Management & iThink Integration** — Phases 12-15 (shipped 2026-03-24)
- [x] **v1.3 Enhanced Reporting & Institution Portal** — Phases 16-18 (shipped 2026-03-30)
- 🚧 **v1.4 WCAG Compliance** — Phases 19-23 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-6) — SHIPPED 2026-03-15</summary>

See: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>v1.1 Pilot-Ready (Phases 7-11) — SHIPPED 2026-03-21</summary>

See: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>v1.2 Institution Management & iThink Integration (Phases 12-15) — SHIPPED 2026-03-24</summary>

See: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>v1.3 Enhanced Reporting & Institution Portal (Phases 16-18) — SHIPPED 2026-03-30</summary>

See: `.planning/milestones/v1.3-ROADMAP.md`

</details>

---

### 🚧 v1.4 WCAG Compliance (In Progress)

**Milestone Goal:** Full WCAG 2.2 AA audit and remediation — keyboard navigation, focus management, screen reader support, motion respect, semantic correctness, and a CI regression gate that prevents new violations reaching production.

- [ ] **Phase 19: Foundation** — Global SPA focus sync, lint-time violation detection, lang/motion/aria-current trivial wins
- [ ] **Phase 20: Focus Infrastructure** — useFocusTrap hook, shared Modal wrapper, AnnounceProvider, focus ring contrast fix
- [ ] **Phase 21: Interactive Component Remediation** — Modal migrations, NotificationBell keyboard access, aria-expanded on all disclosure widgets
- [ ] **Phase 22: Screen Reader & ARIA Completeness** — Error linking, dropzone labels, badge announcements, skeleton roles, chart table, form autocomplete and paste
- [ ] **Phase 23: Audit, Verification & CI Gate** — Heading hierarchy audit, axe-core Playwright CI, manual keyboard and screen reader sign-off

---

### Phase 19: Foundation
**Goal**: Global SPA accessibility baseline is active — every route change is announced to screen readers, the linter catches new violations at write time, and the five trivial wins (lang, motion, aria-current, route focus) are in place before any component work begins.
**Depends on**: Phase 18
**Requirements**: KBD-03, VIS-03, VIS-04, TOOL-01, TOOL-04
**Success Criteria** (what must be TRUE):
  1. Navigating between any two pages via keyboard moves focus to the main content heading — screen readers announce the new page name
  2. `<html lang="en">` is present on every page load — confirmed by view-source
  3. CSS animations and transitions are suppressed when the user has enabled "reduce motion" in their OS settings
  4. The active Navbar link has `aria-current="page"` and screen readers identify it as the current page
  5. Running `npm run lint` in `packages/web` reports jsx-a11y violations as errors — zero existing violations pass silently
**Plans:** 2 plans

Plans:
- [ ] 19-01-PLAN.md — RouteChangeSync component, aria-current on Navbar links, prefers-reduced-motion CSS, lang verification
- [ ] 19-02-PLAN.md — eslint-plugin-jsx-a11y strict config, fix all existing violations

---

### Phase 20: Focus Infrastructure
**Goal**: The shared accessibility infrastructure — focus trap, modal wrapper, live region announcer, and corrected focus ring contrast — exists and is ready for consumers to use. No existing modals are migrated yet; the primitives are built and verified in isolation.
**Depends on**: Phase 19
**Requirements**: KBD-01, KBD-02, VIS-01, TOOL-03
**Success Criteria** (what must be TRUE):
  1. A `useFocusTrap` hook prevents Tab from leaving a container while the trap is active, and restores focus to the trigger element on deactivation
  2. The shared `Modal` wrapper closes on Escape key press and returns focus to the element that opened it
  3. `AnnounceProvider` mounts a single `aria-live="polite"` region in the DOM; calling `useAnnounce()` from any component queues a message that screen readers read aloud
  4. Focus rings on all interactive elements meet the 3:1 contrast ratio required by WCAG 2.4.11 — verified by browser DevTools colour picker
**Plans:** 2 plans

Plans:
- [ ] 20-01-PLAN.md — useFocusTrap hook, Modal shared wrapper, AnnounceProvider and useAnnounce hook
- [ ] 20-02-PLAN.md — Focus ring contrast — replace all semi-transparent and non-compliant focus rings with focus-visible:ring-accent-500

---

### Phase 21: Interactive Component Remediation
**Goal**: All existing modals use the shared Modal wrapper (keyboard users cannot Tab into obscured background content), the NotificationBell dropdown is fully keyboard-operable, and every disclosure widget in the application reports its open/closed state to screen readers via aria-expanded.
**Depends on**: Phase 20
**Requirements**: KBD-04, KBD-05, SR-01
**Success Criteria** (what must be TRUE):
  1. Opening CircleFormationModal, AddMemberModal, or ConfirmDialog with a keyboard traps focus inside the dialog — Tab cycles within the modal and does not reach background page content
  2. Pressing Escape closes the open modal and returns focus to the button that triggered it
  3. Activating the NotificationBell with Enter or Space opens the dropdown; Tab navigates through each notification item; Enter activates the focused item
  4. Every toggle button and accordion in the application has `aria-expanded="true"` when open and `aria-expanded="false"` when closed — screen readers announce the state change
**Plans:** 2 plans

Plans:
- [ ] 21-01-PLAN.md — Migrate CircleFormationModal, AddMemberModal, ConfirmDialog to shared Modal wrapper; add aria-expanded to all disclosure widgets
- [ ] 21-02-PLAN.md — NotificationBell keyboard operability — keyboard open/close, item navigation, aria-expanded

---

### Phase 22: Screen Reader & ARIA Completeness
**Goal**: All remaining ARIA linkage gaps are closed — form errors are programmatically associated with their inputs, file dropzones are labelled, dynamic content changes are announced, skeleton states communicate loading to assistive technology, the AttentionTrendChart has a screen-reader-accessible data table, and auth forms have correct autocomplete attributes with paste not blocked.
**Depends on**: Phase 21
**Requirements**: SR-02, SR-03, SR-04, SR-05, SR-06, FORM-01, FORM-02
**Success Criteria** (what must be TRUE):
  1. When a form validation error appears, a screen reader announces the error message without the user navigating away from the field — confirmed via aria-describedby linkage
  2. The CV file dropzone is identifiable by label when navigated to with a screen reader — it has a visible and programmatic accessible name
  3. When the unread notification badge count changes, a screen reader announces the new count without the user interacting with the bell
  4. Skeleton loading placeholders are identified as loading state by screen readers — they have `role="status"` and `aria-busy="true"`
  5. AttentionTrendChart has a companion data table containing the same data — keyboard and screen reader users can access the chart data without a pointing device
  6. Auth form inputs (email, password) have correct `autocomplete` attribute values; password fields accept paste
**Plans:** 2 plans

Plans:
- [ ] 22-01-PLAN.md — SR-02 error linking (Register privacy checkbox), SR-04 badge announcement via useAnnounce, SR-05 skeleton role/aria-busy across 8 pages
- [ ] 22-02-PLAN.md — SR-06 AttentionTrendChart companion data table with toggle button

---

### Phase 23: Audit, Verification & CI Gate
**Goal**: The application passes a full automated WCAG 2.2 AA scan on every PR, the heading hierarchy is correct across all pages, and manual keyboard and screen reader testing confirms that the fixes in Phases 19-22 work correctly in real assistive technology — not just in automated tooling.
**Depends on**: Phase 22
**Requirements**: VIS-02, TOOL-02
**Success Criteria** (what must be TRUE):
  1. `@axe-core/playwright` tests run in CI for every PR and fail the build when any WCAG 2.2 AA violation is introduced — zero false positives on the current codebase
  2. Every page in the application has a correct heading hierarchy (one h1 per page, logical h2/h3 nesting) — confirmed by automated audit and visual inspection
  3. A keyboard-only walkthrough of the five primary user flows (auth, challenge board, circle workspace, wellbeing check-in, notification centre) completes without getting stuck or losing focus context
**Plans**: TBD

Plans:
- [ ] 23-01: Heading hierarchy audit and fixes across all pages
- [ ] 23-02: axe-core Playwright CI setup, manual keyboard and screen reader test sign-off

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-6 (Foundation -> Payments) | v1.0 | 19/19 | Complete | 2026-03-15 |
| 7-11 (UX -> Kiosk) | v1.1 | 11/11 | Complete | 2026-03-21 |
| 12-15 (Institutions -> PDF) | v1.2 | 10/10 | Complete | 2026-03-24 |
| 16. Wellbeing & Attention Analytics | v1.3 | 2/2 | Complete | 2026-03-27 |
| 17. Scheduled Report Delivery | v1.3 | 2/2 | Complete | 2026-03-30 |
| 18. Institution Portal | v1.3 | 2/2 | Complete | 2026-03-30 |
| 19. Foundation | v1.4 | 2/2 | Complete | 2026-03-30 |
| 20. Focus Infrastructure | v1.4 | 2/2 | Complete | 2026-03-30 |
| 21. Interactive Component Remediation | v1.4 | 0/2 | Not started | - |
| 22. Screen Reader & ARIA Completeness | v1.4 | 0/2 | Not started | - |
| 23. Audit, Verification & CI Gate | v1.4 | 0/2 | Not started | - |
