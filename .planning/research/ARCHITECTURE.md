# Architecture Research

**Domain:** WCAG 2.2 AA remediation — React/Vite SPA (Indomitable Unity)
**Researched:** 2026-03-30
**Confidence:** HIGH (direct codebase inspection + verified WCAG 2.2 documentation + recharts wiki)

---

## Existing Accessibility Baseline

Before prescribing architecture, a full inspection of the codebase establishes what already works and what does not. This prevents redundant work and clarifies the true gap.

**Already implemented correctly:**
- Global `*:focus-visible` outline rule in `app.css` (3px amber, `outline-offset: 2px`) — meets WCAG 2.4.7 and 2.2's 2.4.11
- `.skip-link` class and `<a href="#main-content">Skip to main content</a>` in `AppShell` — meets 2.4.1
- `<main id="main-content" role="main">`, `<header role="banner">`, `<footer role="contentinfo">` landmarks in `AppShell`
- `<nav aria-label="Main navigation">` in `Navbar`
- `Input` component uses `useId`, `aria-describedby`, `aria-invalid`, and `role="alert"` on error text
- `Button` uses `aria-busy` on loading state, `aria-hidden` on the spinner SVG
- `Alert` uses `role="alert"` (errors/warnings) and `role="status"` (info/success)
- `WellbeingChart` has `aria-hidden="true"` on the recharts container and a companion `<table className="sr-only">` — the correct pattern
- `KioskWarningOverlay` has `role="alertdialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, and `aria-live` on the countdown
- `CircleFormationModal` and `AddMemberModal` have `role="dialog"`, `aria-modal`, `aria-labelledby`
- `ToggleSwitch` in `InstitutionManagement` has `role="switch"` and `aria-checked`
- `WellbeingForm` uses `<fieldset>`/`<legend>` for each radio group, radio inputs are `sr-only` with visible styled labels
- `document.title` set per page component via `useEffect` — consistent across all 25+ pages
- All primary and semantic colours documented as 7:1+ contrast on white in `app.css` comments
- `--spacing-touch: 3rem` (48px minimum touch target) defined in theme

**Gaps identified by inspection:**

| Gap | Affected Component(s) | WCAG Criterion |
|-----|----------------------|----------------|
| No focus trap — Tab escapes modals into page behind | `CircleFormationModal`, `AddMemberModal`, `ConfirmDialog` in InstitutionManagement | 2.1.2 |
| No focus return to trigger on modal close | Same modals as above | 2.4.3 |
| No focus movement on route change | All shells | 2.4.3 |
| No global announcement channel for async success/failure | Mutation handlers throughout app | 4.1.3 |
| `NotificationBell` dropdown has no `aria-expanded`, no Escape handler, no focus return | `NotificationBell.tsx` | 2.1.1, 4.1.2 |
| Navbar inline buttons ("Enable Notifications", "Install App") have no `aria-label` | `Navbar.tsx` | 4.1.2 |
| `AttentionTrendChart` lacks `accessibilityLayer` prop and companion table | `AttentionTrendChart.tsx` | 1.1.1, 4.1.2 |
| `AddMemberModal` uses a raw `<input>` instead of the accessible `Input` component | `AddMemberModal.tsx` | 1.3.1, 3.3.1 |
| No `aria-current="page"` on active Navbar links | `Navbar.tsx` | 4.1.2 |
| `ToggleSwitch` is local to `InstitutionManagement.tsx` — not shared | `InstitutionManagement.tsx` | n/a (DX/maintenance) |

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        Layout Shell Layer                        │
│  AppShell (skip link, landmarks)                                 │
│  Minimal shells: InstitutionPortalRoute, ChallengerRoute, CMRoute│
├──────────────────────────────────────────────────────────────────┤
│                   Accessibility Infrastructure                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ AnnounceProvider │  │ RouteChangeSync  │  │ useFocusTrap  │  │
│  │ (context + DOM   │  │ (focus → h1 on   │  │ (hook — used  │  │
│  │  live region)    │  │  pathname change) │  │  inside Modal)│  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬────────┘  │
│           │                     │                    │           │
├───────────┴─────────────────────┴────────────────────┴───────────┤
│                      Shared UI Component Layer                   │
│  Input  Button  Alert  Card  Modal  ToggleSwitch                 │
├──────────────────────────────────────────────────────────────────┤
│                        Page / Feature Layer                      │
│  pages/   components/challenges/   components/circles/           │
│  components/wellbeing/   components/attention/   layout/         │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Integration Point |
|-----------|----------------|-------------------|
| `AnnounceProvider` (new) | Owns the single global `aria-live="polite"` region; exposes `useAnnounce()` hook | Wrap `<App>` in `main.tsx` |
| `RouteChangeSync` (new) | On `pathname` change: moves focus to `main h1` | Mount as sibling to `<Outlet>` in each layout shell |
| `useFocusTrap` (new hook) | Constrains Tab/Shift-Tab inside a container ref; restores focus to trigger on deactivate | Used internally by `Modal`; not used directly by consumers |
| `Modal` (new shared wrapper) | Combines `role="dialog"`, `aria-modal`, `aria-labelledby`, backdrop click-close, Escape-close, `useFocusTrap` | Replace all ad-hoc modal divs in circles, challenges, admin |
| `Input` (existing — minor update) | Already correct; add `aria-required={required}` (1 line) | No consumer changes needed |
| `NotificationBell` (existing — update) | Add `aria-expanded`, `aria-haspopup="listbox"`, Escape handler, focus return on close | Modify in place |
| `AttentionTrendChart` (existing — update) | Add `accessibilityLayer` to `BarChart`; add `sr-only` companion table | Pattern matches existing `WellbeingChart` |
| `ToggleSwitch` (existing — promote) | Already correct in InstitutionManagement; extract to `components/ui/ToggleSwitch.tsx` | Move only, no logic changes |

---

## Recommended Project Structure

New files land alongside existing conventions. No restructuring of existing directories.

```
src/
├── components/
│   ├── a11y/                           # New — accessibility infrastructure
│   │   ├── AnnounceProvider.tsx        # Context + live region DOM node + useAnnounce hook
│   │   ├── RouteChangeSync.tsx         # Moves focus to h1 on pathname change
│   │   └── useFocusTrap.ts             # Hook: Tab/Shift-Tab containment + trigger restore
│   ├── ui/
│   │   ├── Modal.tsx                   # New shared dialog shell (wraps useFocusTrap)
│   │   ├── ToggleSwitch.tsx            # Promoted from InstitutionManagement
│   │   ├── Button.tsx                  # Existing — correct as-is
│   │   ├── Input.tsx                   # Existing — add aria-required (1 line)
│   │   ├── Alert.tsx                   # Existing — correct as-is
│   │   └── Card.tsx                    # Existing — correct as-is
│   ├── layout/
│   │   ├── AppShell.tsx                # Add <RouteChangeSync />
│   │   └── Navbar.tsx                  # Add aria-current, aria-expanded, aria-labels
│   ├── circles/
│   │   ├── CircleFormationModal.tsx    # Migrate to <Modal>
│   │   └── AddMemberModal.tsx          # Migrate to <Modal>, use <Input>
│   └── attention/
│       └── AttentionTrendChart.tsx     # Add accessibilityLayer + sr-only table
└── main.tsx                            # Wrap <App> with <AnnounceProvider>
```

### Structure Rationale

- **`components/a11y/`:** Infrastructure that has no visual output belongs separate from visual UI. Grouping accessibility utilities together makes them easy to find and prevents them being distributed across unrelated feature folders.
- **`components/ui/Modal.tsx`:** Centralises all dialog accessibility requirements. Every modal gets correct ARIA, focus trap, and Escape key handling automatically, without each author maintaining a checklist.
- **`components/ui/ToggleSwitch.tsx`:** The InstitutionManagement version is already correctly implemented. Promoting it prevents future pages writing their own broken switch.

---

## Architectural Patterns

### Pattern 1: Announcement Provider (Global Live Region)

**What:** A React context that owns a single `aria-live="polite"` region injected at app root. Any component calls `useAnnounce("Circle created")` and the message is read by screen readers then cleared.

**When to use:** Any async operation whose result is not already surfaced by inline `role="alert"` content. Primary cases: successful mutations (circle created, member added, challenge submitted), navigation confirmations.

**Trade-offs:** A single live region avoids the race condition caused by multiple simultaneous live regions, where screen readers can drop or reorder announcements. The 50ms reset-before-set pattern forces re-announcement even when the same message fires twice in a row. The `sr-only` div must exist in the DOM before any announcement fires — placing `AnnounceProvider` at root satisfies this.

Inline `role="alert"` on form errors (already in `Input` and `Alert`) is correct and distinct — that pattern handles synchronous validation feedback and should not be changed to use this channel.

**Example:**
```typescript
// components/a11y/AnnounceProvider.tsx
const AnnounceContext = createContext<(msg: string) => void>(() => {});

