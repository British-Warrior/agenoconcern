# Phase 7: UX Fixes - Research

**Researched:** 2026-03-16
**Domain:** React/Tailwind CSS frontend UX audit — navigation, dashboard data, role-conditional rendering, hover affordances, error messages, wellbeing visualisation boundary
**Confidence:** HIGH

## Summary

Phase 7 is a pure frontend patch phase — no new APIs, no schema changes, no new libraries. Every fix operates on components and hooks that already exist. The codebase is a React 19 / React Router 7 / TanStack Query v5 / Tailwind CSS 4 SPA. All fixes are surgical edits to existing files.

The 11 requirements fall into five categories: (1) navigation gaps in Navbar, (2) dashboard data deficits, (3) role-conditional rendering on the circles page, (4) missing hover/pointer affordances on interactive elements, (5) isolated bugs in error display, resolution editing, and circle formation. UX-03 and UX-04 (wellbeing score context and trajectory chart) sit at the boundary with Phase 8. The analysis below resolves that boundary clearly.

**Primary recommendation:** Treat every requirement as a targeted file edit — no new components, no new hooks, no new packages. The fixes are CSS/JSX/logic corrections to files the planner already knows about.

## Standard Stack

No new packages are needed. The full stack is already installed.

### Core (already in use)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.0.0 | UI rendering | Project foundation |
| React Router | ^7.1.0 | Routing / Link / useNavigate | All navigation |
| TanStack Query | ^5.62.0 | Server-state, hooks | All data fetching |
| Tailwind CSS | ^4.0.0 | Utility-first styling | All layout/colour |
| @radix-ui/react-accordion | ^1.2.12 | Accessible accordion | ChallengeAccordion |
| @radix-ui/react-collapsible | ^1.1.12 | Accessible collapsible | CircleWorkspaceShell brief |

### No Installation Required

All fixes use existing packages. No `npm install` needed for Phase 7.

## Architecture Patterns

### Existing Project Structure (relevant files only)

```
packages/web/src/
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx          # UX-01, UX-08 — add Dashboard + Challenges + Wellbeing links
│   │   └── AppShell.tsx        # wraps Navbar — no changes needed
│   ├── ui/
│   │   ├── Card.tsx            # UX-05 — no hover state on the element itself
│   │   └── Button.tsx          # already has hover states — reference for other elements
│   ├── circles/
│   │   ├── CircleFormationModal.tsx   # UX-11 — names already correct (read below)
│   │   └── ResolutionCard.tsx         # UX-10 — Edit Resolution button state
│   └── challenges/
│       └── TeamCompositionCard.tsx    # UX-11 — passes names from composition.contributors
├── pages/
│   ├── Dashboard.tsx           # UX-02 — add active circles, match status, earnings, hours, checkin status
│   ├── circles/
│   │   └── MyCircles.tsx       # UX-06, UX-07 — CM role-conditional content
│   └── wellbeing/
│       └── WellbeingCheckin.tsx  # (no changes — page already exists at /wellbeing/checkin)
├── hooks/
│   ├── useAuth.ts              # contributor.role available — use for CM checks
│   ├── useWellbeing.ts         # useWellbeingDue, useWellbeingHistory already exist
│   ├── useCircles.ts           # useMyCircles already exists
│   └── useImpact.ts            # useImpactSummary already exists
└── lib/
    └── constants.ts            # ROUTES — add WELLBEING_CHECKIN, CHALLENGES, CIRCLES, IMPACT
```

### Pattern 1: Role Gate — isCM check

The codebase already uses this pattern in `ChallengeFeed.tsx` and `CircleWorkspaceShell.tsx`. Apply the same pattern in `MyCircles.tsx`.

```typescript
// Source: packages/web/src/pages/challenges/ChallengeFeed.tsx (line 177)
const { contributor } = useAuth();
const isCM = contributor?.role === "community_manager" || contributor?.role === "admin";
```

### Pattern 2: Navbar Link — existing shape

