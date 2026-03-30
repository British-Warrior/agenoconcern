# Phase 18: Institution Portal - Research

**Researched:** 2026-03-30
**Domain:** Auth isolation for a second identity type in an existing JWT/cookie Express app
**Confidence:** HIGH (all findings from direct codebase inspection + authoritative library docs)

---

## Summary

Phase 18 introduces a second class of authenticated user — institution contacts — who are entirely separate from contributors. The existing auth system uses cookie-based JWTs (jose + argon2), with a 15-minute access token and 7-day refresh token, both stored as httpOnly cookies. The JWT payload carries `{ sub: contributorId, role }`. Portal users must NOT reuse contributor identity: they have no contributor record, no contributor role, and must be scoped to exactly one institution.

The pending pre-build decision — "separate Express router vs subdomain" — resolves clearly in favour of a separate Express router mounted at `/api/portal`. This requires zero infrastructure changes and fully isolates portal routes from the admin/contributor surface. Subdomain isolation (e.g. `portal.indomitableunity.org`) would require DNS, TLS certificates, and CORS changes, providing no meaningful security benefit over a scoped router at this pilot scale.

The implementation pattern is well-established in this codebase: the challenger portal (`/api/challenger`, `ChallengerRoute`) is an exact precedent. Phase 18 follows the same pattern: new DB table, new middleware, new Express router, new React context + route guard. No new libraries are needed.

**Primary recommendation:** Mount the institution portal at `/api/portal`, issue portal-specific JWTs with `{ sub: portalAccountId, institutionId, type: "portal" }` stored in cookies named `portal_access_token` / `portal_refresh_token`, and guard all portal API routes with a dedicated `portalAuthMiddleware`. On the frontend, create a `PortalAuthProvider` and `InstitutionPortalRoute` guard that are entirely separate from the existing contributor `AuthProvider`.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jose | ^5.9.0 | JWT sign/verify | Already used for contributor auth; same pattern |
| argon2 | ^0.41.0 | Password hashing | Already used for contributor passwords |
| drizzle-orm | ^0.38.0 | DB queries | Project ORM |
| zod | ^3.24.0 | Input validation | Project standard |
| react-router | ^7.1.0 | Frontend routing + route guards | Already used |
| @tanstack/react-query | ^5.62.0 | Data fetching + cache | Already used |

### No new libraries required

The existing stack covers all needs for Phase 18. The portal auth is structurally identical to the contributor auth pattern already in the codebase.

**Installation:** No new packages to install.

---

## Architecture Patterns

### Recommended Project Structure

```
packages/server/src/
├── middleware/
│   ├── auth.ts                     # Existing — contributor JWT middleware
│   └── portal-auth.ts              # NEW — institution portal JWT middleware
├── routes/
│   ├── portal/
│   │   ├── portal-auth.ts          # NEW — login, logout, refresh, me
│   │   └── portal-dashboard.ts     # NEW — stats, PDF download, attention flags
│   └── ...existing routes...
└── db/
    └── schema.ts                   # Add institutionPortalAccounts table

packages/web/src/
├── contexts/
│   └── PortalAuthContext.tsx       # NEW — separate from AuthProvider
├── components/layout/
│   └── InstitutionPortalRoute.tsx  # NEW — route guard, mirrors CMRoute
├── hooks/
│   └── usePortalAuth.ts            # NEW — portal session hook
├── api/
│   └── portal.ts                   # NEW — all portal API calls
└── pages/
    └── portal/
        ├── PortalLogin.tsx          # NEW — /portal/login
        └── PortalDashboard.tsx      # NEW — /portal/dashboard (stats + PDF + flags)
```

### Pattern 1: Separate JWT Middleware for Portal Identity

**What:** A new `portalAuthMiddleware` that reads `portal_access_token` cookie and attaches `req.portalUser: { id, institutionId }` to the request. Uses the same `jose.jwtVerify` call but a separate claim shape.

**When to use:** On every `/api/portal` route that requires authentication.