export function AnnounceProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState("");

  const announce = useCallback((msg: string) => {
    setMessage("");                       // clear first — forces re-read on duplicate messages
    setTimeout(() => setMessage(msg), 50);
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnounceContext);
```

### Pattern 2: Route Change Focus Sync

**What:** A component that listens to `useLocation()` and on each `pathname` change moves focus to the page's `<h1>` element inside `<main>`. The `<h1>` receives `tabIndex={-1}` to be programmatically focusable without entering the tab order.

**When to use:** Mount once inside each layout shell (`AppShell`, and the minimal portal/challenger shells) as a sibling to `<Outlet>`. Each shell gets its own instance. This is a zero-output component (renders `null`).

**Trade-offs:** Focusing `<h1>` is the current industry consensus for SPAs (react-router official accessibility docs, January 2026 SPA accessibility guides, MDN React accessibility guide — all agree). Focusing `<main>` is an alternative but requires more consistent structural markup. `tabIndex={-1}` on `<h1>` does not affect sighted users — the focus ring only appears for programmatic focus in the context of keyboard navigation.

`document.title` is already updated per page in this codebase. `RouteChangeSync` handles focus only and does not duplicate title management.

**Example:**
```typescript
// components/a11y/RouteChangeSync.tsx
export function RouteChangeSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    const h1 = document.querySelector<HTMLElement>("main h1");
    if (h1) {
      h1.tabIndex = -1;
      h1.focus({ preventScroll: false });
    }
  }, [pathname]);

  return null;
}
```

### Pattern 3: useFocusTrap Hook

**What:** A hook that accepts an `active` boolean and returns a `containerRef`. When `active` is true it: captures the current focused element as a restore target, moves focus to the first focusable child, intercepts Tab and Shift-Tab to cycle within the container, and on deactivation restores focus to the captured trigger.

**When to use:** Modals and alertdialogs only. Do not apply to menus or dropdowns — those use roving `tabindex` (ARIA authoring practices for composite widgets).

**Trade-offs:** A custom hook keeps the dependency graph minimal. The library `focus-trap-react` (~6KB, peer dep chain) provides the same core behaviour plus rare features (custom initial focus selectors, delay activation, `allowOutsideClick`). Those features are not needed here. If complex nested trap scenarios arise later (e.g., a modal that opens another modal), migrating to the library is straightforward.

**Example:**
```typescript
// components/a11y/useFocusTrap.ts
const FOCUSABLE_SELECTORS = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    triggerRef.current = document.activeElement as HTMLElement;
    const container = containerRef.current;
    if (!container) return;

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    );
    focusable[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const els = Array.from(
        container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      triggerRef.current?.focus();    // restore focus on deactivate
    };
  }, [active]);

  return containerRef;
}
```

### Pattern 4: Shared Modal Wrapper

**What:** A `Modal` component that encapsulates all dialog accessibility requirements. Consumers provide `isOpen`, `onClose`, `titleId`, and `children`. The modal handles everything else: ARIA roles, focus trap, Escape key, backdrop click, and focus restoration.

**When to use:** All modals. Migrate existing `CircleFormationModal`, `AddMemberModal`, and `ConfirmDialog` (in InstitutionManagement) to use this wrapper. The existing API surface (`isOpen`/`onClose` props) is unchanged for consumers.

**Trade-offs:** The wrapper owns the overlay and panel container. Internal content (title, body, actions) remains the consumer's responsibility. This avoids over-abstraction while guaranteeing baseline compliance from a single code path.

**Example:**
```typescript
// components/ui/Modal.tsx
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, titleId, children, className = "" }: ModalProps) {
  const trapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={trapRef as React.RefObject<HTMLDivElement>}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`relative bg-white rounded-[var(--radius-lg)] shadow-xl w-full max-w-md p-6 ${className}`}>
        {children}
      </div>
    </div>
  );
}
```

### Pattern 5: Chart with Companion Table

**What:** Every recharts chart component renders two things: the visual chart with `aria-hidden="true"` on its wrapper, and a `<table className="sr-only">` containing the same data in structured form. Charts also receive the `accessibilityLayer` prop.

**When to use:** All recharts components. Already implemented correctly in `WellbeingChart`. `AttentionTrendChart` needs to be updated to match.

**Trade-offs:** `accessibilityLayer` (HIGH confidence — confirmed in recharts wiki) adds ARIA labels, roles, and arrow-key navigation to the chart SVG, covering keyboard-only users who can interact with the chart. The companion table provides a fallback for screen reader users where SVG navigation is impractical. Both together cover all assistive technology cases.

Important: `accessibilityLayer` defaults to `false` in recharts 2.x (the version in use). It must be set explicitly on each chart component.

---

## Data Flow

### Announcement Flow

```
Mutation onSuccess / onError callback
    ↓