```typescript
// Source: packages/web/src/components/layout/Navbar.tsx (lines 39-48)
<Link
  to="/circles"
  className="text-sm font-medium text-neutral-700 hover:text-primary-800 transition-colors no-underline"
>
  My Circles
</Link>
```

All new Navbar links must follow this exact className pattern. Dashboard and Challenges links are missing; Wellbeing is missing.

### Pattern 3: useImpactSummary for Dashboard data

`useImpactSummary` returns `ImpactSummary` which contains `totalHours`, `paidHours`, `earnings`, `totalEarningsPence`, `challengesParticipated`, and `wellbeingTrajectory`. This is the correct hook for UX-02 dashboard cards. The hook is already in `useImpact.ts`.

```typescript
// Source: packages/web/src/hooks/useImpact.ts
export function useImpactSummary() {
  return useQuery({
    queryKey: ["impact", "summary"],
    queryFn: () => paymentsApi.getImpactSummary(),
  });
}
```

### Pattern 4: useWellbeingDue for checkin status

Already used in Dashboard. `wellbeingDue.data?.due` is boolean. The banner only shows when `due === true`. UX-02 requires showing checkin status regardless — show "Up to date" when `due === false` and "Due" when `due === true`.

### Pattern 5: Hover state pattern — Tailwind

The project uses `hover:bg-primary-700`, `hover:border-primary-300`, `hover:shadow-sm`, and `cursor-pointer` classes. Interactive elements without `cursor-pointer` violate UX-05. Buttons that are not `<button>` elements using the `Button` component need manual `cursor-pointer`.

### Anti-Patterns to Avoid

- **Do not add a charting library for UX-04:** UX-04 belongs to Phase 8 (Wellbeing Visualisation). See boundary analysis below.
- **Do not add new routes:** `/wellbeing/checkin` already exists in `App.tsx`. UX-08 only needs a Navbar link.
- **Do not change the `CircleFormationModal` member name logic:** The names come from `composition.contributors.map((c) => c.name)` in `TeamCompositionCard.tsx`. The `TeamComposition` type guarantees `name: string` on each contributor. UX-11 likely manifests as a data issue (stale data or the wrong composition selected), not a code bug in the modal itself. Investigate at runtime before assuming a code change is needed.
- **Do not fetch additional data for UX-06:** `useMyCircles` at `/api/circles` returns all circles the authenticated user belongs to. For a CM, this already includes circles they formed (they are added as a member automatically on creation). Verify this API behaviour before adding a separate "CM circles" query.

## UX-03 / UX-04 Phase Boundary Decision

**UX-03:** "Wellbeing scores display with context (score/max, colour band: low/average/high per UK norms, trend direction)"

**UX-04:** "Wellbeing trajectory shows as a line chart with SWEMWBS and UCLA series over time"

**Current state:** `ImpactDashboard` already shows a plain text list of `WellbeingTrajectoryPoint` values in `WellbeingSection`. No colour bands, no trend direction, no line chart.

**Boundary ruling:**
- UX-03 (colour bands + score/max + trend direction) = lightweight data annotation. No charting library required. Can be implemented in the existing `WellbeingSection` in `ImpactDashboard` using UK norm thresholds as constants and simple Tailwind colour classes. **Belongs in Phase 7.**
- UX-04 (line chart) = requires a charting library (Recharts or similar). Installing and integrating a chart library is a meaningful scope addition. **Belongs in Phase 8 (Wellbeing Visualisation).** The existing text list in `ImpactDashboard` satisfies the "trajectory exists" requirement until Phase 8 replaces it.

**UK norm thresholds (MEDIUM confidence — from SWEMWBS/UCLA published scoring guides):**
- SWEMWBS: Low < 19, Average 19–26, High > 26 (7-item short form, range 7–35)
- UCLA (3-item): Low loneliness < 5, Average 5–7, High loneliness > 7 (range 3–12, lower = less lonely)

