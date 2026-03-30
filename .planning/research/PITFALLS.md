# Pitfalls Research

**Domain:** WCAG 2.2 AA Retrofitting — Existing React/Vite SPA (Indomitable Unity)
**Researched:** 2026-03-30
**Confidence:** HIGH (W3C official specs, Deque, Sara Soueidan, verified against live codebase)

---

## Critical Pitfalls

Mistakes that cause WCAG failures that automated tools cannot catch, or patterns that actively
harm assistive technology users instead of helping them.

---

### Pitfall 1: No Route-Change Focus Management

**What goes wrong:**
React Router replaces page content without a browser reload. Screen readers never announce the
navigation occurred. Keyboard users are left focused on whatever they last activated — a nav link,
a button — inside content that has now been replaced. The new page renders silently from a screen
reader's perspective.

**Why it happens:**
Developers build and test visually. Route transitions look correct on screen. The gap only
surfaces with a screen reader or keyboard-only navigation. This codebase's `AppShell` has a skip
link and correct `<main id="main-content">`, but no mechanism to move focus or announce the page
change on route transition.

**How to avoid:**
On every route change: (1) update `document.title` with a meaningful page name (already done
inconsistently across pages), (2) move focus to `#main-content` or the page `<h1>`
programmatically. A `useRouteChangeAnnouncer` hook that watches `useLocation` and calls
`document.getElementById('main-content')?.focus()` is the minimal correct approach — `<main>`
must have `tabIndex={-1}` to receive programmatic focus without appearing in the Tab sequence.
Alternatively, use a visually-hidden `aria-live="polite"` region updated with the new page title
on each transition.

**Warning signs:**
Test with NVDA + Firefox: navigate between routes with keyboard only. If the screen reader does
not announce the new page heading or title after clicking a nav link, this pitfall is present.

**Phase to address:** Foundation / Audit phase — must be fixed before any other remediation.
Route-change announcement affects every page in the app.

---

### Pitfall 2: `aria-expanded` Missing on All Disclosure Widgets

**What goes wrong:**
The codebase has zero uses of `aria-expanded` anywhere. The `NotificationBell` renders a toggle
button and a dropdown panel, but the button carries only `aria-label="Notifications"` with no
state. Screen reader users hear "Notifications, button" with no indication whether the panel is
open or closed. They activate it, and nothing is announced — they cannot tell if something
happened.

The same failure exists on any other component using conditional rendering to show/hide a panel
(filter toggles, any accordion not using Radix, any popover built inline).

**Why it happens:**
Visual open/closed state is communicated through the DOM appearing and disappearing, which is
obvious on screen. `aria-expanded` is the semantic equivalent for assistive technology and
requires explicit synchronisation with component state.

**How to avoid:**
Any button that toggles visibility of another element must carry `aria-expanded={open}` and
`aria-controls="panel-id"` where `panel-id` matches the `id` of the panel element. Radix UI
components (already used for `ChallengeAccordion`) handle this automatically. For hand-rolled
disclosures:

```tsx
<button
  aria-label="Notifications"
  aria-expanded={open}
  aria-haspopup="listbox"
  aria-controls="notification-panel"
  onClick={() => setOpen(v => !v)}
>
```

**Warning signs:**
`grep -r "aria-expanded" src/` returns zero results. Every `useState` managing a boolean
show/hide that has no `aria-expanded` on its trigger button is a failure.

**Phase to address:** Interactive components remediation phase.

---

### Pitfall 3: Custom Modals Lack Focus Trap and Return Focus on Close

**What goes wrong:**
`AddMemberModal` and `CircleFormationModal` are hand-rolled `<div role="dialog">` implementations.
They have correct `role`, `aria-modal`, and `aria-labelledby`. However, they do not trap focus
inside the dialog while open, and they do not return focus to the triggering element when closed.
A keyboard user can Tab out of the open modal into the obscured background content behind the
backdrop. When the modal closes, focus drops to `document.body`.

**Why it happens:**
The ARIA attributes (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) pass automated
scanning and look complete. Focus trapping is a behavioural requirement that no automated tool
catches. `aria-modal="true"` is a hint to screen readers, not a JavaScript focus lock — focus
containment requires code.

