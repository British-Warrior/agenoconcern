# Phase 11: Kiosk Mode and Institutional Pages - Research

**Researched:** 2026-03-21
**Domain:** React URL-param driven mode context, idle-timer auto-logout, TanStack Query v5 cache clearing, Drizzle ORM new table + slug pattern, Express public routes
**Confidence:** HIGH

## Summary

This phase adds two tightly coupled features: a kiosk mode (URL-param-activated UI with auto-logout) and public institutional landing pages (`/i/[slug]`). Both features are pure extensions to the existing stack — no new paradigms are required. The existing React Router v7 `useSearchParams` / `useParams` hooks, TanStack Query v5 `queryClient.clear()`, and the existing `POST /api/auth/logout` server endpoint are all the infrastructure needed.

Kiosk mode is implemented as a React Context that reads `?kiosk=true` from the URL on mount and distributes the flag down to the AppShell and Navbar. The inactivity timer is implemented with `react-idle-timer` v5 (peer dep `react >= 16`, compatible with React 19), which provides `useIdleTimer` with `timeout`, `promptBeforeIdle`, `onPrompt`, and `onIdle` callbacks. The 60-second warning countdown is derived by polling `getRemainingTime()` inside `onPrompt`. Full session cleanup on kiosk logout requires: (1) `POST /api/auth/logout` to clear server-side httpOnly cookies, then (2) `queryClient.clear()` to wipe all TanStack Query in-memory cache.

Institutional landing pages require a new `institutions` table with a `slug` unique column, a public Express route at `GET /api/institutions/:slug` returning name, description, and aggregate impact stats, and a React route at `/i/:slug` accessible without authentication. The data model follows the `challengerOrganisations` pattern from Phase 9 exactly: a simple `pgTable` with no role/auth coupling.

**Primary recommendation:** Use `react-idle-timer` v5 (no new paradigms); drive kiosk mode from a `KioskContext` that reads `?kiosk=true` at mount; use `queryClient.clear()` + `POST /api/auth/logout` in sequence for kiosk logout; follow `challengerOrganisations` as the Institution table template; add `/i/:slug` as a public route outside `ProtectedRoute`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-idle-timer` | 5.7.2 | Idle detection with `promptBeforeIdle`, `onPrompt`, `onIdle`, `getRemainingTime` | Purpose-built idle timer for React; 560k weekly downloads; peer dep `react >= 16` (compatible with React 19); last publish June 2023 but stable and widely used |
| `react-router` (already installed) | ^7.1.0 | `useSearchParams` for `?kiosk=true`, `useParams` for `/i/:slug` | Already installed; no new dep |
| `@tanstack/react-query` (already installed) | ^5.62.0 | `queryClient.clear()` for complete cache wipe on kiosk logout | Already installed |
| `drizzle-orm` (already installed) | ^0.38.0 | New `institutions` table with slug | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` (already installed) | ^3.24.0 | Validate institution creation/upsert (admin path, future) | Consistent with existing server validation pattern |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-idle-timer` | Custom `useEffect` + `addEventListener` on `mousemove`, `keydown`, `touchstart`, `scroll` | Hand-rolling misses edge cases (cross-tab sync, document visibility, passive event listener setup, cleanup); react-idle-timer handles these; for a kiosk with 10-min timeout custom is viable but adds maintenance burden |
| `queryClient.clear()` | `queryClient.removeQueries()` per key | `clear()` is the canonical "wipe everything on logout" method per TanStack docs; no need to enumerate keys |
| React Context for kiosk flag | Zustand | Context is sufficient for a single boolean flag; no new dependency needed |

**Installation:**
```bash
pnpm --filter @indomitable-unity/web add react-idle-timer
```
(No other new packages required.)

---

## Architecture Patterns

### Recommended Project Structure

```
packages/web/src/
├── contexts/
│   └── KioskContext.tsx        # Reads ?kiosk=true; provides isKiosk boolean
├── hooks/
│   └── useKioskTimer.ts        # Wraps useIdleTimer; calls logout + queryClient.clear()
├── pages/
│   └── institution/
│       └── InstitutionLanding.tsx  # /i/:slug public page

