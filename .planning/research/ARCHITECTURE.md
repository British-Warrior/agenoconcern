# Architecture Research

**Domain:** Social enterprise platform — v1.1 feature integration
**Researched:** 2026-03-15
**Confidence:** HIGH (based on direct codebase inspection)

---

## System Overview (v1.0 Baseline)

```
┌────────────────────────────────────────────────────────────────┐
│                         Browser / PWA                          │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  React SPA (Vite)                                         │ │
│  │  BrowserRouter → AppShell → ProtectedRoute → Pages        │ │
│  │  AuthProvider (TanStack Query, JWT cookie)                │ │
│  │  apiClient (fetch + auto-refresh on 401)                  │ │
│  └──────────────────────┬────────────────────────────────────┘ │
└─────────────────────────│──────────────────────────────────────┘
                          │ HTTPS / REST (credentials: include)
┌─────────────────────────▼──────────────────────────────────────┐
│                   Express Server (Node.js)                      │
│  cors → cookieParser → rawBody(Stripe) → express.json          │
│  Routes: /api/auth  /api/challenges  /api/circles              │
│          /api/payments  /api/impact  /api/wellbeing             │
│          /api/notifications  /api/onboarding                   │
│  Middleware: authMiddleware (JWT cookie) → requireRole()        │
│  Services: auth, cv, llm, matching, notification, s3, stripe   │
│  MCP Server (separate process — 14 tool stubs, stdio)          │
└──────────┬─────────────────────────────────────────────────────┘
           │ Drizzle ORM (pg driver)
┌──────────▼──────────────────────────────────────────────────────┐
│                    PostgreSQL                                    │
│  18 tables across: contributors, profiles, cv_parse_jobs,       │
│  challenges, challenge_interests, circles, circle_members,      │
│  circle_notes, note_attachments, circle_resolutions,            │
│  resolution_ratings, consent_records, payment_transactions,     │
│  contributor_hours, wellbeing_checkins, push_subscriptions,     │
│  notifications, oauth_accounts, password_reset_tokens           │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `packages/shared` | Shared types, Zod schemas, constants | TypeScript source, no build step |
| `packages/server/src/routes/` | HTTP handler layer — validates input, calls services, returns JSON | One file per domain |
| `packages/server/src/services/` | Business logic — auth, CV parsing, matching, notifications, payments, S3 | Stateless functions |
| `packages/server/src/middleware/auth.ts` | JWT cookie verification, `req.contributor` population, role guard | `authMiddleware` + `requireRole(role)` |
| `packages/server/src/db/schema.ts` | Single Drizzle schema file for all 18 tables | Drizzle + pg enums |
| `packages/web/src/api/` | Typed fetch wrappers — one file per domain, auto-refresh on 401 | `apiClient()` base function |
| `packages/web/src/hooks/useAuth.ts` | Auth state via TanStack Query `["me"]` cache | React context + query |
| `packages/web/src/components/layout/` | AppShell, Navbar, ProtectedRoute | Shared across all pages |

---

## v1.1 Integration Map

The four v1.1 features each have a distinct integration profile. This section maps each to exactly what is new, what is modified, and what is untouched.

---

### Feature 1: UX Navigation Overhaul

**What changes:**

The Navbar (`packages/web/src/components/layout/Navbar.tsx`) is a flat horizontal bar with no role-awareness, no active state indicators, and no mobile drawer. The AppShell (`AppShell.tsx`) uses a fixed `max-w-5xl` container with no provision for a sidebar. Authenticated nav only shows "My Circles" and "My Impact" — missing Challenges, Dashboard, and CM-specific links.

**New components:**

```
packages/web/src/components/layout/
├── Sidebar.tsx              # Role-aware nav drawer (contributor vs challenger vs CM)
├── MobileNavDrawer.tsx      # Hamburger → slide-in drawer for <md breakpoint
└── NavLink.tsx              # Wrapper with active state via useLocation()
```

**Modified components:**

- `Navbar.tsx` — replace flat links with role-based nav items; add mobile hamburger button
- `AppShell.tsx` — add optional sidebar column for authenticated routes; keep public routes minimal
- `App.tsx` — add role-specific redirect logic post-login (contributor → `/dashboard`, challenger → `/challenger`, CM → `/challenges`)
- `packages/web/src/lib/constants.ts` — add all missing ROUTES entries

**Data flow change:** None on the server. `useAuth()` already provides `contributor.role`. Navigation component reads role and renders appropriate link set.

**Pattern:**

```typescript
// Navbar reads role, renders appropriate nav set
const { contributor } = useAuth();
const navItems = contributor?.role === "challenger"
  ? challengerNavItems
  : contributor?.role === "community_manager"
  ? cmNavItems
  : contributorNavItems;