**How to avoid:**
Either: (a) replace hand-rolled modals with Radix UI `Dialog` primitive, which handles focus
trap, Escape key, and focus return automatically; or (b) add `focus-trap-react` wrapper around
the modal panel div. On close, store a ref to the triggering element before the modal opens and
call `triggerRef.current?.focus()` after close.

**Warning signs:**
Open any modal, press Tab repeatedly — if focus escapes to the navbar or body content, the trap
is absent. Close the modal with keyboard — if focus is not returned to the button that opened it,
return focus is absent.

**Phase to address:** Interactive components remediation phase. This is a WCAG 2.1 Level A
adjacent issue (SC 2.1.2 permits intentional focus traps only when a clear exit exists — the
inverse failure is focus leaking into obscured content behind a modal).

---

### Pitfall 4: `AttentionTrendChart` Has No Accessible Alternative

**What goes wrong:**
`WellbeingChart` correctly uses `aria-hidden="true"` on the chart container and provides a
companion `<table className="sr-only">` with all data and meaningful column headers. This pattern
was not carried forward to `AttentionTrendChart`. It renders a Recharts `BarChart` with no
`aria-label`, no `role`, no `aria-hidden`, and no data table alternative. Screen reader users
encounter an unlabelled SVG region with no meaningful content.

**Why it happens:**
A good pattern existed but was not enforced as the project grew. This is the standard consistency
debt failure in retrofits — one component is correct, later components are not.

**How to avoid:**
Adopt a project-wide rule: every chart component must either (a) add `accessibilityLayer` to the
Recharts component (provides keyboard navigation and basic ARIA) plus an `aria-label` on the
outer container, or (b) hide the chart with `aria-hidden="true"` and provide a `<table
className="sr-only">` sibling with the data. Option (b) — the wellbeing chart pattern — is more
robust for complex visualisations where keyboard-navigable chart elements are not sufficient to
convey meaning to a screen reader user.

**Warning signs:**
Inspect any chart in the Chrome DevTools Accessibility tree. If the chart SVG is not `aria-hidden`
and has no accessible name, the failure is present.

**Phase to address:** Data visualisation remediation phase.

---

### Pitfall 5: Treating Automated Audit Results as Compliance

**What goes wrong:**
Teams run axe-core, fix the reported violations, and consider the accessibility work complete.
Axe-core finds on average 57% of WCAG issues — meaning 43% of issues are invisible to automated
scanning. The missing 43% includes: focus order logic, meaningful sequence, focus not obscured
(WCAG 2.2 SC 2.4.11), live region behaviour under actual screen readers, colour contrast in
dynamic states (hover, focus, error, disabled), motion preferences, and all WCAG 2.2-specific
criteria (dragging alternatives, target size, focus appearance, accessible authentication).

**Why it happens:**
Automated tools are fast, produce shareable reports, and provide a false sense of completeness.
"Zero axe violations" is a meaningful regression floor but is not a WCAG compliance claim.

**How to avoid:**
Use automated tools (axe-core via `@axe-core/react` in development, `@axe-core/playwright` in
CI) as a regression floor, not a compliance ceiling. Budget explicit time for manual testing:
keyboard-only navigation of all user flows, screen reader testing (NVDA + Firefox as primary,
VoiceOver + Safari as secondary), Windows High Contrast Mode visual check, and colour contrast
verification in all interactive states (not just default).

**Warning signs:**
If the audit plan consists only of "run axe-core and fix violations", incomplete coverage is
guaranteed.

**Phase to address:** Audit planning phase — scope must be established before remediation begins.

---

### Pitfall 6: `focus:ring-primary-500/30` Contrast Failure Across Multiple Components

**What goes wrong:**
The shared `Input` and `Button` components correctly use full-opacity focus rings
(`focus:ring-2 focus:ring-accent-500`). However, across the codebase in ad-hoc inputs
(ResolutionForm, ChallengeForm, CircleWorkspace, NoteComposer, AddMemberModal), there are
over 30 `<input>` and `<textarea>` elements using `focus:ring-primary-500/30`. The `/30` opacity
modifier produces approximately a 1.4:1 contrast ratio of the ring against a white background —
a WCAG 2.1 SC 1.4.11 (Non-text Contrast, AA) failure. The requirement is 3:1.