packages/server/src/
├── db/
│   └── schema.ts               # Add institutions table
├── routes/
│   └── institutions.ts         # GET /api/institutions/:slug (public)
└── express-app.ts              # Wire institutions route
```

### Pattern 1: KioskContext — URL-param-driven mode flag

**What:** A React Context that reads `?kiosk=true` once at mount and exposes `isKiosk: boolean`. Downstream components (AppShell, Navbar) consume the context to conditionally render kiosk UI variants.

**When to use:** Any component that needs to know if kiosk mode is active.

```typescript
// Source: React docs (createContext pattern), codebase useAuth.ts pattern
import { createContext, useContext, useMemo } from "react";
import { useSearchParams } from "react-router";

interface KioskContextValue {
  isKiosk: boolean;
}

const KioskContext = createContext<KioskContextValue>({ isKiosk: false });

export function KioskProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  // Read once; stored in context so child re-renders don't re-parse URL
  const isKiosk = searchParams.get("kiosk") === "true";
  const value = useMemo(() => ({ isKiosk }), [isKiosk]);
  return <KioskContext.Provider value={value}>{children}</KioskContext.Provider>;
}

export function useKiosk() {
  return useContext(KioskContext);
}
```

**Important:** `KioskProvider` must sit inside `<BrowserRouter>` (because `useSearchParams` requires a Router ancestor) but can wrap `AuthProvider` or be a sibling. Looking at `App.tsx`, the cleanest placement is wrapping the `<Routes>` subtree.

### Pattern 2: useKioskTimer — idle detection + countdown

**What:** Thin wrapper around `useIdleTimer` from `react-idle-timer`. Sets `timeout` (10 min) and `promptBeforeIdle` (60 s). On `onPrompt` starts a countdown. On `onIdle` calls kiosk logout (server + cache clear).

**When to use:** Mounted only when `isKiosk === true`. Unmount stops timers automatically.

```typescript
// Source: idletimer.dev/docs/api/use-idle-timer
import { useIdleTimer } from "react-idle-timer";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { logout as apiLogout } from "../api/auth.js";

const IDLE_TIMEOUT_MS = 10 * 60 * 1000;   // 10 minutes
const PROMPT_BEFORE_MS = 60 * 1000;        // 60-second warning

