# Phase 22: Screen Reader & ARIA Completeness - Research

**Researched:** 2026-03-30
**Domain:** Web Accessibility (WCAG 2.2 AA), ARIA live regions, form error linking, screen reader patterns
**Confidence:** HIGH

## Summary

Phase 22 closes the remaining ARIA gaps in the application. The codebase is already in good shape: `Input.tsx` already implements `aria-describedby` linkage (SR-02 is mostly done), `UploadCV.tsx` already has `role="button"` and `aria-label` on the dropzone root (SR-03 is mostly done), `AnnounceProvider` is already built (SR-04 needs only a caller added to `NotificationBell`), and the auth forms already have correct `autocomplete` values and no paste handlers (FORM-01 and FORM-02 are already passing). The genuine gaps are: skeleton `animate-pulse` divs lack `role="status"` and `aria-busy="true"` (SR-05), and `AttentionTrendChart` has no companion data table (SR-06).

The work is targeted and surgical. Most requirements need only a single attribute or a small wrapper component added — there is no architecture to design from scratch. The largest piece is the companion data table for `AttentionTrendChart`, which needs a visually-hidden `<table>` rendered alongside the chart, or a toggle-visible table below it.

**Primary recommendation:** Audit each requirement against the code before writing anything — several requirements are already satisfied; over-engineering would introduce risk without benefit.

---

## Current State Audit (CRITICAL for planning)

This audit is the primary output of codebase research. The planner MUST read this before defining tasks.

### SR-02: aria-describedby error linking
**Status: ALREADY IMPLEMENTED in Input.tsx**

`Input.tsx` (lines 22-29) already builds `aria-describedby` referencing `${id}-error` when `error` prop is present, and sets `aria-invalid={error ? true : undefined}`. The error paragraph has `id={errorId}`. The pattern is correct.

**Remaining gap:** Forms that use raw `<input>` or `<textarea>` outside `Input.tsx` (e.g., the `resolve-notes` textarea in `AttentionDashboard.tsx`) do not have `aria-describedby`. The `Register.tsx` privacy checkbox error message (`fieldErrors.privacy`) is a plain `<p role="alert">` with no `aria-describedby` on the checkbox. These are the actual gaps.

**Files to check:** `AttentionDashboard.tsx` (resolve-notes textarea), `Register.tsx` (privacy checkbox error), any other raw inputs that bypass `Input.tsx`.

### SR-03: File drop zone accessible label
**Status: ALREADY IMPLEMENTED in UploadCV.tsx**

`UploadCV.tsx` line 142-143 already passes `role="button"` and `aria-label="Upload CV — click or drag and drop"` via `getRootProps()`. The label is meaningful and covers both the button and drag-and-drop interaction.

**Remaining gap:** None visible. Verify react-dropzone 15.x does not strip these attributes (confirmed: it merges via spread).

### SR-04: Badge count announced to screen readers
**Status: GAP — NotificationBell does not call useAnnounce**

`NotificationBell.tsx` has `unreadCount` derived from `notifications` data, but never calls `useAnnounce()`. When the count changes (from a new push notification or polling), the badge updates visually but screen readers get no announcement.

**Fix needed:** Add a `useEffect` that watches `unreadCount` and calls `announce()` from `useAnnounce` when the count changes. Use a `useRef` to track previous count so it only announces increases (new notifications arriving), not decreases (after user marks items read).

**Pattern:** Clear-then-set is already handled by `AnnounceProvider`. The message should be something like `"${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}"` or `"New notification: ${newCount} unread"`.

### SR-05: Skeleton loading states
**Status: GAP — all SkeletonCard components lack role/aria-busy**

The following files have `animate-pulse` skeleton divs with no `role="status"` or `aria-busy="true"`:
- `Dashboard.tsx` — `SkeletonCard` (wrapping div has no role)
- `ChallengerDashboard.tsx` — `SkeletonCard`
- `ImpactDashboard.tsx` — `SkeletonCard`
- `ContributorDetail.tsx` — inline `animate-pulse` block
- `ChallengeDetail.tsx` — inline `animate-pulse` block
- `InstitutionLanding.tsx` — inline `animate-pulse` block
- `InstitutionManagement.tsx` — multiple inline `animate-pulse` text elements

Note: Spinner-based loaders in `AttentionDashboard.tsx`, route guards, and `ReviewProfile.tsx` already use `role="status"` with `<span className="sr-only">Loading...</span>` — these are correct and do NOT need changes.