**Why it happens:**
Opacity modifiers in Tailwind (`/30`, `/50`) look softer and more polished than full-opacity
rings. The visual difference between a weak ring and a 3:1 ring is subtle on a calibrated display.
Automated tools check contrast of text and images; focus ring contrast is checked by automated
tools in some configurations but is frequently missed.

**How to avoid:**
Audit every `focus:ring-*` value. Replace `focus:ring-primary-500/30` with either `focus:ring-
accent-500` (the project's established accessible focus colour) or another full-opacity colour
with verified 3:1 contrast against the component's background. Prefer `focus-visible:ring-*`
over `focus:ring-*` to avoid showing keyboard-style focus rings on mouse click (already done on
Button and shared Input, inconsistently applied elsewhere).

**Warning signs:**
Any `focus:ring-*/[opacity]` or `focus:ring-primary-500/30` in Tailwind classnames is a likely
contrast failure.

**Phase to address:** Focus indicator audit phase.

---

## Moderate Pitfalls

---

### Pitfall 7: Missing `aria-current` on Active Navigation Links

**What goes wrong:**
The `Navbar` renders `<Link>` elements for Dashboard, Challenges, Circles, etc. None carry
`aria-current="page"` on the currently active route. Screen reader users navigating the nav cannot
identify which page they are already on.

**Prevention:**
Replace `<Link>` with React Router's `<NavLink>` which exposes an `isActive` boolean in its
className callback. Apply `aria-current={isActive ? "page" : undefined}` to the rendered anchor.

---

### Pitfall 8: Notification Dropdown Cannot Be Closed by Keyboard

**What goes wrong:**
`NotificationBell` closes on outside `mousedown`. There is no Escape key handler. Keyboard users
who open the dropdown cannot close it without tabbing through every notification item to reach
the end of the list, then continuing past it. The dropdown also lacks `aria-expanded` (Pitfall 2).

**Prevention:**
Add a `useEffect` listening for `keydown` with `key === 'Escape'` to call `setOpen(false)` and
return focus to the bell button. This is WCAG 2.1 SC 2.1.2.

---

### Pitfall 9: Multiple Simultaneous `role="alert"` Announcements

**What goes wrong:**
`role="alert"` is equivalent to `aria-live="assertive"` — it interrupts whatever the screen reader
is currently announcing. `InstitutionManagement.tsx` contains five or more separate `role="alert"`
elements that can all be visible simultaneously (email error, name error, report error, institution
error). When this page loads with pre-existing validation state, multiple assertive announcements
fire in sequence, saturating the speech queue.

The shared `Input` component uses `role="alert"` correctly (it fires once when the error element
mounts in response to user action). The issue is in ad-hoc inline error elements that are always
in the DOM or appear together.

**Prevention:**
Use `role="alert"` only for a single message appearing directly in response to a specific user
action. For validation summaries, use `role="status"` (polite) or rely on `aria-describedby`
linking fields to their error text. Never make multiple `role="alert"` elements visible in the
same interaction cycle.

---

### Pitfall 10: Kiosk Countdown Timer Announces Every Second

**What goes wrong:**
`KioskWarningOverlay` renders the countdown `{secondsLeft}` inside `<div aria-live="polite">`.
This causes a screen reader announcement every single second ("30", "29", "28"...). The polite
queue saturates, other announcements are delayed, and the overlay becomes unusable for screen
reader users.

**Prevention:**
Remove `aria-live` from the tick counter element entirely. The `alertdialog` role with
`aria-describedby` pointing to the descriptive paragraph already handles the initial announcement
when the overlay mounts. For countdown urgency, announce only at significant thresholds (10
seconds, 5 seconds) using a separate `aria-live="assertive"` region that is only updated at those
specific points — never on every tick.

---

### Pitfall 11: File Upload Progress Not Announced to Screen Readers

**What goes wrong:**
`UploadCV` shows a loading spinner overlay during `upload.isPending` but the "Uploading your
CV..." text is inside a visually-overlaid div, not a live region. Screen reader users activate
the upload drop zone, the page goes quiet, and they have no indication whether anything is
happening. The `role="button"` drop zone also sets `disabled` (via `upload.isPending`) without
providing `aria-disabled="true"` on the container — the two communicate different information to
assistive technology.

**Prevention:**
Add a `role="status"` element adjacent to the drop zone that is always in the DOM but empty when
not uploading. When `upload.isPending` becomes true, populate it with "Uploading your CV, please
wait." This fires the screen reader announcement without the visual overlay requiring assistive
technology awareness. Also set `aria-disabled="true"` on the drop zone container when disabled
(not just visual opacity), and ensure the error state sets `aria-invalid="true"`.

---

### Pitfall 12: WCAG 2.2 SC 2.4.11 — Focus Obscured by Fixed Content

**What goes wrong:**
WCAG 2.2 AA includes SC 2.4.11 (Focus Not Obscured - Minimum): a focused element must not be
completely hidden by author-created fixed or sticky content. The current layout has no sticky
header, but the `ConsentBanner` renders as a fixed element at the bottom of the viewport. If a
user is tabbing through content near the bottom of the page while the banner is visible, focused
elements will be completely obscured by the banner — a direct SC 2.4.11 failure.

**Prevention:**
For the `ConsentBanner`: either make it modal (require dismiss before any other interaction,
which already works with the Escape/click-outside close pattern) or add `scroll-padding-bottom`
equal to the banner height to the `<html>` element. Test by Tab-focusing elements near the bottom
of the viewport with the banner visible.

---

### Pitfall 13: Notification Items Are `<li onClick>` Without Keyboard Activation

**What goes wrong:**
Each notification item in `NotificationBell` is a `<li onClick>`. `onClick` on a non-interactive
element fires on mouse click and on Enter when the element has `tabIndex`, but does not fire on
Space (the expected keyboard activation for buttons). More critically, there is no `tabIndex` on
the `<li>` elements at all — keyboard users cannot reach individual notifications.

**Prevention:**
Replace `<li onClick>` with `<li><button type="button">...</button></li>`. The button handles
keyboard activation (Enter and Space), focus, and disabled state natively. This also resolves the
screen reader role ambiguity — `<li>` with `onClick` is announced as a list item, not an
interactive control.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Ad-hoc `<input>` instead of shared `Input` component | Faster to write inline | No `aria-invalid`, no `aria-describedby`, inconsistent focus ring contrast, errors not announced | Never — always use shared component |
| `role="button"` on `<div>` | Appears accessible in DOM inspection | No keyboard activation (Enter/Space), no inherent disabled state, not a native button | Never — use `<button>` |
| `aria-label` on icon button without screen reader test | Satisfies axe-core | Label may be wrong, unhelpful, or contradict visible text | Only acceptable if tested with a real screen reader |
| Chart `aria-hidden` without companion data table | Suppresses false positives in automated scan | Screen reader users receive no data | Never — always pair with accessible table or `accessibilityLayer` |
| `focus:ring-primary-500/30` instead of full-opacity ring | Softer visual appearance | 1.4:1 contrast ratio — WCAG SC 1.4.11 failure | Never in user-facing interactive elements |
| Conditional rendering of error message as `role="alert"` inline | Alert fires on mount | Multiple simultaneous alerts if several errors become visible together | Only one `role="alert"` visible per interaction |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Recharts | Rendering chart with no `aria-hidden` and no data alternative | `aria-hidden="true"` on chart container + companion `<table className="sr-only">`, OR add `accessibilityLayer` prop to chart component |
| Radix UI Accordion | Hand-rolling accordion-style patterns elsewhere in the codebase | Always use Radix `Accordion.Root/Item/Trigger/Content` — ARIA states are handled automatically |
| react-dropzone | Relying on visual overlay to communicate upload state | Add `role="status"` live region outside the drop zone; set `aria-disabled` not just visual `opacity` |
| React Router `<Link>` | Link has no active-state ARIA semantics | Use `<NavLink>` with `aria-current={isActive ? "page" : undefined}` |
| Tailwind v4 focus utilities | `focus:ring-*/[opacity < 100]` considered safe because a ring is present | Audit all semi-transparent focus rings — they fail the 3:1 contrast requirement for SC 1.4.11 |
| Custom modals (`role="dialog"`) | `aria-modal="true"` assumed to lock focus | `aria-modal` is a screen reader hint only; JavaScript focus trap is required separately |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| `aria-live` on a value updated every interval tick | Screen reader queue saturated; other announcements drop or are delayed indefinitely | Update live regions only at meaningful thresholds, never on every timer tick | Immediately — as with kiosk countdown |
| Multiple `role="alert"` elements made visible together | Assertive announcement queue overloaded; user hears partial or garbled messages | Single assertive announcement per interaction; use `role="status"` for everything else | Any page with simultaneous validation errors |
| Large DOM tree injected into live region | Announcement reads every text node — extremely long | Inject summary text only ("3 items", not all item content) | Any live region receiving more than a sentence of content |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Success message shown by unmounting form and replacing with static text (`AddMemberModal` success state) | Screen reader users hear nothing — no live region fires on the replacement content | Render success in a `role="status"` element that is always in the DOM, populated on success |
| Error text not linked to its field via `aria-describedby` (`AddMemberModal` inline `<input>`) | Screen reader reads the field name only; the error below is not associated with the field | Use `aria-describedby="error-id"` on the input and `id="error-id"` on the error `<p>`; also set `aria-invalid="true"` |
| Colour alone signals unread notification status (left border accent) | Colour-blind users cannot distinguish read/unread | Add visually-hidden text ("unread") to unread notification items |
| Nav links have no active-page indicator for screen readers | Screen reader users cannot confirm which page they are on | `aria-current="page"` on the active `<NavLink>` |

---

## "Looks Done But Isn't" Checklist

- [ ] **Skip link visible on focus:** Present in `AppShell` (`<a href="#main-content">`) — verify it
  is the first focusable element AND becomes visible when focused (not just positioned off-screen
  forever).
- [ ] **Modal focus trap:** `role="dialog"` and `aria-modal="true"` are present — verify Tab cannot
  escape to background content while the modal is open.
- [ ] **Focus returned after modal close:** Modals close programmatically — verify focus returns to
  the element that triggered the modal, not `document.body`.
- [ ] **Chart data table:** `WellbeingChart` has `<table className="sr-only">` — verify
  `AttentionTrendChart` (and any future charts) have equivalent before marking complete.
- [ ] **Route announcement:** Some pages update `document.title` in `useEffect` — verify a screen
  reader announces the page change on every route transition, not just pages with the title effect.
- [ ] **`aria-expanded` on all disclosure toggles:** Grep for `setOpen` / `useState(false)` with a
  conditional render — verify every trigger button has `aria-expanded={open}`.
- [ ] **Escape key handling:** Every open panel, dropdown, and modal — verify Escape closes it and
  returns focus to the trigger.
- [ ] **Colour contrast in all states:** Automated tools only check default state — manually verify
  focus, hover, disabled, and error states meet 3:1 (non-text) or 4.5:1 (text) ratios.
- [ ] **Accessible authentication (WCAG 3.3.8):** Password and phone login flows — verify no
  cognitive puzzle (image CAPTCHA) is required without alternative, and that password fields allow
  paste (F109 failure if paste is blocked).
- [ ] **Target size (WCAG 2.5.8):** 24×24 CSS px minimum for interactive elements — spot-check
  small action buttons. The notification bell button (`p-2` wrapping a 20×20 icon = ~40×40 total,
  passes). Inline text-only action buttons ("Mark all read", "Enable Notifications") may be below
  24px height without sufficient padding.
- [ ] **`role="alert"` used correctly:** Verify no page has multiple `role="alert"` elements
  becoming visible simultaneously from a single user action.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No route-change focus management | LOW | Add `useRouteChangeAnnouncer` hook to `AppShell`; add `tabIndex={-1}` to `<main>` |
| Missing `aria-expanded` everywhere | LOW–MEDIUM | Grep `setOpen` + conditional render; add `aria-expanded`, `aria-controls`, panel `id` to each |
| No focus trap in custom modals | MEDIUM | Replace with Radix `Dialog` (breaking change to modal API) or add `focus-trap-react` wrapper |
| Chart accessibility gap | LOW | Copy `WellbeingChart` pattern to `AttentionTrendChart`; make a shared `ChartWithDataTable` wrapper |
| Kiosk countdown live region spam | LOW | Remove `aria-live` from tick element; add threshold-only announcer |
| Missing `aria-expanded` on notification bell | LOW | Add four attributes to one button element |
| Focus not returned after modal close | LOW–MEDIUM | Add `triggerRef` pattern to all modal callers; call `.focus()` on close |
| `role="alert"` stacking in InstitutionManagement | LOW | Audit error render conditions; replace simultaneous alerts with `role="status"` |
| Semi-transparent focus rings | LOW | Replace all `focus:ring-*/30` with `focus:ring-accent-500` globally |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| No route-change focus management | Phase 1: Foundation | Screen reader test: navigate routes, confirm page title or heading announced |
| Missing `aria-expanded` on all disclosures | Phase 2: Interactive Components | Axe-core passes + manual keyboard check of every toggle |
| Custom modals lack focus trap and return | Phase 2: Interactive Components | Keyboard-only modal flow test; Escape closes and returns focus |
| `AttentionTrendChart` no accessible alternative | Phase 3: Data Visualisation | Screen reader navigates to chart; table data is announced, SVG is aria-hidden |
| Automated audit treated as compliance | Phase 1: Audit Planning | Manual test plan reviewed and signed off before remediation begins |
| Semi-transparent focus ring contrast failure | Phase 2: Focus Indicators | Chrome DevTools contrast checker on every interactive state |
| No `aria-current` on active nav | Phase 1: Foundation | Screen reader reads "Dashboard, link, current page" on active route |
| Notification dropdown no Escape key | Phase 2: Interactive Components | Keyboard: open bell, press Escape, confirm closed and focus returned to bell |
| Multiple simultaneous `role="alert"` | Phase 2: Interactive Components | Audit InstitutionManagement error patterns; trigger multiple errors at once |
| Kiosk countdown `aria-live` per tick | Phase 2: Interactive Components | Screen reader test of kiosk warning overlay — confirm no per-second announcement |
| File upload progress not announced | Phase 3: Forms | Screen reader test: drop file, confirm "Uploading" announced, confirm success/error announced |
| Focus obscured by ConsentBanner | Phase 2: Layout | Tab through page bottom with ConsentBanner visible; confirm focused elements are not fully hidden |
| Notification items not keyboard-operable | Phase 2: Interactive Components | Tab to bell, open, Tab to first item, press Enter — confirm navigation occurs |
| Password paste prevention (SC 3.3.8) | Phase 1: Audit | Check all password inputs for `onPaste` handler blocking paste |

---

## Sources

- W3C WCAG 2.2 Understanding Docs:
  [SC 2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum),
  [SC 2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements),
  [SC 3.3.8 Accessible Authentication](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum)
- W3C Failure Techniques:
  [F110 — sticky footer obscures focused elements](https://www.w3.org/WAI/WCAG22/Techniques/failures/F110.html),
  [F109 — preventing password paste](https://www.w3.org/WAI/WCAG22/Techniques/failures/F109.html)
- Deque:
  [WAI-ARIA Top 6 Mistakes to Avoid](https://www.deque.com/blog/wai-aria-top-6-mistakes-to-avoid/),
  [How to make interactive charts accessible](https://www.deque.com/blog/how-to-make-interactive-charts-accessible/),
  [Automated Accessibility Coverage Report (57% statistic)](https://www.deque.com/automated-accessibility-coverage-report/)
- Sara Soueidan:
  [Accessible notifications with ARIA Live Regions Part 1](https://www.sarasoueidan.com/blog/accessible-notifications-with-aria-live-regions-part-1/),
  [Focus indicators guide](https://www.sarasoueidan.com/blog/focus-indicators/)
- Recharts:
  [GitHub issue #2801 — accessibility support](https://github.com/recharts/recharts/issues/2801),
  [GitHub discussion #4484 — accessibility direction](https://github.com/recharts/recharts/discussions/4484)
- React Router:
  [GitHub discussion #9863 — SPA focus not reset on route change](https://github.com/remix-run/react-router/discussions/9863)
- Radix UI: [Accessibility overview](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- AllAccessible:
  [WCAG 2.2 Complete Guide 2025](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025)
- oidaisdes.org: [Common ARIA Mistakes](https://www.oidaisdes.org/common-aria-mistakes.en/)
- Live codebase analysis: `packages/web/src` — 2026-03-30

---
*Pitfalls research for: WCAG 2.2 AA retrofitting on existing React/Vite SPA (Indomitable Unity)*
*Researched: 2026-03-30*