These constants should live in a `lib/wellbeing-norms.ts` file and be imported by the display component.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible link routing | Custom anchor tags | React Router `<Link>` | Handles SPA navigation, active state, history |
| Loading/pending UI | Custom spinner component | Inline SVG spinner (already in codebase) or copy existing Spinner | Already standardised across pages |
| Role detection | Custom role service | `useAuth()` → `contributor.role` | Single source of truth, already used in ChallengeFeed |
| Colour band classification | Inline ternaries | `lib/wellbeing-norms.ts` constants + pure function | Reused in Phase 8; testable |
| Error message sanitisation | Custom error parser class | Read `ApiResponseError.data.error` (already the message field) | `ApiResponseError` already strips technical details if API returns a clean string |

**Key insight:** The API client (`client.ts`) already throws `ApiResponseError` with `data.error` as the human-readable message string. UX-09 is mainly about ensuring UI components display `error.message` or `error.data.error` rather than `JSON.stringify(error)` or raw UUID values that slip through from the API's error body. Audit each error boundary.

## Common Pitfalls

### Pitfall 1: Navbar Link Coverage
**What goes wrong:** Adding a Dashboard link to the navbar but only showing it when `isAuthenticated` — then discovering it's missing on pages that render before auth resolves (loading state).
**Why it happens:** `isAuthenticated` is false during the initial `useQuery(["me"])` fetch.
**How to avoid:** Wrap new nav links in the same `{isAuthenticated ? (...) : (...)}` block already in Navbar. Dashboard, Challenges, Circles, Impact, Wellbeing, and Logout must all be inside the `isAuthenticated` branch.
**Warning signs:** Nav links disappear on hard refresh.

### Pitfall 2: CM Circles — API Coverage
**What goes wrong:** Assuming `getMyCircles` only returns circles where the user is a member, not circles they created as CM.
**Why it happens:** The API endpoint at `/api/circles` may JOIN on `circle_members` only, missing CM-created circles if the CM was not added as a member.
**How to avoid:** Verify the server-side `GET /api/circles` query before writing the frontend fix. If the API is already inclusive (CM added as first member on circle creation), no frontend change needed beyond UX-07 copy. If the API is exclusive, a second query (`GET /api/circles?created_by=me`) may be needed — but check the API first.
**Warning signs:** CM sees an empty circles page even though they formed circles.

### Pitfall 3: Dashboard Data Loading Cascade
**What goes wrong:** Adding `useImpactSummary` and `useMyCircles` to Dashboard causes three simultaneous loading states with separate spinners — poor UX.
**Why it happens:** Each hook renders its own loading indicator.
**How to avoid:** Use a single top-level loading state: show skeleton cards while any of the queries is loading. The `ImpactDashboard` page has a good `SkeletonCard` pattern to copy.
**Warning signs:** Multiple spinners visible at once on Dashboard.

### Pitfall 4: Edit Resolution Button — Disabled vs Hidden
**What goes wrong:** The "Edit Resolution" button in `ResolutionCard.tsx` is currently rendered only when `isMember && !isChallenger && (circleStatus === "active" || circleStatus === "submitted")`. UX-10 says it should have clear active/disabled states.
**Why it happens:** The button is conditionally rendered rather than conditionally disabled.
**How to avoid:** Keep the conditional render for status-gating. For UX-10, the issue is that when the button IS shown, there is no `disabled` attribute or visual state when the form is already open (`showEditForm === true`). Add `disabled={showEditForm}` and an `opacity-50 cursor-not-allowed` class when `showEditForm` is true.
**Warning signs:** User clicks "Edit Resolution" when form is already open — button appears active but does nothing.