```

---

### Feature 2: VANTAGE REST API Integration

**What VANTAGE needs:**

VANTAGE calls REST APIs directly using typed client modules (the `ilisten-client.ts` pattern confirmed in PROJECT.md). It does not use the MCP server. It needs:

1. **API key authentication** — service-to-service, not cookie-based
2. **Stable versioned URL prefix** — so VANTAGE client modules do not break on non-breaking server changes
3. **Locked endpoint contracts** — breaking changes require a version bump

**New server components:**

```
packages/server/src/middleware/
└── api-key-auth.ts          # Reads X-API-Key header, validates against VANTAGE_API_KEY env var
```

**Modified server components:**

- `config/env.ts` — add `VANTAGE_API_KEY: z.string().default("")`
- `express-app.ts` — apply `apiKeyAuth` middleware to VANTAGE-specific route mounts; optionally add `/api/v1/` prefix mounts for contract stability

**API key middleware:**

```typescript
// packages/server/src/middleware/api-key-auth.ts
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-api-key"];
  if (!key || key !== getEnv().VANTAGE_API_KEY) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }
  next();
}
```

**Auth separation principle:**

VANTAGE uses API key auth (stateless, `X-API-Key` header). Human users use JWT cookies (`authMiddleware`). These are separate middleware applied to separate route groups. A VANTAGE request carries no cookie and `req.contributor` is not populated. If VANTAGE-specific routes need to identify the caller, pass an identifier in the request body, not via `req.contributor`.

**VANTAGE client module pattern (in the VANTAGE repo):**

```typescript
// In VANTAGE: indomitable-unity-client.ts
const BASE = "https://api.indomitableunity.org/api/v1";
const HEADERS = { "X-API-Key": process.env.IU_API_KEY };