useAnnounce() hook (from AnnounceContext)
    ↓
announce("Circle created")
    ↓
setMessage("") → setTimeout 50ms → setMessage("Circle created")
    ↓
<div role="status" aria-live="polite"> renders new message
    ↓
Screen reader reads message at polite priority
```

### Modal Focus Flow

```
User activates trigger button
    ↓
isOpen = true → Modal renders
    ↓
useFocusTrap(true) fires
    ↓
triggerRef captures document.activeElement (the button)
    ↓
First focusable element inside modal receives focus
    ↓ (user Tab-navigates, cycles within modal, completes or cancels)
onClose() called (Escape key / backdrop click / action button)
    ↓
isOpen = false → useFocusTrap cleanup runs
    ↓
triggerRef.current.focus() — focus returns to opening button
```

### Route Change Focus Flow

```
User clicks Link (react-router navigation)
    ↓
useLocation().pathname changes
    ↓
RouteChangeSync useEffect fires
    ↓
document.title updated by page useEffect (already in every page — unchanged)
    ↓
querySelector("main h1").tabIndex = -1
querySelector("main h1").focus()
    ↓
Screen reader announces heading text → user knows they are on a new page
```

---

## Integration Points

### Existing Components: Modify vs Create New

| Component | Action | What Changes |
|-----------|--------|--------------|
| `main.tsx` | Modify | Wrap `<App>` with `<AnnounceProvider>` |
| `AppShell` | Modify | Add `<RouteChangeSync />` before `<Outlet>` |
| `InstitutionPortalRoute`, `ChallengerRoute`, `CMRoute` | Modify | Add `<RouteChangeSync />` in each minimal shell |
| `Navbar` | Modify | Add `aria-current="page"` on active links; add `aria-expanded`/`aria-haspopup` on bell button; add `type="button"` and `aria-label` on inline buttons |
| `NotificationBell` | Modify | Add `aria-expanded={open}`, `aria-haspopup="listbox"`, Escape handler, focus return on close |
| `Input` | Modify | Add `aria-required={required}` to `<input>` (1 line) |
| `AddMemberModal` | Modify | Migrate to `<Modal>` wrapper; replace raw `<input>` with `<Input>` component |
| `CircleFormationModal` | Modify | Migrate to `<Modal>` wrapper |
| `InstitutionManagement` (ConfirmDialog) | Modify | Migrate to `<Modal>` wrapper |
| `AttentionTrendChart` | Modify | Add `accessibilityLayer` to `<BarChart>`; add `sr-only` companion `<table>` |
| `AnnounceProvider` + `useAnnounce` | Create new | `components/a11y/AnnounceProvider.tsx` |
| `RouteChangeSync` | Create new | `components/a11y/RouteChangeSync.tsx` |
| `useFocusTrap` | Create new | `components/a11y/useFocusTrap.ts` |
| `Modal` | Create new | `components/ui/Modal.tsx` |
| `ToggleSwitch` | Promote | Move from `InstitutionManagement.tsx` to `components/ui/ToggleSwitch.tsx` |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `AnnounceProvider` ↔ feature components | React context via `useAnnounce` hook | No prop drilling; context is the correct scope |
| `useFocusTrap` ↔ `Modal` | Ref returned from hook, attached to dialog container | Modal consumers do not interact with the trap directly |
| `RouteChangeSync` ↔ layout shells | Renders as `null` sibling to `<Outlet>` | One instance per shell |
| Existing modals ↔ `Modal` wrapper | `isOpen`/`onClose` props unchanged | Migration is mechanical — wrap existing JSX |

---

## Suggested Build Order

This order respects dependencies: infrastructure before consumers, shared components before feature components.

**Step 1 — Infrastructure (no existing code affected)**
1. `useFocusTrap.ts` — self-contained; no dependencies
2. `AnnounceProvider.tsx` — self-contained; wrap `main.tsx`
3. `RouteChangeSync.tsx` — depends on `react-router` `useLocation` (already present)

**Step 2 — Shared UI (minimal changes to existing files)**
4. `Modal.tsx` — new; consumes `useFocusTrap`
5. `ToggleSwitch.tsx` — promote from InstitutionManagement (move only, no logic change)
6. `Input.tsx` — add `aria-required` (1 line)

**Step 3 — Layout and navigation fixes**
7. `AppShell.tsx` — add `<RouteChangeSync />`; add it to minimal shells
8. `Navbar.tsx` — `aria-current`, inline button `aria-label`s
9. `NotificationBell.tsx` — `aria-expanded`, Escape handler, focus return

**Step 4 — Modal migrations (use the new `Modal` wrapper)**
10. `CircleFormationModal.tsx` — migrate to `<Modal>`
11. `AddMemberModal.tsx` — migrate to `<Modal>`, replace raw input with `<Input>`
12. `InstitutionManagement` ConfirmDialog — migrate to `<Modal>`

**Step 5 — Chart accessibility**
13. `AttentionTrendChart.tsx` — `accessibilityLayer` + companion table

**Step 6 — Announcement wiring**
14. Wire `useAnnounce` into mutation `onSuccess`/`onError` handlers across feature components: circle creation, member add, challenge submit, wellbeing check-in

**Step 7 — Full audit**
15. Run axe-core against all routes; verify contrast ratios on non-primary colours (accent amber on various backgrounds, focus ring on coloured backgrounds); check all remaining pages against the WCAG 2.2 AA checklist

---

## Anti-Patterns

### Anti-Pattern 1: Modal Without Focus Trap

**What people do:** Render `role="dialog"` with `aria-modal="true"` but no Tab interception — exactly the current state of `CircleFormationModal` and `AddMemberModal`.

**Why it's wrong:** `aria-modal="true"` is a hint to screen readers to ignore background content, but browsers do not enforce Tab containment. Keyboard users can still Tab out of the modal into content that is visually hidden behind the overlay.

**Do this instead:** Use `<Modal>` which embeds `useFocusTrap`. Every dialog gets Tab containment automatically.

### Anti-Pattern 2: Multiple Independent Live Regions

**What people do:** Add `aria-live="polite"` to individual component output wherever a status message appears.

**Why it's wrong:** Multiple live regions updating simultaneously cause screen readers to drop or reorder announcements unpredictably.

**Do this instead:** One `AnnounceProvider` at root. All transient status messages route through `useAnnounce()`. Inline `role="alert"` on synchronous validation errors (already correct in `Input` and `Alert`) is separate and should not change — that pattern is correct for immediate feedback.

### Anti-Pattern 3: Live Region for Route Change Announcements

**What people do:** Insert a hidden live region that announces route changes by broadcasting the page title.

**Why it's wrong:** When focus moves to `<h1>`, screen readers already announce the heading text. A simultaneous live region announcement causes double-reading.

**Do this instead:** `RouteChangeSync` moves focus to `<h1>`. Screen readers announce the heading. `document.title` is set per-page (already done). No route-change live region needed.

### Anti-Pattern 4: `outline: none` Without Replacement

**What people do:** Apply `focus:outline-none` in Tailwind to suppress the browser default ring, then forget to provide a replacement.

**Why it's wrong:** The global `*:focus-visible` in `app.css` is correct, but a component-level `focus:outline-none` (note: `focus:` not `focus-visible:`) overrides it for all focus, including keyboard focus, breaking 2.4.7.

**Do this instead:** When overriding global focus style on a component, use `focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2` — as already done correctly in `Button` and `ToggleSwitch`. Never use `focus:outline-none` without a `focus-visible:` replacement.

### Anti-Pattern 5: Omitting `accessibilityLayer` on Charts

**What people do:** Rely solely on the companion `sr-only` table and assume charts are sufficiently accessible.

**Why it's wrong:** The companion table covers screen reader users, but keyboard-only users who are not using a screen reader receive no access to the chart's data without the accessibility layer's arrow-key navigation.

**Do this instead:** Set `accessibilityLayer` on all chart components and keep the companion table. The `WellbeingChart` companion table pattern is already exemplary — replicate it in `AttentionTrendChart`.

---

## Scaling Considerations

WCAG compliance adds negligible runtime overhead. The scaling concern here is maintenance rather than performance.

| Scale | Maintenance Consideration |
|-------|--------------------------|
| Current (~25 pages, 3 layout shells) | `components/a11y/` folder; shared `Modal`; single `AnnounceProvider` — correctly scoped |
| Adding pages or new layout shells | `RouteChangeSync` must be added to each new shell; new modals use `<Modal>` automatically |
| Extracting a design system package | Move `a11y/` folder into the shared package alongside `ui/` components; consumers import from the shared package |

---

## Sources

- W3C WCAG 2.2 specification: https://www.w3.org/TR/WCAG22/
- W3C Understanding 2.4.11 Focus Not Obscured (Minimum): https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum
- W3C What's New in WCAG 2.2: https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- React Router accessibility how-to: https://reactrouter.com/how-to/accessibility
- Recharts and accessibility (official wiki): https://github.com/recharts/recharts/wiki/Recharts-and-accessibility
- Focus management in React SPAs (January 2026): https://oneuptime.com/blog/post/2026-01-15-focus-management-react-spa/view
- Accessible route change patterns (autofocus h1): https://jshakespeare.com/accessible-route-change-react-router-autofocus-heading/
- React accessibility quick wins 2025 (skip links, focus traps, live regions): https://medium.com/@sureshdotariya/accessibility-quick-wins-in-reactjs-2025-skip-links-focus-traps-aria-live-regions-c926b9e44593
- MDN React accessibility guide: https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Frameworks_libraries/React_accessibility
- Codebase inspection: `AppShell.tsx`, `Navbar.tsx`, `Input.tsx`, `Button.tsx`, `Alert.tsx`, `Card.tsx`, `Modal`-pattern components, `WellbeingChart.tsx`, `AttentionTrendChart.tsx`, `WellbeingForm.tsx`, `NotificationBell.tsx`, `KioskWarningOverlay.tsx`, `CircleFormationModal.tsx`, `AddMemberModal.tsx`, `InstitutionManagement.tsx`, `app.css` — direct inspection 2026-03-30

---

*Architecture research for: WCAG 2.2 AA remediation — React/Tailwind SPA*
*Researched: 2026-03-30*