**Fix pattern:** Each skeleton wrapper div needs `role="status"` and `aria-busy="true"`. A `<span className="sr-only">Loading...</span>` inside provides text for screen readers (since `role="status"` has implicit `aria-live="polite"` and `aria-atomic="true"`). When loading completes and the skeleton is replaced by real content, `aria-busy` is no longer applicable (the element is replaced, not modified in-place).

**Important:** `aria-busy="true"` on a container prevents AT from announcing intermediate skeleton content changes. The correct pattern is:
```tsx
<div role="status" aria-busy="true" aria-label="Loading content">
  <span className="sr-only">Loading…</span>
  {/* skeleton children */}
</div>
```

### SR-06: AttentionTrendChart companion data table
**Status: GAP — no data table exists**

`AttentionTrendChart.tsx` renders a `recharts` `BarChart` inside a `ResponsiveContainer`. Recharts 3.x (the installed version, `^3.8.0`) enables `accessibilityLayer` by default, which adds keyboard navigation and ARIA roles, but this does NOT provide a companion data table — it makes the SVG navigable, not readable as tabular data.

A companion `<table>` is required. It should be visually available (not `sr-only`) per WCAG best practice, or at minimum keyboard-accessible. The recommended approach is a toggle: a "View as table" button that shows/hides a `<table>` below the chart.

**Data shape:** `TrendPoint = { isoWeek: string; count: number }`. The table needs columns: "Week" and "Flags". Each `isoWeek` value should be formatted the same way as the chart label (using `formatWeekLabel`).

**Recharts accessibilityLayer note:** Since recharts 3.x enables `accessibilityLayer` by default, confirm that `BarChart` in the codebase does not explicitly set `accessibilityLayer={false}`. (Current code does not — it is using defaults.) The `accessibilityLayer` adds keyboard nav but is NOT a substitute for a companion table per WCAG 1.3.1.

### FORM-01: Auth form autocomplete attributes
**Status: ALREADY CORRECT**

Audit results:
- `Login.tsx`: email input has `autoComplete="email"`, password has `autoComplete="current-password"` ✓
- `Register.tsx`: name has `autoComplete="name"`, email has `autoComplete="email"`, password has `autoComplete="new-password"`, confirm password has `autoComplete="new-password"` ✓
- `ForgotPassword.tsx`: email has `autoComplete="email"` ✓
- `ResetPassword.tsx`: both password fields have `autoComplete="new-password"` ✓

All values are valid HTML autocomplete tokens per the HTML living standard.

### FORM-02: Password inputs allow paste
**Status: ALREADY CORRECT**

Grep for `onPaste` across all `.tsx` files returns zero results. No paste handlers exist. Browser default paste behavior is preserved on all password fields. WCAG 3.3.8 (Accessible Authentication) is satisfied.

---

## Standard Stack

No new libraries needed. All required tools are already in the project.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| recharts | ^3.8.0 | Chart rendering | Already in use; accessibilityLayer enabled by default in 3.x |
| react-dropzone | ^15.0.0 | File drop zone | Already in use; passes ARIA attrs through getRootProps |
| React (useEffect, useRef, useState) | — | Badge count announcement, skeleton state | No new dependency needed |

### No New Installations Required
All requirements are satisfiable with HTML attributes, existing components, and React hooks already in the project.

---

## Architecture Patterns

### Pattern 1: Skeleton with role="status" and aria-busy

**What:** Wrapping skeleton cards in a container with `role="status"` and `aria-busy="true"` signals to AT that content is loading. The `sr-only` text gives AT users an immediate message.

**When to use:** Any `animate-pulse` skeleton that replaces real content.

**Example:**
```tsx
// Source: MDN aria-busy docs + WCAG technique
function SkeletonCard() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading content"
      className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6 animate-pulse"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-neutral-100 rounded w-1/3 mb-2" />
      <div className="h-3 bg-neutral-100 rounded w-2/3" />
    </div>
  );
}
```

**Important nuance:** When skeleton divs are rendered conditionally (`isLoading ? <SkeletonCard /> : <RealCard />`), the skeleton element is removed from the DOM entirely when loading finishes — not mutated. This means `aria-busy` transitions from `true` to "gone" rather than `false`. This is fine: the real content appearing is what AT users care about. Do NOT try to set `aria-busy="false"` on unmounting elements.

### Pattern 2: Badge count announcement via useAnnounce

**What:** `useEffect` that fires `announce()` only when unread count increases (new notifications arrived).