### Pitfall 5: UX-11 Member Name Investigation
**What goes wrong:** Circle formation modal displays wrong names (e.g., IDs instead of names, or mismatched names).
**Why it happens:** `TeamCompositionCard` passes `composition.contributors.map((c) => c.name)` — if the API returns `name: ""` or a UUID in the name field for some contributors, it appears in the modal.
**How to avoid:** Before writing any code, inspect the network response for `/api/challenges/:id/team-compositions` or similar. If the API returns correct names, the frontend is already correct and no change is needed. If names are missing, the fix is in the API layer, not the modal.
**Warning signs:** Modal shows empty strings or UUID-format strings as member names.

### Pitfall 6: Wellbeing Check-in Nav Link — Route Constant Missing
**What goes wrong:** Adding `/wellbeing/checkin` as a hardcoded string in Navbar rather than a `ROUTES` constant.
**Why it happens:** `ROUTES` in `lib/constants.ts` does not include `WELLBEING_CHECKIN`, `CHALLENGES`, `CIRCLES`, or `IMPACT`. Developers copy the pattern from existing links but add the path inline.
**How to avoid:** Add these to `ROUTES` first, then use the constant in Navbar and wherever else these paths appear.

## Code Examples

### Navbar — add missing authenticated links
```typescript
// Pattern from packages/web/src/components/layout/Navbar.tsx (lines 39-50)
// Add before "My Circles":
<Link
  to={ROUTES.DASHBOARD}
  className="text-sm font-medium text-neutral-700 hover:text-primary-800 transition-colors no-underline"
>
  Dashboard
</Link>
<Link
  to={ROUTES.CHALLENGES}
  className="text-sm font-medium text-neutral-700 hover:text-primary-800 transition-colors no-underline"
>
  Challenges
</Link>
// Add after "My Impact":
<Link
  to={ROUTES.WELLBEING_CHECKIN}
  className="text-sm font-medium text-neutral-700 hover:text-primary-800 transition-colors no-underline"
>
  Wellbeing
</Link>
```

### ROUTES constants — add missing entries
```typescript
// packages/web/src/lib/constants.ts
export const ROUTES = {
  LANDING: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  PHONE_LOGIN: "/phone-login",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  DASHBOARD: "/dashboard",
  CHALLENGES: "/challenges",
  CIRCLES: "/circles",
  IMPACT: "/impact",
  WELLBEING_CHECKIN: "/wellbeing/checkin",
  PRIVACY: "/privacy",
  COOKIES: "/cookies",
} as const;
```

### Dashboard — add data cards using existing hooks
```typescript
// packages/web/src/pages/Dashboard.tsx — add to imports:
import { useImpactSummary } from "../hooks/useImpact.js";
import { useMyCircles } from "../hooks/useCircles.js";

// Inside component:
const { data: summary, isLoading: summaryLoading } = useImpactSummary();
const { data: circles, isLoading: circlesLoading } = useMyCircles();
const activeCircles = circles?.filter(c => c.status === "active") ?? [];
const openMatches = summary?.challengesParticipated.filter(c => c.status === "open") ?? [];
```

### MyCircles — CM role gate
```typescript
// packages/web/src/pages/circles/MyCircles.tsx — add to imports:
import { useAuth } from "../../hooks/useAuth.js";

// Inside MyCircles component:
const { contributor } = useAuth();
const isCM = contributor?.role === "community_manager" || contributor?.role === "admin";

// Replace the empty state copy:
{isCM ? (
  <p className="text-sm text-neutral-500">
    You haven't formed any Circles yet. Post a challenge and form a Circle from interested contributors.
  </p>
) : (
  <p className="text-sm text-neutral-500">
    Express interest in challenges to get started.
  </p>
)}
```

