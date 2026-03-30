---
phase: 18
plan: "01"
subsystem: institution-portal
tags: [auth, jwt, portal, institution, middleware, frontend]
dependency_graph:
  requires:
    - "packages/server/src/db/schema.ts (institutions table)"
    - "packages/server/src/middleware/auth.ts (authMiddleware, requireRole)"
    - "packages/server/src/services/auth.service.ts (argon2, jose patterns)"
  provides:
    - "institution_portal_accounts DB table with unique-active constraint"
    - "portal JWT tokens (type=portal) via separate cookies"
    - "portal auth endpoints: /api/portal/login, /logout, /refresh, /me, /admin/*"
    - "portalAuthMiddleware rejecting contributor tokens"
    - "PortalAuthProvider context + usePortalAuth hook"
    - "InstitutionPortalRoute guard at /portal/*"
    - "PortalLogin page at /portal/login"
  affects:
    - "packages/server/src/express-app.ts (new /api/portal mount)"
    - "packages/web/src/App.tsx (new portal route tree)"
tech_stack:
  added: []
  patterns:
    - "Separate portal cookies: portal_access_token + portal_refresh_token"
    - "JWT type discriminant: type=portal blocks contributor tokens and vice versa"
    - "Partial unique index enforces one active portal account per institution"
    - "PortalAuthProvider isolated from AuthProvider — separate React context tree"
key_files:
  created:
    - packages/server/migrations/0006_institution_portal_accounts.sql
    - packages/server/scripts/apply-migration-0006.mjs
    - packages/server/src/services/portal-auth.service.ts
    - packages/server/src/middleware/portal-auth.ts
    - packages/server/src/routes/portal/portal-auth.ts
    - packages/web/src/api/portal.ts
    - packages/web/src/contexts/PortalAuthContext.tsx
    - packages/web/src/hooks/usePortalAuth.ts
    - packages/web/src/components/layout/InstitutionPortalRoute.tsx
    - packages/web/src/pages/portal/PortalLogin.tsx
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/src/express-app.ts
    - packages/web/src/App.tsx
decisions:
  - "Portal auth uses type=portal JWT discriminant rather than separate secret — same JWT_SECRET, type field provides isolation"
  - "Partial unique index (WHERE is_active=true) allows historical deactivated accounts while enforcing one active per institution"
  - "PortalAuthProvider placed on individual route elements in App.tsx (not wrapping full app) to ensure complete context isolation"
  - "Portal routes placed outside AppShell route — portal has its own minimal layout (no contributor nav)"
metrics:
  duration: "~25 min"
  completed: "2026-03-30"
  commits: 2
---

# Phase 18 Plan 01: Institution Portal Authentication Summary

Institution portal auth layer built end-to-end: DB table with unique-active constraint, server-side JWT service with type=portal discriminant, portal-specific middleware that rejects contributor tokens, full CRUD admin routes for CM account management, and frontend portal context/route guard/login page fully isolated from the contributor auth system.

## What Was Built

### Server Side

**Migration `0006_institution_portal_accounts.sql`** creates the `institution_portal_accounts` table with a partial unique index `WHERE is_active = true` — enforcing exactly one active portal account per institution while preserving deactivated history.

**`portal-auth.service.ts`** provides:
- `createPortalTokens(portalAccountId, institutionId)` — JWT access token (15m, `type: "portal"`) + refresh token (7d, `type: "portal_refresh"`)
- `setPortalAuthCookies` / `clearPortalAuthCookies` — `portal_access_token` (path `/`) and `portal_refresh_token` (path `/api/portal/refresh`)
- `portalLogin(email, password)` — looks up active account by lowercased email, verifies with argon2
- `PortalAuthError` class with `statusCode`

**`portal-auth.ts` middleware** reads `portal_access_token`, verifies JWT, checks `payload.type === "portal"` (rejects contributor tokens), attaches `req.portalUser = { id, institutionId }`. Returns 401 for missing/invalid/wrong-type tokens.

**`routes/portal/portal-auth.ts`** mounts at `/api/portal`:
- `POST /login` — validates with zod, calls `portalLogin()`, sets cookies
- `POST /logout` — clears portal cookies, no auth required
- `POST /refresh` — verifies `portal_refresh_token`, re-reads account from DB for freshness, issues new tokens
- `GET /me` — protected by `portalAuthMiddleware`, joins institutions for name
- `POST /admin/create-portal-account` — protected by `authMiddleware + requireRole("community_manager")`, generates random password if not provided, enforces 409 if active account exists
- `PATCH /admin/:accountId/active` — CM-only, deactivate/reactivate accounts
- `POST /admin/:accountId/reset-password` — CM-only, generates new random password

### Frontend

**`api/portal.ts`** — portal-specific fetch wrapper with its own `attemptPortalRefresh()` that hits `/api/portal/refresh` (not `/api/auth/refresh`). Exports `portalLogin`, `portalLogout`, `getPortalMe`, and `PortalUser` type.

**`PortalAuthContext.tsx`** — `PortalAuthProvider` with `useQuery(["portal-me"])`, login/logout mutations, 401 suppression pattern. Completely separate from `AuthProvider`.

**`usePortalAuth.ts`** — thin re-export from context.

**`InstitutionPortalRoute.tsx`** — mirrors `CMRoute.tsx`, redirects to `/portal/login` when unauthenticated.

**`PortalLogin.tsx`** — centered card form with "Institution Portal" heading, email + password inputs, error display via `Alert`, navigates to `/portal/dashboard` on success.

**`App.tsx`** — `/portal/login` and `/portal/*` routes added as siblings to the AppShell route (outside it), each wrapping with `PortalAuthProvider`. No AppShell nav bar on portal pages.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error: `req.params.accountId` typed as `string | string[]`**
- **Found during:** Task 1 TypeScript check
- **Issue:** `req.params.accountId` is typed `string | string[]` in Express, causing `eq()` type mismatch
- **Fix:** Cast with `const accountId = req.params.accountId as string` in PATCH and POST reset-password handlers
- **Files modified:** `packages/server/src/routes/portal/portal-auth.ts`
- **Commit:** 5b8ec5d

**2. [Rule 2 - Missing export] Export `PortalAuthContextValue` interface**
- **Found during:** Task 2 TypeScript check
- **Issue:** `usePortalAuth.ts` inferred return type used unexported `PortalAuthContextValue` from context module
- **Fix:** Added `export` to `interface PortalAuthContextValue`
- **Files modified:** `packages/web/src/contexts/PortalAuthContext.tsx`
- **Commit:** 9ea17fa

## Commits

| Hash | Message |
|------|---------|
| 5b8ec5d | feat(18-01): portal DB table, auth service, middleware, and server routes |
| 9ea17fa | feat(18-01): portal frontend auth context, route guard, login page, and routing |

## Self-Check: PASSED

- `packages/server/migrations/0006_institution_portal_accounts.sql` — FOUND
- `packages/server/src/services/portal-auth.service.ts` — FOUND
- `packages/server/src/middleware/portal-auth.ts` — FOUND
- `packages/server/src/routes/portal/portal-auth.ts` — FOUND
- `packages/web/src/contexts/PortalAuthContext.tsx` — FOUND
- `packages/web/src/components/layout/InstitutionPortalRoute.tsx` — FOUND
- `packages/web/src/pages/portal/PortalLogin.tsx` — FOUND
- Commit 5b8ec5d — FOUND
- Commit 9ea17fa — FOUND
- `npx tsc --noEmit` (server) — PASSED
- `npx tsc --noEmit` (web) — PASSED