**When to use:** Any count badge where the underlying data can change without user action (polling, push).

**Example:**
```tsx
// Source: AnnounceProvider.tsx pattern + WCAG 4.1.3
import { useAnnounce } from "../a11y/AnnounceProvider.js";

const announce = useAnnounce();
const prevCountRef = useRef(unreadCount);

useEffect(() => {
  if (unreadCount > prevCountRef.current) {
    announce(
      `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
    );
  }
  prevCountRef.current = unreadCount;
}, [unreadCount, announce]);
```

**Critical:** Only announce on increase. Marking all as read drops count to 0 — announcing "0 unread notifications" while the user is actively reading the panel is disruptive.

### Pattern 3: AttentionTrendChart companion data table

**What:** A `<table>` rendered alongside the chart, toggled by a button, containing the same data as the chart bars.

**When to use:** Any SVG-based chart where data must be accessible to keyboard/screen reader users.

**Structure:**
```tsx
// Source: WCAG 1.3.1, recharts/recharts wiki
export function AttentionTrendChart({ data }: AttentionTrendChartProps) {
  const [showTable, setShowTable] = useState(false);
  // ...existing chart render...
  return (
    <div>
      {/* ...chart... */}
      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
        className="text-sm text-primary-700 hover:underline mt-2"
      >
        {showTable ? "Hide data table" : "View as table"}
      </button>
      {showTable && (
        <table className="mt-3 w-full text-sm border-collapse">
          <caption className="sr-only">Attention flags by week</caption>
          <thead>
            <tr>
              <th scope="col" className="text-left py-1 pr-4 font-medium text-neutral-700">Week</th>
              <th scope="col" className="text-right py-1 font-medium text-neutral-700">Flags</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.isoWeek}>
                <td className="py-1 pr-4 text-neutral-600">{formatWeekLabel(point.isoWeek)}</td>
                <td className="py-1 text-right text-neutral-900">{point.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

### Pattern 4: aria-describedby on non-Input.tsx form controls

**What:** Raw `<textarea>` and `<input>` elements not using the `Input.tsx` wrapper need manual `aria-describedby` + error paragraph with matching `id`.

**When to use:** Wherever a form field can show a validation error but does not go through `Input.tsx`.

**Example (AttentionDashboard resolve-notes textarea):**
```tsx
// Generate an id, add aria-describedby when error exists
const notesErrorId = "resolve-notes-error";

<textarea
  id="resolve-notes"
  aria-describedby={notesError ? notesErrorId : undefined}
  aria-invalid={notesError ? true : undefined}
  // ...
/>
{notesError && (
  <p id={notesErrorId} className="text-sm text-error" role="alert">
    {notesError}
  </p>
)}
```

**Note for Register.tsx privacy checkbox:** The privacy consent checkbox error (`fieldErrors.privacy`) is an `<input type="checkbox">`. Connect it to the error via `aria-describedby` on the checkbox, where the target `id` matches the error `<p>` element.

### Anti-Patterns to Avoid

- **Announcing on count decrease:** Calling `announce()` when user marks notifications read is noisy and confusing.
- **Using role="alert" for loading states:** Loading is not urgent — use `role="status"` (polite). `role="alert"` interrupts immediately and is for errors only.
- **Adding aria-busy="false" on unmount:** Do not try to set `aria-busy="false"` on skeleton elements that are being removed from the DOM. It has no effect and adds noise to code.
- **Hiding the companion table with sr-only:** The table should be visibly accessible (toggle button pattern). A fully hidden table cannot be scrolled or zoomed by low-vision users who do not use screen readers.
- **Skipping `<caption>` on data tables:** Screen readers announce the caption when navigating into a table — without it, users lose context about what the table contains.
- **Overriding accessibilityLayer in recharts 3.x:** Do not add `accessibilityLayer={false}` to the existing BarChart — it is already enabled by default in 3.x and adds keyboard nav value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Live region announcements | Custom aria-live div per component | `useAnnounce()` from AnnounceProvider | Race conditions with multiple regions; clear-then-set already solved |
| Form ID generation | Manual string IDs | `useId()` from React | Collision-safe across SSR and concurrent renders |
| Dropzone accessibility | Custom drag-and-drop with ARIA | react-dropzone getRootProps | Already handles keyboard events, file input bridging |

**Key insight:** The accessibility infrastructure (AnnounceProvider, Input with aria-describedby, Modal with focus trap) was built in phases 19-21. Phase 22 is about wiring up callers and filling attribute gaps — not rebuilding systems.

---

## Common Pitfalls

### Pitfall 1: Live Region Already Populated on Mount
**What goes wrong:** A `role="status"` or `aria-live` element that has content in it when it first appears in the DOM will NOT be announced by screen readers. The browser registers it as the "initial state."
**Why it happens:** Developers add `aria-live` to an element that already contains text.
**How to avoid:** `AnnounceProvider` already handles this correctly via the clear-then-set pattern. For skeleton states, `<span className="sr-only">Loading…</span>` is inside the skeleton which only exists when loading — it appears simultaneously with the `role="status"` element, which is fine (initial content of a new element is announced by some SRs).
**Warning signs:** Screen reader announces nothing when loading spinner appears. Test in NVDA+Chrome and VoiceOver+Safari.

### Pitfall 2: Announcing Every Count Change Including Decreases
**What goes wrong:** `useEffect` watches `unreadCount` and calls `announce()` on every change, including when the user marks items read.
**Why it happens:** Simple `useEffect` without previous-value comparison.
**How to avoid:** Use `useRef` to track previous count. Only announce when `unreadCount > prevCountRef.current`.
**Warning signs:** User marks 5 items as read and hears "0 unread notifications" immediately.

### Pitfall 3: recharts accessibilityLayer Assumption
**What goes wrong:** Assuming recharts 3.x `accessibilityLayer` satisfies the "companion data table" requirement.
**Why it happens:** The feature sounds comprehensive but only adds keyboard navigation between SVG bars — it does not render a `<table>` element.
**How to avoid:** The companion table is a separate DOM element. The `accessibilityLayer` is a bonus; the table is the requirement.
**Warning signs:** SR-06 verified by testing keyboard nav only, not by checking for `<table>` in DOM.

### Pitfall 4: Skeleton Wrapper vs. Container aria-busy
**What goes wrong:** Adding `aria-busy` to the wrong element (e.g., the page root instead of the skeleton card).
**Why it happens:** `aria-busy` on a parent suppresses ALL child announcements, which may hide error messages or other live regions.
**How to avoid:** Apply `aria-busy="true"` to the skeleton container element itself — the immediate wrapper of the loading placeholder content. Keep it scoped.
**Warning signs:** `Alert` components or other live regions inside the loading container stop being announced.

### Pitfall 5: autocomplete="off" on Password Fields
**What goes wrong:** Setting `autoComplete="off"` or omitting `autoComplete` entirely on password fields.
**Why it happens:** Developers trying to prevent password manager popups.
**How to avoid:** Use `autoComplete="current-password"` (login) or `autoComplete="new-password"` (registration, reset). Both are already correct in this codebase — do not change them.
**Warning signs:** Password manager and autofill stops working.

---

## Code Examples

### Correct skeleton with role/aria-busy
```tsx
// Source: MDN aria-busy, WCAG technique
function SkeletonCard() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="bg-white border border-neutral-200 rounded-[var(--radius-lg)] p-6 animate-pulse"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-neutral-100 rounded w-1/3 mb-2" />
    </div>
  );
}
```

### NotificationBell badge announcement
```tsx
// Source: AnnounceProvider.tsx + WCAG 4.1.3
const announce = useAnnounce();
const prevCountRef = useRef<number>(unreadCount);

useEffect(() => {
  if (unreadCount > prevCountRef.current) {
    announce(
      `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
    );
  }
  prevCountRef.current = unreadCount;
}, [unreadCount, announce]);
```

### Privacy checkbox error in Register.tsx
```tsx
// Source: HTML spec + WCAG 1.3.1
const privacyErrorId = "privacy-consent-error";