### Wellbeing norm constants
```typescript
// New file: packages/web/src/lib/wellbeing-norms.ts
// SWEMWBS 7-item short form: range 7-35
export const SWEMWBS_NORMS = {
  low: { max: 18, label: "Low", color: "text-red-600" },
  average: { min: 19, max: 26, label: "Average", color: "text-amber-600" },
  high: { min: 27, label: "High", color: "text-green-600" },
} as const;

// UCLA 3-item: range 3-12; lower = less lonely
export const UCLA_NORMS = {
  low: { max: 4, label: "Low loneliness", color: "text-green-600" },
  average: { min: 5, max: 7, label: "Average", color: "text-amber-600" },
  high: { min: 8, label: "High loneliness", color: "text-red-600" },
} as const;

export function swemwbsBand(score: number): typeof SWEMWBS_NORMS[keyof typeof SWEMWBS_NORMS] {
  if (score <= 18) return SWEMWBS_NORMS.low;
  if (score <= 26) return SWEMWBS_NORMS.average;
  return SWEMWBS_NORMS.high;
}

export function uclaBand(score: number): typeof UCLA_NORMS[keyof typeof UCLA_NORMS] {
  if (score <= 4) return UCLA_NORMS.low;
  if (score <= 7) return UCLA_NORMS.average;
  return UCLA_NORMS.high;
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Dashboard shows only a "Browse Challenges" card | Dashboard shows active circles, match status, earnings, hours, wellbeing status | UX-02 |
| Navbar missing Dashboard, Challenges, Wellbeing links | Full navigation bar | UX-01, UX-08 |
| MyCircles shows contributor copy to all roles | Role-conditional copy for CM vs contributor | UX-06, UX-07 |
| WellbeingSection shows raw score numbers in a list | Score + colour band + trend direction (Phase 7); line chart (Phase 8) | UX-03 (Phase 7), UX-04 (Phase 8) |

**Not deprecated — still current:**
- `useMyCircles`, `useImpactSummary`, `useWellbeingDue`, `useWellbeingHistory` — all correct, use as-is
- TanStack Query v5 `useQuery`/`useMutation` API — stable, matches current usage throughout

## Open Questions

1. **Does `GET /api/circles` include CM-formed circles?**
   - What we know: `CircleListItem` type has no `createdBy` field; `useMyCircles` returns the full list
   - What's unclear: Whether the server JOINs on `circle_members` only (excludes CM if not a member) or also on `circles.createdBy`
   - Recommendation: Inspect server handler before planning UX-06 task. If exclusive, the plan needs a server-side fix or a second endpoint. If inclusive, UX-06 is satisfied by UX-07 (copy change only).

2. **Is UX-11 a frontend bug or a data bug?**
   - What we know: `TeamCompositionCard` passes `composition.contributors.map((c) => c.name)` to `CircleFormationModal`; `TeamComposition.contributors` has `name: string` in the type
   - What's unclear: Whether the API actually populates `name` correctly for all contributors in team compositions
   - Recommendation: Check a network response for the team compositions endpoint before coding. If data is correct, no code change needed.

3. **UX-09: Where do raw UUIDs appear?**
   - What we know: `ApiResponseError` extracts `data.error` as the message; `CircleWorkspace.tsx` checks for "403" string in error message
   - What's unclear: Which specific error paths currently expose UUID or technical details
   - Recommendation: Walk through error paths for circle 403, failed resolution submit, failed interest toggle. Check what the API actually sends in `error.data.error`.

## Sources

### Primary (HIGH confidence)
- Codebase — `packages/web/src/` — direct code inspection of all affected files
- `packages/shared/src/types/` — type definitions for all shared interfaces
- `packages/web/src/styles/app.css` — Tailwind 4 theme tokens and design system

### Secondary (MEDIUM confidence)
- SWEMWBS scoring guidance (published by NHS/WEMWBS consortium) — norm thresholds for UX-03
- UCLA Loneliness Scale 3-item scoring literature — norm thresholds for UX-03

### Tertiary (LOW confidence)
- None required — all findings are from direct codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — direct inspection of package.json and all component files
- Architecture: HIGH — all patterns verified from existing codebase code
- Pitfalls: HIGH for frontend patterns; MEDIUM for API behaviour (UX-06 circle query, UX-11 name data) — requires runtime verification
- Wellbeing norms: MEDIUM — published scoring guides exist but specific thresholds not verified against a primary source in this session

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable codebase; no moving external dependencies)