export function useKioskTimer(enabled: boolean) {
  const queryClient = useQueryClient();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performLogout = useCallback(async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    try {
      await apiLogout();
    } finally {
      queryClient.clear();
      // navigate to landing — caller provides navigate function or reads window.location
      window.location.href = "/";
    }
  }, [queryClient]);

  const { reset } = useIdleTimer({
    disabled: !enabled,
    timeout: IDLE_TIMEOUT_MS,
    promptBeforeIdle: PROMPT_BEFORE_MS,
    onPrompt: () => {
      setShowWarning(true);
      setSecondsLeft(60);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }, 1000);
    },
    onIdle: () => {
      void performLogout();
    },
    throttle: 500,
    events: ["mousemove", "keydown", "touchstart", "scroll", "click"],
  });

  // Dismiss warning on activity reset
  const dismissWarning = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setShowWarning(false);
    reset();
  }, [reset]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return { showWarning, secondsLeft, dismissWarning, performLogout };
}
```

### Pattern 3: Kiosk logout — server cookie + cache clear

**What:** Two-step operation: (1) `POST /api/auth/logout` clears httpOnly cookies server-side, (2) `queryClient.clear()` wipes all TanStack Query in-memory cache. Order matters: clear cookies first so any in-flight refetches fail cleanly.

**Why two steps:** The `access_token` and `refresh_token` are httpOnly cookies — they are inaccessible to JS. Only the server can clear them. `queryClient.clear()` handles the client-side cache so no private data (user profile, challenges, circles) remains in memory for the next user.

```typescript
// Source: TanStack Query v5 docs, existing auth.service.ts clearAuthCookies
await apiLogout();          // POST /api/auth/logout → res.clearCookie(...)
queryClient.clear();        // Wipes ALL queries from in-memory cache
window.location.href = "/"; // Hard navigate ensures React state is also reset
```

**Note:** `window.location.href = "/"` (not `navigate("/")`) is intentional for kiosk — it forces a full page reload which destroys all React state, not just React Query cache.

### Pattern 4: Institution table — Drizzle ORM

**What:** New `institutions` table following the `challengerOrganisations` pattern exactly. Adds a `slug` varchar column with `.unique()`.

```typescript
// Source: existing schema.ts pattern + Drizzle docs for unique()
export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description").notNull().default(""),
  city: varchar("city", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Slug format:** lowercase alphanumeric + hyphens (e.g., `brixton-library`). Validated server-side with a regex before insert.

**Migration:** Phase 9 confirmed that manually applied targeted SQL is the working migration pattern because the Drizzle journal was empty while the DB had existing tables. For Phase 11, the same targeted SQL approach applies: write a standalone migration script for the `institutions` table, apply it directly (not via `drizzle-kit migrate`).

### Pattern 5: Public institution route — Express

**What:** Public `GET /api/institutions/:slug` endpoint (no auth middleware). Returns name, description, and aggregate impact stats. Aggregate stats query uses SQL `COUNT` and `SUM` over `circles`, `circleMembers`, and `contributorHours` for rows linked to the institution.

**How to link circles/contributors to an institution:** Phase 11 introduces an opt-in institutional affiliation. The simplest model for aggregate stats is a join table `institution_contributors` (contributor_id, institution_id), or, for the MVP stat aggregate, querying all contributors where a future `institutionId` FK column exists on `contributors` or `contributorProfiles`. This is an **open question** (see below).

### Pattern 6: INST-03 — Kiosk auto-activation from institutional page

**What:** The institutional landing page (`/i/:slug`) navigates to the app login with `?kiosk=true` appended. The "Get Started" CTA is a link to `/login?kiosk=true&returnUrl=/dashboard`. `KioskContext` reads `?kiosk=true` anywhere in the app and activates kiosk mode.

**Important:** `?kiosk=true` must persist through navigation. The cleanest approach is to keep it in the URL at all times while in kiosk mode. Since React Router's `useSearchParams` reads the current URL, passing `?kiosk=true` through each navigation (or using `navigate(path + "?kiosk=true")`) is necessary. A simpler alternative: `KioskContext` stores the flag in module-level state once detected, ignoring subsequent URL param absence. This avoids threading `?kiosk=true` through every `navigate()` call.

**Recommended approach (simpler):** Once `?kiosk=true` is detected, persist the boolean in a `useRef` or a module-level variable inside `KioskContext` so it remains active even after the URL param disappears on navigation.

```typescript
// Persist kiosk flag in module-level ref to survive navigation
let _kioskActivated = false;

export function KioskProvider({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams();
  if (searchParams.get("kiosk") === "true") _kioskActivated = true;
  const isKiosk = _kioskActivated;
  // ...
}
```

### Anti-Patterns to Avoid

- **Using `queryClient.invalidateQueries()` for kiosk logout:** Invalidation triggers refetches on active queries, potentially exposing data briefly. Use `queryClient.clear()` instead.
- **Using `navigate("/")` for kiosk logout:** React Router navigation preserves React state in memory (useState, context). Use `window.location.href = "/"` for a hard reset.
- **Mounting the idle timer unconditionally:** Mount `useKioskTimer` only when `isKiosk === true`. Mounting it globally adds overhead and warning dialogs to non-kiosk sessions.
- **Storing `?kiosk=true` in localStorage:** If the browser is not fully cleared between sessions, localStorage can leak mode flags across users. Use module-level state or sessionStorage maximum.
- **Hardcoding slug-based routes:** Follow Phase 7 plan 01's ROUTES constant pattern. Add `INSTITUTION: (slug: string) => \`/i/\${slug}\`` to the ROUTES constants.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idle detection | Custom `mousemove`/`keydown` event listeners with `setTimeout` | `react-idle-timer` v5 `useIdleTimer` | Custom solutions miss: document visibility changes, cross-tab coordination, passive event listener performance, cleanup on unmount, throttle handling |
| Countdown timer management | Manual `setInterval` with complex state | `useIdleTimer`'s `getRemainingTime()` polled with a simple `setInterval` once in `onPrompt` | Polling `getRemainingTime()` is simpler than deriving countdown from raw timer state |
| Complete cache wipe | Iterating over query keys | `queryClient.clear()` | Single method, handles all registered queries and mutation cache |

**Key insight:** The idle detection edge cases (tab hidden, page reload, multi-tab) are solved problems in `react-idle-timer`. The custom countdown polling pattern (poll `getRemainingTime` every second inside `onPrompt`) is the recommended pattern from react-idle-timer docs.

---

## Common Pitfalls

### Pitfall 1: Partial cache clear on kiosk logout
**What goes wrong:** Developer calls `queryClient.setQueryData(["me"], null)` + `queryClient.invalidateQueries()` (the pattern used in `useAuth.ts` for normal logout) instead of `queryClient.clear()`. Challenge, circle, and impact data remains in cache for the next user.
**Why it happens:** Copying the existing logout pattern without realising normal logout only clears the `["me"]` key.
**How to avoid:** Kiosk logout must call `queryClient.clear()` to wipe ALL keys. Normal logout can remain selective; kiosk logout must be total.
**Warning signs:** Network tab shows no refetch requests when navigating back to the app as a different user.

### Pitfall 2: Kiosk flag disappears on navigation
**What goes wrong:** `KioskContext` re-reads `?kiosk=true` from URL on every render. After the first `navigate()` call (e.g., to `/login`), the search param is gone and `isKiosk` becomes `false`. Idle timer disarms.
**Why it happens:** React Router navigation replaces the URL; `?kiosk=true` is lost unless explicitly carried forward.
**How to avoid:** Persist the flag in module-level state once detected (see Pattern 6 above). Alternatively, carry `?kiosk=true` through every `navigate()` call — but this is error-prone across many navigation points.
**Warning signs:** Idle timer disarms immediately after login; "End Session" button disappears after login redirect.

### Pitfall 3: `clearAuthCookies` path mismatch
**What goes wrong:** `clearCookie("refresh_token")` fails silently because the `path` option doesn't match the path used when setting the cookie.
**Why it happens:** `refresh_token` was set with `path: "/api/auth/refresh"` (see `auth.service.ts` line 73). Calling `clearCookie("refresh_token")` without specifying the same path leaves the cookie intact.
**How to avoid:** The existing `clearAuthCookies` function already handles this correctly — it calls `res.clearCookie("refresh_token", { path: "/api/auth/refresh" })`. The kiosk logout endpoint must call `clearAuthCookies(res)` (not `res.clearCookie()` directly).
**Warning signs:** After kiosk logout, a `POST /api/auth/refresh` with the stale refresh cookie succeeds and re-establishes a session.

### Pitfall 4: Slug collision and URL injection
**What goes wrong:** Slug is accepted from user input without sanitisation and stored as-is. Malformed slugs (spaces, uppercase, `/`, `.`) break the URL pattern or cause SQL confusion.
**Why it happens:** Trusting client input for slug generation.
**How to avoid:** Validate slug server-side with `/^[a-z0-9-]{2,100}$/` regex before insert. Reject with 400 if invalid. Return 404 for unknown slugs (never expose existence).
**Warning signs:** `GET /api/institutions/../../etc` returns unexpected results.

### Pitfall 5: Institutional stats query performance
**What goes wrong:** Aggregate stats query does a full table scan of `contributorHours` without any institution-scoping mechanism, returning global totals.
**Why it happens:** The `contributorHours` table has no institution FK. Without a join table or FK, there is no way to scope stats to a specific institution's users.
**How to avoid:** Decide the affiliation model before writing the stats query (see Open Questions). The simplest MVP: seed a few institutions with placeholder stats as `jsonb` columns, deferring live aggregation.
**Warning signs:** All institution pages show the same total counts.

### Pitfall 6: react-idle-timer not disabled for non-kiosk
**What goes wrong:** `useIdleTimer` is mounted unconditionally. After 10 minutes of inactivity on any normal user session, the kiosk logout fires.
**Why it happens:** Forgetting to pass `disabled: !isKiosk` to `useIdleTimer` or wrapping the component/hook call in a conditional.
**How to avoid:** Always pass `disabled: !enabled` to `useIdleTimer`, and only mount the component that calls `useKioskTimer` when `isKiosk === true`.

---

## Code Examples

Verified patterns from official sources and codebase:

### Reading search params (already in codebase)
```typescript
// Source: packages/web/src/pages/Login.tsx (existing pattern)
import { useSearchParams } from "react-router";
const [searchParams] = useSearchParams();
const isKiosk = searchParams.get("kiosk") === "true";
```

### useIdleTimer with promptBeforeIdle
```typescript
// Source: idletimer.dev/docs/api/use-idle-timer
import { useIdleTimer } from "react-idle-timer";

const { reset, getRemainingTime } = useIdleTimer({
  timeout: 10 * 60 * 1000,
  promptBeforeIdle: 60 * 1000,
  onPrompt: () => { /* show countdown UI */ },
  onIdle: () => { /* logout */ },
  throttle: 500,
  disabled: false,
});
```

### queryClient.clear() — complete cache wipe
```typescript
// Source: TanStack Query v5 docs (github.com/TanStack/query/discussions/3280)
// Must use useQueryClient() to get the same instance as QueryClientProvider
const queryClient = useQueryClient();
await apiLogout();    // clear server cookies first
queryClient.clear();  // wipe ALL in-memory cache
window.location.href = "/"; // hard reset React state
```

### Dynamic slug route (existing useParams pattern in codebase)
```typescript
// Source: packages/web/src/pages/challenger/ChallengeDetail.tsx pattern
// Route definition: <Route path="/i/:slug" element={<InstitutionLanding />} />
import { useParams } from "react-router";
const { slug } = useParams<{ slug: string }>();
```

### Drizzle institution table with unique slug
```typescript
// Source: existing schema.ts pattern + Drizzle docs
export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### ROUTES constant extension (per Phase 7 constraint)
```typescript
// Source: packages/web/src/lib/constants.ts (existing pattern)
export const ROUTES = {
  // ... existing routes
  INSTITUTION: (slug: string) => `/i/${slug}` as const,
  INSTITUTION_BASE: "/i",
} as const;
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom idle timer with `setTimeout` + `addEventListener` | `react-idle-timer` `useIdleTimer` hook | ~2018 | Handles visibility, throttle, cross-tab |
| `queryClient.invalidateQueries()` on logout | `queryClient.clear()` for full wipe | TanStack Query v5 (2023) | One call clears everything |
| React Router v5 `useHistory` | React Router v7 `useNavigate` + `useSearchParams` | 2022 (v6), 2024 (v7) | Hooks-first API; already in use in codebase |

**Deprecated/outdated:**
- `react-idle-timer` `promptTimeout` prop: deprecated in v5 in favour of `promptBeforeIdle` (both work until v6.0.0)
- `queryClient.invalidateQueries({ queryKey: [] })` for full wipe: technically works but triggers refetches; `clear()` is correct for logout

---

## Open Questions

1. **How are contributors linked to institutions for aggregate stats (INST-02)?**
   - What we know: `contributorHours`, `circles`, and `circleMembers` tables exist. The `institutions` table is new. There is no FK from contributors to institutions in the current schema.
   - What's unclear: Should institution affiliation be: (a) a new `institution_id` FK on `contributors`/`contributorProfiles`, (b) a join table `institution_contributors`, or (c) MVP placeholder stats stored as `jsonb` on the `institutions` table itself?
   - Recommendation: For Phase 11 MVP, use option (c) — store `statsJson: jsonb` on `institutions` containing `{ contributors: N, challenges: N, hours: N }` set by seed/admin. Defers live aggregation to a future phase. This avoids schema complexity and unblocks the landing page.

2. **Where does `KioskProvider` sit in the React tree?**
   - What we know: `useSearchParams` requires a Router ancestor. `App.tsx` has `<BrowserRouter>` wrapping everything. `KioskProvider` must be inside `<BrowserRouter>` but ideally wraps `<Routes>` so it can read the current URL's search params.
   - What's unclear: If `KioskProvider` is above `<Routes>`, it reads the initial URL once. If `?kiosk=true` is only present on the `/i/:slug` page's CTA link (navigating to `/login?kiosk=true`), it won't be present when `KioskProvider` mounts.
   - Recommendation: Use module-level flag persistence (Pattern 6) so `KioskProvider` correctly activates on any navigation that carries `?kiosk=true`, not just the initial load.

3. **Should the kiosk auto-logout endpoint be a distinct server route from normal logout?**
   - What we know: The existing `POST /api/auth/logout` calls `clearAuthCookies(res)` which correctly clears both cookies with proper path options.
   - What's unclear: Should kiosk logout call the same endpoint or a dedicated `/api/auth/kiosk-logout`?
   - Recommendation: Reuse `POST /api/auth/logout`. The client-side difference (calling `queryClient.clear()` instead of selective invalidation) is enough to distinguish kiosk from normal logout. No new endpoint needed.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `packages/web/src/hooks/useAuth.ts` — confirmed logout mutation pattern, `queryClient.setQueryData`/`invalidateQueries`
- Codebase: `packages/web/src/pages/Login.tsx` — confirmed `useSearchParams` pattern in use
- Codebase: `packages/server/src/services/auth.service.ts` — confirmed `clearAuthCookies` path options
- Codebase: `packages/server/src/db/schema.ts` — confirmed `challengerOrganisations` table pattern to follow
- Codebase: `packages/web/src/lib/constants.ts` — confirmed ROUTES constants pattern
- Codebase: `packages/web/src/main.tsx` — confirmed `queryClient` instance location, `QueryClientProvider`

### Secondary (MEDIUM confidence)
- [TanStack Query GitHub Discussion #3280](https://github.com/TanStack/query/discussions/3280) — `queryClient.clear()` is the maintainer-confirmed method for full cache wipe on logout
- [idletimer.dev/docs/api/use-idle-timer](https://idletimer.dev/docs/api/use-idle-timer) — `useIdleTimer` API: `timeout`, `promptBeforeIdle`, `onPrompt`, `onIdle`, `getRemainingTime`, `disabled`
- [reactrouter.com/api/hooks/useSearchParams](https://reactrouter.com/api/hooks/useSearchParams) — `useSearchParams` returns `[URLSearchParams, setSearchParams]` tuple
- [react-idle-timer GitHub](https://github.com/SupremeTechnopriest/react-idle-timer) — version 5.7.2, peer dep `react >= 16` (React 19 compatible)
- [Drizzle ORM slug unique constraint](https://orm.drizzle.team/docs/guides/unique-case-insensitive-email) — `.unique()` on varchar column is standard pattern

### Tertiary (LOW confidence)
- [npmpeer.dev react-idle-timer](https://www.npmpeer.dev/packages/react-idle-timer/compatibility) — React 19 compatibility not explicitly listed (listed as `react >= 16`); LOW risk given semver

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — react-idle-timer is verified, all other deps already in codebase
- Architecture: HIGH — KioskContext, useIdleTimer, queryClient.clear() patterns are confirmed from docs and codebase inspection
- Pitfalls: HIGH — most pitfalls derived directly from reading existing code (cookie path mismatch, cache partial clear pattern)
- Institution affiliation model: LOW — open question, recommended MVP workaround documented

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (react-idle-timer is stable; TanStack Query v5 and React Router v7 are mature)