<input
  type="checkbox"
  id="privacy-consent"
  aria-describedby={fieldErrors.privacy ? privacyErrorId : undefined}
  aria-invalid={fieldErrors.privacy ? true : undefined}
  // ...existing props
/>
{fieldErrors.privacy && (
  <p id={privacyErrorId} className="text-sm text-error font-medium" role="alert">
    {fieldErrors.privacy}
  </p>
)}
```

### UploadCV dropzone verification (already correct — no change needed)
```tsx
// Current code is already correct — included for planner reference
<div
  {...getRootProps()}
  role="button"
  aria-label="Upload CV — click or drag and drop"
>
  <input {...getInputProps()} />
  {/* ...children... */}
</div>
```

### recharts with accessibilityLayer (already enabled in 3.x)
```tsx
// recharts 3.x — accessibilityLayer is true by default
// No prop needed. Do NOT add accessibilityLayer={false}.
<BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
  {/* ...axes, bars... */}
</BarChart>
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Spinner with no text, no role | Spinner with `role="status"` + `sr-only` text | Screen readers announce "Loading" |
| No aria-busy on skeletons | `role="status"` + `aria-busy="true"` on skeleton wrapper | AT knows content is pending |
| recharts 2.x — no accessibilityLayer | recharts 3.x — accessibilityLayer on by default | Keyboard nav between chart bars included automatically |
| Custom announce solutions per component | Centralized `AnnounceProvider` + `useAnnounce()` | One live region, no race conditions |
| Missing aria-describedby on errors | `Input.tsx` generates error IDs and links them | AT reads error on focus without navigation |