export async function listChallenges(filters?: ChallengeFilters) {
  return fetch(`${BASE}/challenges`, { headers: HEADERS }).then(r => r.json());
}
```

**Endpoint contract discipline:**

Existing routes consumed by VANTAGE must not change response shapes without a version bump. A `VANTAGE-CONTRACT.md` listing every consumed endpoint, its request shape, and response shape is a v1.1 deliverable alongside the integration work.

---

### Feature 3: Kiosk Mode

**What kiosk mode is:**

A stripped-down interface for shared computers in libraries and community centres. Large touch targets, no persistent login, auto-logout after inactivity, guided flows with no open navigation.

**Architecture approach: React render mode, not a separate app or build.**

A URL path prefix (`/kiosk/*`) selects `KioskShell` instead of `AppShell`. Same bundle, same API, same cookie auth — different UI skin with inactivity management layered on top.

**New React components:**

```
packages/web/src/components/layout/
└── KioskShell.tsx           # No top nav, no sidebar, large footer with "End session" button

packages/web/src/contexts/
└── KioskContext.tsx          # isKiosk flag + inactivity timer state

packages/web/src/hooks/
└── useInactivityLogout.ts    # setTimeout reset on user interaction events
```

**New pages:**

```
packages/web/src/pages/kiosk/
├── KioskLanding.tsx         # "Start here" — simplified entry point for shared computer
└── KioskChallenges.tsx      # Read-only challenge browser, large cards
```

**Session management:**

The kiosk problem: user completes task, leaves computer, next user must not see previous data.

Solution:
1. `useInactivityLogout` — after N minutes of no interaction, POST `/api/auth/logout` and clear TanStack Query cache
2. `KioskShell` renders an always-visible "End session" button triggering immediate logout
3. After logout, React re-renders to `KioskLanding` (unauthenticated state), ready for next user

No new DB tables needed. The logout endpoint already exists (`POST /api/auth/logout`).

**Inactivity logout hook:**

```typescript
// packages/web/src/hooks/useInactivityLogout.ts
export function useInactivityLogout(timeoutMs: number) {
  const { logout } = useAuth();
  useEffect(() => {
    let timer = setTimeout(logout, timeoutMs);
    const reset = () => { clearTimeout(timer); timer = setTimeout(logout, timeoutMs); };
    const events = ["mousemove", "keydown", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, reset));
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [logout, timeoutMs]);
}
```

**Kiosk routing addition to App.tsx:**

```typescript
<Route element={<KioskShell />}>
  <Route path="/kiosk" element={<KioskLanding />} />
  <Route path="/kiosk/challenges" element={<KioskChallenges />} />
</Route>
```

No server changes required. Kiosk mode is entirely a frontend concern.

---

### Feature 4: Challenger Portal

**What challengers are:**

Organisations (companies, councils, NHS trusts, voluntary groups) that post challenges. Not contributors. They need separate accounts, separate onboarding, and a separate view into challenge progress and resolutions.

**DB schema changes:**

New enum value on existing enum:
```sql
ALTER TYPE contributor_role ADD VALUE 'challenger';
```

New table:
```sql
CREATE TABLE challenger_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL UNIQUE REFERENCES contributors(id) ON DELETE CASCADE,
  organisation_name TEXT NOT NULL,
  organisation_type TEXT NOT NULL,  -- 'company', 'council', 'nhs', 'charity', 'other'
  contact_name TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

Modified column on existing table:
```sql
ALTER TABLE challenges ADD COLUMN challenger_org_id UUID REFERENCES challenger_organisations(id);
```
Nullable — existing CM-created challenges have no challenger org.

**Shared package changes:**

- `types/auth.ts` — add `"challenger"` to `ContributorRole` union
- `constants.ts` — add `"challenger"` to `CONTRIBUTOR_ROLES`
- `types/challenger.ts` — new: `ChallengerOrg` type
- `schemas/challenger.ts` — new: `createChallengerOrgSchema`, `submitChallengeSchema`

**New server route file:**

```
packages/server/src/routes/
└── challenger.ts
```

Route surface:
- `POST /api/auth/register-challenger` — create challenger account + org record atomically (public)
- `GET /api/challenger/profile` — get org profile (challenger auth required)
- `PUT /api/challenger/profile` — update org profile
- `GET /api/challenger/challenges` — list challenges posted by this org
- `POST /api/challenger/challenges` — submit challenge draft (feeds CM review queue)
- `GET /api/challenger/challenges/:id/progress` — circle status, resolution status
- `GET /api/challenger/challenges/:id/resolution` — view completed resolution

**Modified server components:**

- `routes/auth.ts` — add `POST /api/auth/register-challenger` endpoint: creates contributor with `role: "challenger"` and inserts into `challenger_organisations` in a single transaction
- `routes/challenges.ts` — draft submission path: `POST /api/challenger/challenges` forces `status: "draft"` and `challenger_org_id` from authenticated challenger's org; CM uses existing `PUT /api/challenges/:id` to flip to `"open"`
- `middleware/auth.ts` — no code change; `requireRole("challenger")` works immediately because `requireRole` is a generic factory comparing `req.contributor.role` to its argument
- `db/schema.ts` — add enum value, new table, FK column
- `express-app.ts` — mount `challengerRoutes`

**Why a separate register-challenger endpoint:**

The existing `POST /api/auth/register` defaults `role: "contributor"`. Challenger registration requires atomically creating both the contributor record (role: challenger) and the organisation record. Separate endpoint keeps the auth logic readable and avoids conditionals in a sensitive code path.

**New web pages:**

```
packages/web/src/pages/challenger/
├── ChallengerRegister.tsx       # Organisation registration flow
├── ChallengerDashboard.tsx      # Overview: active, draft, completed challenges
├── ChallengerChallengeForm.tsx  # Submit / edit a challenge brief
└── ChallengerProgress.tsx       # Read-only: circle status + resolution view
```

**Modified web components:**

- `App.tsx` — add public `/challenger/register` route and protected challenger routes
- `Navbar.tsx` / `Sidebar.tsx` — challenger-specific nav items
- `ProtectedRoute.tsx` — challenger role can access `/challenger/*` but not `/dashboard`, `/wellbeing`, `/circles` etc.
- `web/src/api/challenger.ts` — new typed fetch wrappers for challenger endpoints

---

## Recommended Project Structure Changes for v1.1

```
packages/
├── server/src/
│   ├── middleware/
│   │   ├── auth.ts              # UNCHANGED in code; role enum expands via DB/types
│   │   └── api-key-auth.ts      # NEW: VANTAGE API key validation
│   ├── routes/
│   │   ├── auth.ts              # MODIFIED: add /register-challenger endpoint
│   │   ├── challenger.ts        # NEW: challenger portal routes
│   │   └── challenges.ts        # MODIFIED: challenger draft submission path
│   ├── db/
│   │   └── schema.ts            # MODIFIED: challenger role enum value, challenger_organisations table, FK on challenges
│   └── express-app.ts           # MODIFIED: mount challenger routes; add apiKeyAuth for VANTAGE paths
│
├── shared/src/
│   ├── types/
│   │   ├── auth.ts              # MODIFIED: add 'challenger' to ContributorRole
│   │   └── challenger.ts        # NEW: ChallengerOrg type
│   ├── schemas/
│   │   └── challenger.ts        # NEW: Zod schemas for challenger input
│   └── constants.ts             # MODIFIED: add 'challenger' to CONTRIBUTOR_ROLES
│
└── web/src/
    ├── components/layout/
    │   ├── AppShell.tsx         # MODIFIED: isKiosk path-based check, sidebar column
    │   ├── Navbar.tsx           # MODIFIED: role-aware nav items, mobile hamburger
    │   ├── Sidebar.tsx          # NEW: role-based authenticated sidebar
    │   ├── MobileNavDrawer.tsx  # NEW: mobile hamburger drawer
    │   ├── NavLink.tsx          # NEW: active-state nav link wrapper
    │   └── KioskShell.tsx       # NEW: kiosk-specific shell
    ├── contexts/
    │   └── KioskContext.tsx     # NEW: isKiosk flag + inactivity state
    ├── hooks/
    │   └── useInactivityLogout.ts  # NEW: auto-logout on inactivity
    ├── pages/
    │   ├── challenger/          # NEW: 4 challenger portal pages
    │   └── kiosk/               # NEW: 2 kiosk pages
    ├── api/
    │   └── challenger.ts        # NEW: typed fetch wrappers for challenger routes
    └── App.tsx                  # MODIFIED: challenger + kiosk routes added
```

---

## Architectural Patterns

### Pattern 1: Role Enum Expansion

**What:** Add `"challenger"` to the PostgreSQL `contributor_role` enum and the shared `ContributorRole` TypeScript union simultaneously, with a Drizzle migration.

**When to use:** Any time a new actor type is added.

**Caution:** PostgreSQL enum values can be added but not removed or reordered without table rewrites. Add the value; do not replace existing ones.

**The `requireRole()` factory in `middleware/auth.ts` already handles any role string** — it compares `req.contributor.role` to its argument. `requireRole("challenger")` works the moment the enum value and type are added.

### Pattern 2: Dual Auth Paths (Cookie vs API Key)

**What:** Human users authenticate via JWT cookies (`authMiddleware`). VANTAGE authenticates via `X-API-Key` header (`apiKeyAuth`). Independent middleware applied to separate route groups.

**Implementation:**

```typescript
// express-app.ts — separate mount points, never mixed on same route
app.use("/api/v1/challenges", apiKeyAuth, challengeRoutes);  // VANTAGE
app.use("/api/challenges", authMiddleware, challengeRoutes);  // Web UI (cookie)
```

**Trade-off:** API key is a shared secret. For pilot scale, a single key in env is sufficient. At scale, per-client keys with a DB-backed key table are appropriate.

### Pattern 3: Kiosk as Render Mode

**What:** Kiosk mode is activated by URL path prefix (`/kiosk/*`), which React Router uses to render `KioskShell` instead of `AppShell`. Same bundle, same API, different skin.

**Why not a separate Vite build target:** Doubles build complexity, diverges the codebase, makes it easy for kiosk to fall behind on security patches. Single build, conditional render.

### Pattern 4: Challenger Challenge Submission as Draft Flow

**What:** Challengers submit challenges with `status: "draft"`. CM reviews and publishes. This preserves the v1.0 principle that CM curates quality.

**Why not a direct publish:** The existing `POST /api/challenges` is CM-only. Rather than weakening that guard, add `POST /api/challenger/challenges` which creates with `status: "draft"` and sets `challenger_org_id`. CM uses the existing `PUT /api/challenges/:id` to set `status: "open"`.

---

## Data Flow

### Standard Contributor Request Flow (unchanged in v1.1)

```
Browser (TanStack Query)
    ↓ fetch /api/challenges (credentials: include — sends cookie)
Express authMiddleware
    ↓ JWT cookie → req.contributor = { id, role }
Route handler → Drizzle query → PostgreSQL
    ↓
JSON response → TanStack Query cache → React re-render
```

### VANTAGE Request Flow (new in v1.1)

```
VANTAGE agent (external Node.js process)
    ↓ fetch /api/v1/challenges (X-API-Key: <key>)
Express apiKeyAuth middleware
    ↓ key validated — no req.contributor set
Route handler → Drizzle query → PostgreSQL
    ↓
JSON response → VANTAGE typed client module
```

### Challenger Challenge Submission Flow (new in v1.1)

```
Challenger portal (React)
    ↓ POST /api/challenger/challenges
authMiddleware (cookie) → requireRole("challenger")
    ↓ challenger_organisations lookup for authenticated challenger
challenges INSERT (status: "draft", challenger_org_id: org.id)
    ↓
CM sees draft in challenge list with "pending review" indicator
    ↓ PUT /api/challenges/:id { status: "open" }
Challenge visible to contributors in feed
```

### Kiosk Auto-Logout Flow (new in v1.1)

```
User interaction stops
    ↓ N minutes elapses (useInactivityLogout setTimeout)
POST /api/auth/logout
    ↓ server clears httpOnly cookies
queryClient.setQueryData(["me"], null)
    ↓
React re-renders → KioskLanding (unauthenticated state)
Next user sees clean entry point, no previous user data
```

---

## Integration Points — New vs Modified Summary

| Component | Status | Feature |
|-----------|--------|---------|
| `middleware/api-key-auth.ts` | NEW | VANTAGE auth |
| `routes/challenger.ts` | NEW | Challenger portal |
| `routes/auth.ts` | MODIFIED | Add `/register-challenger` |
| `routes/challenges.ts` | MODIFIED | Challenger draft path |
| `db/schema.ts` | MODIFIED | Challenger role enum, `challenger_organisations` table, FK on `challenges` |
| `express-app.ts` | MODIFIED | Mount challenger routes, VANTAGE auth |
| `config/env.ts` | MODIFIED | Add `VANTAGE_API_KEY` |
| `shared/types/auth.ts` | MODIFIED | Add `"challenger"` to ContributorRole |
| `shared/types/challenger.ts` | NEW | ChallengerOrg type |
| `shared/schemas/challenger.ts` | NEW | Zod schemas for challenger input |
| `shared/constants.ts` | MODIFIED | Add `"challenger"` to CONTRIBUTOR_ROLES |
| `web/components/layout/AppShell.tsx` | MODIFIED | Kiosk path detection, sidebar column |
| `web/components/layout/Navbar.tsx` | MODIFIED | Role-aware items, mobile hamburger |
| `web/components/layout/Sidebar.tsx` | NEW | Authenticated sidebar |
| `web/components/layout/KioskShell.tsx` | NEW | Kiosk wrapper |
| `web/contexts/KioskContext.tsx` | NEW | isKiosk flag |
| `web/hooks/useInactivityLogout.ts` | NEW | Auto-logout on inactivity |
| `web/pages/challenger/` | NEW | 4 pages |
| `web/pages/kiosk/` | NEW | 2 pages |
| `web/api/challenger.ts` | NEW | Typed fetch wrappers |
| `web/App.tsx` | MODIFIED | New routes |
| `web/lib/constants.ts` | MODIFIED | New ROUTES entries |

### Unchanged Components

All of the following are NOT touched by v1.1 work:
- All existing route files except `auth.ts` and `challenges.ts`
- All service files
- All MCP tools
- All existing web pages (onboarding, wellbeing, circles, impact, dashboard)
- PostgreSQL migration history — only additive changes

---

## Recommended Build Order

Feature dependencies within v1.1 determine safe sequencing.

**Phase A — Shared foundation (pre-requisite for all other features)**
1. Expand `ContributorRole` to add `"challenger"` in `shared/types/auth.ts` and `shared/constants.ts`
2. Add Drizzle migration: `challenger_organisations` table + FK column on `challenges` + enum value
3. Update `shared/types/challenger.ts` and `shared/schemas/challenger.ts`
4. Add missing ROUTES constants

Rationale: Challenger portal, UX nav, and kiosk mode all reference the role type. DB migrations are safest done before any routes are added that depend on the new schema.

**Phase B — VANTAGE API integration (no dependencies except Phase A env changes)**
1. Add `api-key-auth.ts` middleware
2. Add `VANTAGE_API_KEY` to `env.ts`
3. Mount existing routes at versioned prefix in `express-app.ts`
4. Write `VANTAGE-CONTRACT.md`

Rationale: Pure server addition. No DB changes. No UI changes. Safe to ship independently and unblocks VANTAGE development in parallel.

**Phase C — Challenger portal (server first, then UI)**
1. Server: `routes/challenger.ts` + modify `routes/auth.ts` + modify `routes/challenges.ts`
2. Web: `api/challenger.ts` + 4 pages + routing in `App.tsx`

Rationale: Server routes must exist before web pages can call them. Role type from Phase A must exist before routes can use it.

**Phase D — UX navigation overhaul**
1. `Sidebar.tsx`, `NavLink.tsx`, `MobileNavDrawer.tsx`
2. Modify `Navbar.tsx`, `AppShell.tsx`
3. Update `App.tsx` role-based redirects

Rationale: Depends on knowing all roles (Phase A). Challenger portal pages must exist before the sidebar links to them (Phase C).

**Phase E — Kiosk mode (self-contained, no server changes)**
1. `KioskContext.tsx`, `useInactivityLogout.ts`, `KioskShell.tsx`
2. Kiosk pages
3. Kiosk routing in `App.tsx`

Rationale: Entirely frontend. Builds on the cleaned-up `AppShell` from Phase D. The logout endpoint it calls already exists.

---

## Anti-Patterns

### Anti-Pattern 1: Mixing Cookie and API Key Auth on the Same Route

**What people do:** Apply both `authMiddleware` and `apiKeyAuth` to the same route with OR logic.

**Why it's wrong:** Creates identity ambiguity. VANTAGE is a service, not a contributor. If VANTAGE triggers a route that populates `req.contributor`, that ID is meaningless and may appear in audit logs, notification queues, or wellbeing records.

**Do this instead:** Separate route groups. VANTAGE has its own route prefix with `apiKeyAuth`. Human routes keep `authMiddleware`. If the same data is needed by both, extract a service function called from both handlers.

### Anti-Pattern 2: Giving Challengers Access to Contributor Routes

**What people do:** Add `"challenger"` to `requireRole("contributor")` guards to give challengers access to challenge feed, circles, etc.

**Why it's wrong:** Challengers should not see wellbeing check-ins, impact dashboards, Stripe Connect onboarding, or circle workspaces. Role guards exist for separation, not just access control.

**Do this instead:** Challenger-specific routes under `/api/challenger/` and `/challenger/*` in the React router. `ProtectedRoute.tsx` redirects challengers attempting to access `/dashboard` to `/challenger/dashboard`.

### Anti-Pattern 3: Kiosk as a Separate Vite Build Target

**What people do:** Create a second Vite entry point (`kiosk.html`) for the kiosk interface.

**Why it's wrong:** Doubles build complexity, diverges the codebase, makes security patches harder to apply consistently.

**Do this instead:** Single build. Kiosk mode is activated by URL path (`/kiosk/*`) triggering `KioskShell`. Institutions are given the `/kiosk` URL.

### Anti-Pattern 4: Implicit VANTAGE Endpoint Contracts

**What people do:** Let the API contract live only in route handler code and VANTAGE client modules with no documentation.

**Why it's wrong:** When a route changes, no one knows which VANTAGE calls break until VANTAGE fails in production.

**Do this instead:** Maintain `VANTAGE-CONTRACT.md` listing every endpoint consumed, its request shape, and response shape. Update it when a consumed route changes. This is a required deliverable alongside the VANTAGE integration work.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users (pilot) | Monolith is fine; single `VANTAGE_API_KEY` in env; kiosk on institutional shared computers only |
| 1k-10k users | API key per VANTAGE instance; rate limiting on challenger challenge submissions; challenger org table is the natural split point if needed |
| 10k+ users | `/api/v1/` prefix already in place — easier to extract challenger and VANTAGE surfaces to separate services without breaking existing clients |

---

## Sources

- Direct codebase inspection: `packages/server/src/` (routes, middleware, services, db/schema.ts, config/env.ts, express-app.ts)
- Direct codebase inspection: `packages/web/src/` (App.tsx, hooks/useAuth.ts, components/layout/AppShell.tsx, components/layout/Navbar.tsx, api/client.ts, lib/constants.ts)
- Direct codebase inspection: `packages/shared/src/` (types/auth.ts, constants.ts, index.ts)
- Direct codebase inspection: `packages/server/src/tools/index.ts` (14 MCP stubs confirmed)
- `.planning/PROJECT.md` — confirmed VANTAGE calls REST directly (not MCP), kiosk intent, challenger portal requirements
- Confidence: HIGH — all claims derived from reading actual code, not training data assumptions

---

*Architecture research for: Indomitable Unity v1.1 (VANTAGE integration, kiosk mode, challenger portal, UX navigation overhaul)*
*Researched: 2026-03-15*