**Example:**
```typescript
// Source: codebase inspection — packages/server/src/middleware/auth.ts (existing pattern)
// packages/server/src/middleware/portal-auth.ts

import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { getEnv } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      portalUser?: {
        id: string;
        institutionId: string;
      };
    }
  }
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

export async function portalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.portal_access_token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());

    // Reject contributor tokens at this middleware — type guard
    if (payload.type !== "portal") {
      res.status(401).json({ error: "Invalid token type" });
      return;
    }

    req.portalUser = {
      id: payload.sub as string,
      institutionId: payload.institutionId as string,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
```

**Why `type: "portal"` matters:** Without this, a contributor JWT could potentially be accepted by the portal middleware (same secret, same algorithm). The type claim ensures tokens can't cross authentication domains.

### Pattern 2: Portal-Scoped DB Table

**What:** A new `institutionPortalAccounts` table that is entirely separate from the `contributors` table. Portal accounts have `institutionId`, `email`, `passwordHash`, and `createdBy` (the CM's contributor UUID).

**When to use:** This is the single source of truth for portal user credentials.

**Schema addition to `packages/server/src/db/schema.ts`:**
```typescript
// Source: codebase inspection — existing schema.ts patterns
export const institutionPortalAccounts = pgTable("institution_portal_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => contributors.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Migration file name:** `0006_institution_portal_accounts.sql`

### Pattern 3: Portal Cookie Naming

**What:** Use distinct cookie names (`portal_access_token`, `portal_refresh_token`) so portal and contributor sessions can coexist without collision. This is critical: if a CM is logged in as a contributor AND opens the portal, both sessions should work independently.

**Refresh token path scoping:**
```typescript
// portal_access_token  → path: "/"  (same as contributor access_token)
// portal_refresh_token → path: "/api/portal/refresh"  (scoped, mirrors contributor pattern)
```

### Pattern 4: Frontend — Separate PortalAuthProvider

**What:** The portal needs its own React context, entirely separate from `AuthProvider`. The existing `AuthProvider` calls `/api/auth/me` (contributor endpoint). Portal users have no contributor record, so calling `/api/auth/me` would always 401.

**When to use:** Wrap only portal routes — do NOT nest PortalAuthProvider inside AuthProvider.

**Example routing in App.tsx:**
```typescript
// Source: codebase inspection — packages/web/src/App.tsx (existing pattern)
<Routes>
  <Route element={<AppShell />}>
    {/* ...existing routes... */}

    {/* Institution portal — separate auth context */}
    <Route path="/portal/*" element={
      <PortalAuthProvider>
        <Routes>
          <Route path="login" element={<PortalLogin />} />
          <Route element={<InstitutionPortalRoute />}>
            <Route path="dashboard" element={<PortalDashboard />} />
          </Route>
        </Routes>
      </PortalAuthProvider>
    } />
  </Route>
</Routes>
```

### Pattern 5: CM Portal Account Creation UI

**What:** A new UI section in the existing `InstitutionManagement` admin page (or a dedicated sub-page) allowing a CM to create a portal account for one of their institutions. Calls `POST /api/portal/admin/create-account` which is protected by `authMiddleware + requireRole("community_manager")` (contributor auth, not portal auth).

**Key detail:** The CM creation endpoint uses the existing contributor JWT middleware — CMs are contributors. Only the portal-facing endpoints use `portalAuthMiddleware`.

### Pattern 6: PDF Download from Portal

**What:** The existing PDF generation lives at `GET /api/admin/institutions/:slug/report.pdf` (protected by CM auth). For the portal, create `GET /api/portal/report.pdf` — no slug parameter needed since `req.portalUser.institutionId` already scopes the request. Reuse `buildInstitutionReport()` directly from `packages/server/src/pdf/institution-report.ts`.

### Pattern 7: Attention Flags (Read-Only)

**What:** `GET /api/portal/attention` — returns `ithinkAttentionFlags` for `req.portalUser.institutionId` where `clearedAt IS NULL`. Identical query to the CM endpoint but no POST/resolve endpoint exposed. The portal never exposes the resolve action.

### Anti-Patterns to Avoid

- **Reusing contributor role for portal users:** Do NOT add an `institution_contact` role to the `contributorRoleEnum` and create contributors for portal users. The `contributors` table is the wrong abstraction — contributors have profiles, onboarding flows, and circle memberships. Portal accounts should be a separate table.
- **Sharing cookie names with contributor auth:** Using `access_token` for portal tokens would mean a portal session could accidentally be read by `authMiddleware`, potentially causing confusing 401s or, worse, the wrong identity being attached.
- **Single combined AuthProvider for both user types:** Portal users have no `/api/auth/me` equivalent in the contributor system. Mixing them into the same context causes `isLoading` to flash incorrectly on portal pages.
- **Embedding institution data in the contributor JWT:** Contributor JWTs currently carry `{ sub, role }`. If portal tokens are accidentally mixed with contributor tokens, a portal token could grant contributor route access. The `type: "portal"` discriminant prevents this.
- **Route path collision:** Do NOT mount portal routes under `/api/admin` — the `adminRouter` applies `requireRole("community_manager")` as router-level middleware, so portal requests would always 401 there.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash function | argon2 (already installed) | Side-channel attacks, memory-hard by default |
| JWT sign/verify | Manual crypto | jose (already installed) | Proper algorithm selection, claim validation |
| Token refresh logic | Custom session store | Same cookie-refresh pattern as contributor auth | Already proven in this codebase |
| PDF generation | New PDF library | `buildInstitutionReport()` from phase 15 | Already handles layout, branding, data |
| Stats queries | New aggregation service | Reuse logic from `GET /api/admin/institutions/:id` | Already batches contributor/hours/challenges correctly |

**Key insight:** Almost every capability Phase 18 needs already exists in the codebase. The work is wiring a new identity layer onto existing data and endpoints.

---

## Common Pitfalls

### Pitfall 1: Cookie Path Conflict

**What goes wrong:** Naming the portal refresh token cookie identically to the contributor refresh token (`refresh_token` with `path: "/api/auth/refresh"`) and then naming the portal refresh endpoint `/api/portal/refresh`. The contributor refresh cookie would never be sent to the portal refresh route, causing perpetual 401s after 15 minutes.

**Why it happens:** Cookie `path` attribute controls which requests include the cookie. If paths don't match exactly, the cookie is never sent.

**How to avoid:** Use `portal_refresh_token` cookie with `path: "/api/portal/refresh"`. Keep it exactly consistent between `setPortalAuthCookies()` and the `POST /api/portal/refresh` handler.

**Warning signs:** Portal sessions expire after exactly 15 minutes without warning — refresh silently fails.

### Pitfall 2: Pilot Assumption — One Portal Account Per Institution

**What goes wrong:** Allowing multiple portal accounts per institution (no enforcement) and then having two portal contacts see each other's session, or having no way to deactivate one without affecting others.

**Why it happens:** Requirements say "one contact per institution" but the DB schema could allow multiple rows.

**How to avoid:** The `PORTAL-01` requirement ("CM creates portal accounts") and out-of-scope item ("multi-institution portal accounts") together imply one active portal account per institution. Add a `UNIQUE` constraint on `institutionId` in `institution_portal_accounts`, or at minimum a unique partial index on `(institutionId) WHERE is_active = true`. Enforcement at DB level prevents CM UI bugs from creating duplicates.

### Pitfall 3: Portal Routes Accidentally Accessible via Contributor Auth

**What goes wrong:** A CM could call `GET /api/portal/attention` with their contributor JWT and receive data — bypassing the portal scope check.

**Why it happens:** If `portalAuthMiddleware` doesn't strictly reject non-portal tokens, and a developer accidentally mounts a portal route with `authMiddleware` instead.

**How to avoid:** The `type: "portal"` claim check in `portalAuthMiddleware` ensures contributor tokens are rejected. Route registration must use `portalAuthMiddleware` explicitly — never `authMiddleware` on `/api/portal` data endpoints.

### Pitfall 4: Stale institutionId After Token Refresh

**What goes wrong:** The `institutionId` is embedded in the JWT at login. If a CM reassigns the institution (e.g., replaces the portal account), the old JWT still contains the old `institutionId` until it expires.

**Why it happens:** JWTs are self-contained — unlike session stores, they can't be invalidated server-side without additional infrastructure.

**How to avoid:** Portal access tokens are short-lived (15 minutes), so the blast radius is small. The refresh flow issues new tokens by re-reading `institutionPortalAccounts.institutionId` from the DB — the new access token will carry the current `institutionId`. This is sufficient for pilot scale. Do NOT store `institutionId` only in the refresh token (that would require DB lookup on every refresh, but is acceptable for pilot).

### Pitfall 5: React Router Nested Route Context Isolation

**What goes wrong:** If `PortalAuthProvider` is placed inside the same `<Route element={<AppShell />}>` subtree without proper nesting, the portal's `usePortalAuth()` context will be available on non-portal routes.

**Why it happens:** React context providers bleed down through all child routes if not scoped properly.

**How to avoid:** Scope `PortalAuthProvider` only to the `/portal/*` route subtree. The example in Pattern 4 above shows the correct nesting. `InstitutionPortalRoute` redirects to `/portal/login` (not `/login`) to avoid contributor login flow contamination.

---

## Code Examples

### Portal Token Creation (Server)

```typescript
// Source: codebase inspection — packages/server/src/services/auth.service.ts (existing pattern)
// New function in services/portal-auth.service.ts

const PORTAL_ACCESS_TOKEN_EXPIRY = "15m";
const PORTAL_REFRESH_TOKEN_EXPIRY = "7d";

export async function createPortalTokens(
  portalAccountId: string,
  institutionId: string,
) {
  const secret = new TextEncoder().encode(getEnv().JWT_SECRET);

  const accessToken = await new jose.SignJWT({
    sub: portalAccountId,
    institutionId,
    type: "portal",          // discriminant — prevents cross-auth confusion
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(PORTAL_ACCESS_TOKEN_EXPIRY)
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    sub: portalAccountId,
    type: "portal_refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(PORTAL_REFRESH_TOKEN_EXPIRY)
    .sign(secret);

  return { accessToken, refreshToken };
}
```

### Portal Cookie Helper (Server)

```typescript
// Source: codebase inspection — packages/server/src/services/auth.service.ts
// New function in services/portal-auth.service.ts

export function setPortalAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  const secure = getEnv().NODE_ENV === "production";
  res.cookie("portal_access_token", tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
    path: "/",
  });
  res.cookie("portal_refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/portal/refresh",   // CRITICAL: must match refresh endpoint path exactly
  });
}
```

### Portal Login (Server)

```typescript
// Source: codebase inspection — auth.service.ts login() pattern
// New function in services/portal-auth.service.ts

export async function portalLogin(email: string, password: string) {
  const db = getDb();

  const [account] = await db
    .select()
    .from(institutionPortalAccounts)
    .where(and(
      eq(institutionPortalAccounts.email, email.toLowerCase()),
      eq(institutionPortalAccounts.isActive, true),
    ))
    .limit(1);

  if (!account || !account.passwordHash) {
    throw new PortalAuthError("Invalid email or password", 401);
  }

  const valid = await argon2.verify(account.passwordHash, password);
  if (!valid) {
    throw new PortalAuthError("Invalid email or password", 401);
  }

  const tokens = await createPortalTokens(account.id, account.institutionId);
  return { tokens, account: { id: account.id, institutionId: account.institutionId } };
}
```

### InstitutionPortalRoute (Frontend)

```typescript
// Source: codebase inspection — packages/web/src/components/layout/CMRoute.tsx
// New component: packages/web/src/components/layout/InstitutionPortalRoute.tsx

import { Navigate, Outlet } from "react-router";
import { usePortalAuth } from "../../hooks/usePortalAuth.js";

export function InstitutionPortalRoute() {
  const { isAuthenticated, isLoading } = usePortalAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  return <Outlet />;
}
```

### Portal API Client (Frontend)

```typescript
// Source: codebase inspection — packages/web/src/api/client.ts
// The existing apiClient sends credentials: "include", so portal cookies are
// automatically sent. Portal routes simply use different paths.

export function getPortalDashboard() {
  return apiClient<PortalDashboardData>("/api/portal/dashboard");
}

export function downloadPortalReport(): Promise<Blob> {
  // PDF download requires special handling — can't use apiClient JSON parser
  return fetch(`${API_BASE_URL}/api/portal/report.pdf`, {
    credentials: "include",
  }).then((res) => {
    if (!res.ok) throw new Error("Failed to download report");
    return res.blob();
  });
}

export function getPortalAttentionFlags() {
  return apiClient<PortalAttentionFlag[]>("/api/portal/attention");
}
```

### CM Creates Portal Account (Server — admin endpoint)

```typescript
// Source: codebase inspection — auth.ts /create-account pattern
// New route in portal-auth.ts, protected by authMiddleware + requireRole("community_manager")

router.post(
  "/admin/create-portal-account",
  authMiddleware,
  requireRole("community_manager"),
  async (req: Request, res: Response) => {
    const { institutionId, email, password } = req.body as {
      institutionId: string;
      email: string;
      password?: string;
    };

    const plainPassword = password ?? crypto.randomBytes(12).toString("base64url").slice(0, 16);
    const passwordHash = await argon2.hash(plainPassword);

    const db = getDb();

    // One portal account per institution (enforced at DB level too)
    const [existing] = await db
      .select({ id: institutionPortalAccounts.id })
      .from(institutionPortalAccounts)
      .where(eq(institutionPortalAccounts.institutionId, institutionId))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "A portal account already exists for this institution" });
      return;
    }

    const [created] = await db
      .insert(institutionPortalAccounts)
      .values({
        institutionId,
        email: email.toLowerCase(),
        passwordHash,
        createdBy: req.contributor!.id,
      })
      .returning({ id: institutionPortalAccounts.id, email: institutionPortalAccounts.email });

    res.json({
      id: created.id,
      email: created.email,
      password: plainPassword,  // Only shown once
    });
  },
);
```

---

## Decision: Auth Isolation Strategy

### Option A: Separate Express Router (Recommended)

Mount all institution portal routes under `/api/portal`. Apply `portalAuthMiddleware` to protected routes. CM admin creation endpoint (`POST /api/portal/admin/create-portal-account`) uses existing `authMiddleware + requireRole("community_manager")`.

**Pros:**
- Zero infrastructure changes (no DNS, no TLS certs, no CORS changes)
- Clean isolation: portal middleware cannot be accidentally applied to admin routes
- Follows established precedent (`/api/challenger` portal in this codebase)
- Frontend uses same `apiClient` with `credentials: "include"` — no proxy changes needed
- Dev environment "just works" — no subdomain setup required

**Cons:**
- URL is `app.indomitableunity.org/portal/...` not `portal.indomitableunity.org` — slightly less branded
- A bug in route registration could theoretically expose a portal route without auth (mitigated by router-level middleware)

**Confidence:** HIGH

### Option B: Subdomain (`portal.indomitableunity.org`)

**Pros:**
- Strong psychological separation for institution contacts (different URL)
- Can be independently deployed/scaled

**Cons (decisive for this phase):**
- Requires DNS CNAME or A record configuration
- Requires TLS certificate for `portal.indomitableunity.org`
- CORS must be updated to allow cross-origin credentials (complex — `sameSite: "lax"` cookies do not cross origins)
- Cookie sharing across subdomains requires `domain: ".indomitableunity.org"` — introduces security risk if any subdomain is compromised
- Dev environment requires hosts file editing or local DNS setup
- Adds deployment complexity with no functional benefit at pilot scale
- The "subdomain = better security" argument is false: it adds attack surface (broader cookie domain) and does not add meaningful auth isolation beyond what a separate router provides

**Confidence:** HIGH — this option adds cost with no benefit at pilot scale.

**Verdict: Use Option A (separate Express router).**

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| express-session + database sessions | Stateless JWT cookies | ~2020+ | No session table needed; tokens are self-contained |
| passport.js multi-strategy | Custom middleware per identity type | This codebase | Simpler, more explicit, easier to audit |
| Storing institutionId in session store | Embedding institutionId in JWT payload | This design | No DB lookup on every request |

**Deprecated/outdated:**
- `express-session` with `connect-pg-simple`: Not used here. Don't introduce it — it adds a session table requirement and statefulness.
- `passport.js`: Not in the codebase. Don't introduce it for portal auth.

---

## Open Questions

1. **Should CMs be able to deactivate a portal account, or only delete and recreate?**
   - What we know: The `isActive` flag exists in the proposed schema.
   - What's unclear: Whether the CM UI needs a deactivate toggle or just delete.
   - Recommendation: Support `PATCH /api/portal/admin/:accountId/active` with `{ isActive: boolean }` — mirrors the institution toggle pattern already in the codebase.

2. **What should happen when an institution is deleted while a portal account exists?**
   - What we know: `institutionPortalAccounts.institutionId` FK has `ON DELETE CASCADE` in the proposed schema.
   - What's unclear: Whether the CM needs a warning before deleting an institution that has a portal account.
   - Recommendation: Cascade delete is correct. Surface a warning in the CM UI ("This institution has an active portal account — deleting will revoke portal access").

3. **Is there a "forgot password" flow for portal users?**
   - What we know: Out of scope (PORTAL-01 says CM creates accounts, no self-service). Contributor system has forgot-password via email.
   - What's unclear: Whether the CM should be able to reset the portal password.
   - Recommendation: Add `POST /api/portal/admin/:accountId/reset-password` returning a new plaintext password (CM copies it to the contact). Same pattern as contributor `createAccountForContributor`. No email flow needed.

4. **Portal route URL prefix: `/portal` or `/institution-portal`?**
   - What we know: `ChallengerRoute` uses `/challenger`. Consistency would suggest `/portal`.
   - What's unclear: Nothing technically blocking `/portal`.
   - Recommendation: Use `/portal` on the frontend (`/portal/login`, `/portal/dashboard`) and `/api/portal` on the backend. Short and clear.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection:
  - `packages/server/src/middleware/auth.ts` — JWT cookie pattern, jose usage, role guard
  - `packages/server/src/services/auth.service.ts` — createTokens, setAuthCookies, argon2 hashing, cookie path scoping
  - `packages/server/src/routes/auth.ts` — login, refresh, create-account patterns
  - `packages/server/src/express-app.ts` — route mounting, no subdomain
  - `packages/server/src/db/schema.ts` — all table definitions, contributorRoleEnum, institutions table
  - `packages/server/src/routes/admin.ts` — attention flag queries, PDF endpoint, stats aggregation
  - `packages/web/src/App.tsx` — route structure, ChallengerRoute precedent
  - `packages/web/src/components/layout/CMRoute.tsx` — route guard pattern
  - `packages/web/src/components/layout/ProtectedRoute.tsx` — loading/redirect pattern
  - `packages/web/src/hooks/useAuth.ts` — AuthProvider structure, queryKey pattern
  - `packages/web/src/api/client.ts` — apiClient with refresh intercept
  - `packages/web/src/api/attention.ts` — attention API call patterns

### Secondary (MEDIUM confidence)

- jose library: self-documenting (used extensively in codebase, same patterns verified)
- argon2 library: used in `auth.service.ts`, same hashing/verify API confirmed

### Tertiary (LOW confidence)

- None — all claims are grounded in direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from package.json and codebase
- Auth isolation strategy: HIGH — both options fully analysed; decision follows directly from project constraints
- DB schema: HIGH — modelled directly on existing schema.ts patterns
- Architecture: HIGH — modelled on ChallengerRoute precedent which already exists
- Frontend patterns: HIGH — direct inspection of CMRoute, ProtectedRoute, AuthProvider
- Pitfalls: HIGH — derived from reading the actual cookie/JWT implementation

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable stack — no fast-moving dependencies)