**Deprecated/outdated:**
- `aria-live="assertive"` for loading states: use `polite` (via `role="status"`) to avoid interrupting user.
- Separate `aria-live` regions per component: single root region via `AnnounceProvider` is the established pattern.

---

## Open Questions

1. **Should skeleton containers in ImpactDashboard, Dashboard, ChallengerDashboard be unified into a shared `<SkeletonCard>` export?**
   - What we know: Each page defines its own `SkeletonCard` locally; they are structurally similar but not identical (different placeholder heights).
   - What's unclear: Whether unifying them into a shared component (e.g., `ui/SkeletonCard.tsx`) is in scope for this phase.
   - Recommendation: Add `role="status"` and `aria-busy="true"` in-place at each usage site. Do not consolidate skeleton components in this phase — that is a refactor, not a WCAG requirement.

2. **Does the resolve-notes textarea in AttentionDashboard.tsx currently show errors?**
   - What we know: The textarea has no validation state — notes are required (button disabled when empty) but no error message is rendered.
   - What's unclear: Whether the empty-notes case needs an error message with `aria-describedby`, or whether the disabled submit button is sufficient.
   - Recommendation: If no error message is rendered, no `aria-describedby` is needed. Confirm by reading the component — the button is disabled when `notes.trim() === ""`, so an error message is not shown. SR-02 does not require adding new errors, only linking existing ones.

3. **Toggle table visibility vs. always visible for AttentionTrendChart**
   - What we know: WCAG requires the data be accessible, not that the table be hidden.
   - What's unclear: Whether the design aesthetic requires hiding the table by default.
   - Recommendation: Use a toggle button pattern (show/hide via `useState`). Set initial state to `false` (hidden). This keeps the chart view clean while making data available.

---

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: `aria-busy` attribute — aria-busy usage and loading skeleton patterns
- MDN Web Docs: ARIA `status` role — implicit aria-live=polite, aria-atomic=true
- HTML Living Standard (html.spec.whatwg.org): autocomplete field names — `email`, `current-password`, `new-password`
- WCAG 3.3.8 (W3C): Accessible Authentication — paste must not be blocked in password fields
- W3C ARIA Technique ARIA1: aria-describedby for form field descriptions

### Secondary (MEDIUM confidence)
- recharts/recharts GitHub wiki: "Recharts and accessibility" — accessibilityLayer prop, default behavior in 3.x
- Sara Soueidan: "Accessible notifications with ARIA Live Regions" — badge count announcement pattern with aria-atomic and accessible name
- TetraLogical: "Why are my live regions not working?" (2024) — pre-populated live region pitfall

### Tertiary (LOW confidence)
- recharts/recharts GitHub issue #2801 — community discussion on accessibility support status
- recharts/recharts discussion #4484 — chart accessibility goals

---

## Metadata

**Confidence breakdown:**
- SR-02 (aria-describedby): HIGH — Input.tsx source-verified; gap in Register.tsx identified by code reading
- SR-03 (dropzone label): HIGH — UploadCV.tsx source-verified; already passing
- SR-04 (badge announcement): HIGH — AnnounceProvider pattern source-verified; gap in NotificationBell confirmed by code reading
- SR-05 (skeleton role/aria-busy): HIGH — MDN and WCAG verified; all skeleton locations identified by code search
- SR-06 (companion data table): HIGH — recharts wiki verified; no table in AttentionTrendChart confirmed by code reading
- FORM-01 (autocomplete): HIGH — HTML spec verified; all auth forms confirmed correct by code reading
- FORM-02 (paste): HIGH — WCAG 3.3.8 verified; grep for onPaste returned zero results

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable domain — WCAG and ARIA specs do not change rapidly)
