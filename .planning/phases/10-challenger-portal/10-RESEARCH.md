# Phase 10: Challenger Portal - Research

**Researched:** 2026-03-16
**Domain:** Full-stack self-service portal — Express REST API + React SPA, role-scoped auth, schema extension, Drizzle ORM
**Confidence:** HIGH

---

## Summary

Phase 10 builds a self-service portal for challenger organisations to register, submit challenge briefs, track their challenges, monitor circle progress, and rate completed resolutions. It depends entirely on Phase 9's `challenger` role enum and `challenger_organisations` table, both of which are verified in production (`09-VERIFICATION.md` passed 5/5).

The critical architectural insight is that **the `challenger` role already slots into the existing JWT/cookie auth system** — `contributorRoleEnum` already includes `"challenger"`, `requireRole("challenger")` will work out of the box, and `ProtectedRoute` already redirects based on `contributor.status`. The bulk of this phase is: (1) extending `challengerOrganisations` schema with missing columns (`organisationType`, `contributorId` FK), (2) adding challenger-scoped registration and challenge-submission endpoints, (3) building the React portal pages, and (4) routing challenger users into the portal rather than the contributor onboarding flow.

The main complexity lies in the **registration path**: a challenger org needs a `contributor` record (for JWT auth), a `challengerOrganisations` record (for org metadata), and the `contributor.role` must be `"challenger"` rather than the default `"contributor"`. The second complexity is **status tracking for their submitted challenges** — the existing `challengeStatusEnum` already covers `draft | open | closed | archived`, and challenges submitted by challengers must start as `"draft"` pending CM review, which differs from CM-created challenges (which start as `"open"`).

**Primary recommendation:** Extend existing auth, schema, and route patterns verbatim. Do not create a parallel auth system. The challenger is just another role in the JWT — the session cookie is the same mechanism.

---

## Standard Stack

### Core (all already in use — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^4.21.0 | HTTP server, routing | Already in use |
| drizzle-orm | ^0.38.0 | DB ORM, migrations | Already in use |
| zod | ^3.24.0 | Schema validation (server + shared) | Already in use |
| jose | ^5.9.0 | JWT sign/verify | Already in use |
| argon2 | ^0.41.0 | Password hashing | Already in use |
| react + react-router | ^19 / ^7.1 | SPA routing | Already in use |
| @tanstack/react-query | ^5.62.0 | Server state, caching | Already in use |
| tailwindcss | ^4.0.0 | Utility CSS | Already in use |

### Supporting (already in use)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-kit | ^0.30.0 | Migration generation | For schema changes (add cols to `challenger_organisations`) |
| resend | ^4.1.0 | Transactional email | If welcome email on registration is desired |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending existing cookie/JWT auth | A separate API-key portal auth | API key auth (VANTAGE pattern) is for machine-to-machine. Human portal users need session cookies and JWT refresh like existing contributors |
| Extending `challenger_organisations` | New separate session table | Unnecessary — FK from `contributors.id` to `challenger_organisations` is the clean relational pattern |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

New files follow existing conventions exactly:

```
packages/
├── shared/src/
│   ├── schemas/
│   │   └── challenger.ts          # Zod schemas: registerChallengerSchema, submitChallengeSchema (challenger draft)
│   └── types/
│       └── challenger.ts          # ChallengerOrg, ChallengerChallenge (portal view), etc.
├── server/src/
│   ├── routes/
│   │   └── challenger.ts          # /api/challenger/* — all challenger portal endpoints
│   └── db/
│       └── schema.ts              # Extend challengerOrganisations: add organisationType, contributorId
│   drizzle/
│       └── 0003_challenger-portal.sql  # Migration: ALTER TABLE challenger_organisations ADD COLUMN ...
└── web/src/
    ├── api/
    │   └── challenger.ts          # apiClient wrappers for all challenger endpoints
    ├── hooks/
    │   └── useChallenger.ts       # React Query hooks for challenger portal
    └── pages/
        └── challenger/
            ├── ChallengerRegister.tsx
            ├── ChallengerDashboard.tsx
            ├── SubmitChallenge.tsx
            └── ChallengeStatus.tsx
```

### Pattern 1: Challenger Registration — Two-table Insert in Transaction

**What:** Challenger registration creates both a `contributors` record (role = `"challenger"`) and a `challenger_organisations` record in a single transaction. If either insert fails, both roll back.

**When to use:** Any registration flow that requires multiple related records.

**Example (based on existing `db.transaction` pattern in circles.ts):**
```typescript
// Source: packages/server/src/routes/circles.ts (db.transaction pattern)
const result = await db.transaction(async (tx) => {
  const [contributor] = await tx
    .insert(contributors)
    .values({
      name: body.contactName,
      email: body.email.toLowerCase(),
      passwordHash,
      authProvider: "email",
      role: "challenger",       // <-- CRITICAL: not the default "contributor"
      status: "active",         // <-- challengers skip onboarding
    })
    .returning();

  const [org] = await tx
    .insert(challengerOrganisations)
    .values({
      name: body.organisationName,
      contactEmail: body.email.toLowerCase(),
      contributorId: contributor.id,    // <-- new FK column needed
      organisationType: body.organisationType,  // <-- new column needed
    })
    .returning();

  return { contributor, org };
});
```

### Pattern 2: Role-Scoped Endpoint Guard

**What:** `requireRole("challenger")` gates all challenger portal endpoints. This already works — `requireRole` in `middleware/auth.ts` checks `req.contributor.role` against the passed role, and allows `"admin"` through regardless.

**When to use:** All `/api/challenger/*` routes except `/register`.

**Example (based on existing pattern in challenges.ts):**
```typescript
// Source: packages/server/src/routes/challenges.ts line 155
router.post("/", authMiddleware, requireRole("community_manager"), async (req, res) => { ... });
// For challenger:
router.get("/my-challenges", authMiddleware, requireRole("challenger"), async (req, res) => { ... });
```

### Pattern 3: Challenge Submission → Draft Status

**What:** When a challenger submits a challenge brief via the portal, it inserts into `challenges` with `status: "draft"`. CM then reviews and promotes to `"open"`. The existing `updateChallengeSchema` and `PUT /api/challenges/:id` (CM-only) already handle status transitions.

**When to use:** `POST /api/challenger/challenges` route.

**Example:**
```typescript
// Source: pattern from packages/server/src/routes/challenges.ts line 165-176
const [created] = await db
  .insert(challenges)
  .values({
    ...rest,
    deadline: deadline ?? null,
    createdBy: req.contributor!.id,   // challenger's contributor.id
    status: "draft",                  // <-- differs from CM-created ("open")
  })
  .returning();
```

### Pattern 4: React Query Hooks for Challenger Data

**What:** Follow exactly the same hook pattern as `useChallenges.ts` — one hook per resource type, `useQuery` for reads, `useMutation` for writes.

**When to use:** All challenger portal data fetching.

**Example (based on existing hooks):**
```typescript
// Source: packages/web/src/hooks/useChallenges.ts pattern
export function useMyChallenges() {
  return useQuery({
    queryKey: ["challenger", "challenges"],
    queryFn: challengerApi.getMyChallenges,
  });
}
```

### Pattern 5: Role-Based Route Guard in React Router

**What:** `ProtectedRoute` currently redirects `onboarding` status users to `/onboarding/upload`. A `ChallengerRoute` component (or extension of `ProtectedRoute`) should redirect challengers away from contributor-only pages and into `/challenger/*`.

**When to use:** All `/challenger/*` routes in `App.tsx`.

**Example (based on ProtectedRoute pattern):**
```typescript
// Source: packages/web/src/components/layout/ProtectedRoute.tsx
export function ChallengerRoute() {
  const { contributor, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (contributor?.role !== "challenger" && contributor?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
```

### Anti-Patterns to Avoid

- **Separate challenger auth system:** Do not create a separate session mechanism. Challengers use the same `access_token` + `refresh_token` cookie pair, same JWT, same `/api/auth/me` endpoint.
- **Exposing CM-only endpoints to challenger:** The existing `requireRole("community_manager")` guard on challenge creation must not be removed or bypassed. Challenger challenge submission uses a *new* route at `/api/challenger/challenges`, not the existing CM route.
- **Status confusion:** Existing `POST /api/challenges` creates challenges with status `"open"`. Challenger `POST /api/challenger/challenges` must create with status `"draft"`. Do not modify the existing route.
- **Omitting contributorId from challengerOrganisations:** The `challengerOrganisations` table currently has no FK back to `contributors`. This must be added in the migration. Without it there is no way to look up an org's own data after authentication.
- **Skipping migration for new columns:** The `challengerOrganisations` table needs `organisation_type` and `contributor_id` columns. These must go through a Drizzle migration (`drizzle-kit generate` → named SQL file → `drizzle-kit migrate`). Do not hand-edit the migration history.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom hash logic | `argon2` (already installed) | Timing-safe, memory-hard — same as existing registration |
| JWT creation/verification | Custom token logic | `jose` (already installed) | HS256 with `setAuthCookies` pattern already correct |
| Zod validation in routes | Manual `if (!body.x)` checks | `schema.safeParse(req.body)` pattern from existing routes | Consistent error shape, type inference |
| DB transactions | Manual try/catch rollback | `db.transaction(async (tx) => { ... })` | Already proven in circles.ts |
| Rating storage | New ratings table | Existing `resolutionRatings` table | CHAL-06 is just the UI + endpoint pointing to the existing table — the challenger is already `isChallenger()` in circles.ts |

**Key insight:** The rating endpoint already exists (`POST /api/circles/:id/resolution/rating`) and the `isChallenger()` check already works by checking `challenges.createdBy`. Phase 10's CHAL-06 is primarily about exposing this to challenger portal users in the UI — not building new server logic.

---

## Common Pitfalls

### Pitfall 1: Missing `contributorId` FK on `challengerOrganisations`

**What goes wrong:** After registration, the server cannot look up "which org is this authenticated challenger?" without querying by email (fragile) or scanning `challenges.createdBy`.
**Why it happens:** Phase 9 created `challengerOrganisations` as a stub table without a back-reference to `contributors`.
**How to avoid:** Migration `0003` must `ALTER TABLE challenger_organisations ADD COLUMN contributor_id uuid REFERENCES contributors(id)`. Add this to `schema.ts` simultaneously.
**Warning signs:** Any route that needs `WHERE challengerOrganisations.contributor_id = req.contributor.id` will fail to compile or return wrong results.

### Pitfall 2: Challenger `status` Default Creates Onboarding Loop

**What goes wrong:** `contributors` table has `status` defaulting to `"onboarding"`. `ProtectedRoute` redirects `onboarding` status users to `/onboarding/upload`. A challenger registered with `status: "onboarding"` would be trapped in the contributor onboarding flow.
**Why it happens:** The default status in `schema.ts` is `"onboarding"` — if the registration service doesn't explicitly set `status: "active"`, the new challenger gets the default.
**How to avoid:** The challenger registration insert must explicitly set `status: "active"`. `ProtectedRoute` (or a new `ChallengerRoute`) must be extended to not redirect `"challenger"` role users to `/onboarding/upload`.
**Warning signs:** After challenger registration, user is immediately redirected to CV upload page.

### Pitfall 3: `requireRole` Strictness

**What goes wrong:** `requireRole("challenger")` allows only `"challenger"` or `"admin"`. A `"community_manager"` cannot test challenger portal endpoints without switching to admin role.
**Why it happens:** `requireRole` in `middleware/auth.ts` is intentionally strict — only exact match or `"admin"`.
**How to avoid:** This is correct behaviour. Use the existing `/api/auth/dev-role` switcher in development (note: it currently only allows `contributor | community_manager | admin`). The dev-role endpoint must be updated to include `"challenger"` in its allowed roles for testing.
**Warning signs:** 403 when testing challenger endpoints with `community_manager` session.

### Pitfall 4: CHAL-05 Circle Data — Ownership Check

**What goes wrong:** A challenger should only see circles for their own challenges. A naive `GET /api/challenger/my-challenges` query that joins `circles` could leak circle data from challenges owned by other challengers if the WHERE clause is incorrect.
**Why it happens:** The `challenges.createdBy` foreign key is the ownership field, but the `challenger_organisations.contributor_id` → `contributors.id` link must be traversed correctly.
**How to avoid:** All challenger queries use `WHERE challenges.created_by = req.contributor.id`. Never use `WHERE challenger_organisations.name = ...` or other indirect lookups.

### Pitfall 5: Draft Challenge Visibility in Existing Contributor Feed

**What goes wrong:** The existing `GET /api/challenges` (contributor feed) filters by `status = "open"`. Draft challenges are already excluded. However, the existing CM `PUT /api/challenges/:id` route only guards against the edit-lock (interestCount > 0) and does not prevent a CM from publishing (`status: "open"`) a draft challenge without review. This is a workflow concern, not a code bug.
**Why it happens:** The existing CM routes treat `"draft"` as just another status value.
**How to avoid:** Acceptable behaviour — CMs are trusted users. Just ensure the VANTAGE feed (`GET /api/vantage/challenges`) also filters out drafts (it already does: `eq(challenges.status, "open")`).

---

## Code Examples

Verified patterns from existing codebase:

### Registration with role override (must set role and status explicitly)
```typescript
// Source: packages/server/src/services/auth.service.ts register()
// Challenger version — same pattern, different field values:
const [contributor] = await tx
  .insert(contributors)
  .values({
    name: body.contactName,
    email: body.email.toLowerCase(),
    passwordHash: await argon2.hash(body.password),
    authProvider: "email",
    role: "challenger",   // override default "contributor"
    status: "active",     // override default "onboarding"
  })
  .returning({ id, name, email, role, status });
```

### Challenger-owned challenge query (filtering by ownership)
```typescript
// Source: packages/server/src/routes/challenges.ts GET /my-interests pattern
const myChallenges = await db
  .select()
  .from(challenges)
  .where(eq(challenges.createdBy, req.contributor!.id))
  .orderBy(desc(challenges.createdAt));
```

### Circle data for a specific challenge (for CHAL-05)
```typescript
// Source: packages/server/src/routes/circles.ts GET / pattern, adapted
const circlesForChallenge = await db
  .select({
    id: circles.id,
    status: circles.status,
    memberCount: sql<number>`COUNT(${circleMembers.id})::int`,
  })
  .from(circles)
  .leftJoin(circleMembers, eq(circleMembers.circleId, circles.id))
  .where(eq(circles.challengeId, challengeId))
  .groupBy(circles.id);
```

### Route mounting pattern (App.tsx)
```typescript
// Source: packages/web/src/App.tsx
// Add under protected routes:
<Route element={<ChallengerRoute />}>
  <Route path="/challenger" element={<ChallengerDashboard />} />
  <Route path="/challenger/submit" element={<SubmitChallenge />} />
  <Route path="/challenger/challenges/:id" element={<ChallengeStatus />} />
</Route>
```

---

## Schema Changes Required

### `challengerOrganisations` — Two new columns needed

Current (from Phase 9):
```sql
"id", "name", "contact_email", "api_key_id", "created_at", "updated_at"
```

Required additions:
```sql
ALTER TABLE "challenger_organisations"
  ADD COLUMN "contributor_id" uuid REFERENCES "contributors"("id") ON DELETE cascade,
  ADD COLUMN "organisation_type" varchar(100) NOT NULL DEFAULT '';
```

Note: `organisation_type` is required per CHAL-01 ("organisation type"). The set of values is not specified in the requirements — use `varchar(100)` (free text or a small enum). A pg enum is heavier; given no fixed taxonomy is defined, a `varchar(100)` with a check constraint or application-level validation is sufficient. If a fixed taxonomy is wanted, add a `pgEnum` to `schema.ts`.

### Drizzle migration workflow (established pattern):
```bash
# In packages/server:
pnpm db:generate   # generates 0003_challenger-portal.sql
# Manually name/rename to 0003_challenger-portal.sql
pnpm db:migrate    # applies to DB
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| CM-only challenge creation | Challenger self-submit (draft status) | Challengers become first-class actors; CM workflow shifts to review/approve |
| contributorId implicitly absent from challengerOrganisations | Add contributorId FK in Phase 10 migration | Required for auth-scoped queries |

**Deprecated/outdated:**
- Nothing deprecated. All Phase 9 artifacts are correct and intact.

---

## Open Questions

1. **Organisation type taxonomy — fixed enum or free text?**
   - What we know: CHAL-01 says "organisation type" is a required registration field. No fixed list is defined in the requirements.
   - What's unclear: Should the type be a pg enum (e.g., `charity | ngo | public_sector | private | education`) or free-text varchar?
   - Recommendation: Use `varchar(100)` for now (free text, validated as non-empty by Zod). Can be upgraded to an enum in a future phase if needed. This avoids a migration-heavy decision now.

2. **Should `challenger` role be blocked in dev-role switcher?**
   - What we know: `routes/auth.ts` dev-role endpoint hard-codes `["contributor", "community_manager", "admin"]`.
   - What's unclear: Is blocking `"challenger"` intentional (to force proper registration path) or an oversight?
   - Recommendation: Add `"challenger"` to the dev-role allowed list to unblock local testing. This is development scaffolding only.

3. **Should `ProtectedRoute` route challengers to `/challenger` instead of `/dashboard`?**
   - What we know: `ProtectedRoute` currently redirects authenticated, non-onboarding users to the requested page or `/dashboard`. A challenger visiting `/dashboard` will see the contributor dashboard.
   - What's unclear: Is the contributor dashboard useful to challengers?
   - Recommendation: Update `ProtectedRoute` to redirect `contributor.role === "challenger"` to `/challenger` as the home page, or create a separate `ChallengerRoute` guard component.

4. **Email notification on challenge status change (draft → open)?**
   - What we know: The `resend` package is installed and used for password reset. No challenge status notification exists yet.
   - What's unclear: Requirements do not mention email notifications.
   - Recommendation: Out of scope for Phase 10. If desired, it's a one-liner in the CM's `PUT /api/challenges/:id` route when status transitions from `draft` to `open`.

---

## Sources

### Primary (HIGH confidence)
- `/packages/server/src/db/schema.ts` — Full schema including `challengerOrganisations`, `contributors`, `challenges`, `circles`, `resolutionRatings`
- `/packages/server/src/middleware/auth.ts` — `authMiddleware`, `requireRole` exact implementation
- `/packages/server/src/services/auth.service.ts` — Registration, JWT, cookie pattern
- `/packages/server/src/routes/challenges.ts` — Challenge CRUD, status handling, ownership
- `/packages/server/src/routes/circles.ts` — `isChallenger()`, `canAccessCircle()`, resolution rating flow
- `/packages/web/src/App.tsx` — Routing structure, `ProtectedRoute` usage
- `/packages/web/src/hooks/useAuth.ts` — Auth context, React Query pattern
- `/packages/web/src/components/layout/ProtectedRoute.tsx` — Role/status redirect logic
- `/packages/server/drizzle/0002_add-challenger-role-and-orgs.sql` — Migration confirming current `challenger_organisations` columns
- `/.planning/phases/09-server-foundation-and-vantage/09-VERIFICATION.md` — Confirmed Phase 9 is fully verified

### Secondary (MEDIUM confidence)
- Phase requirements description (provided in task context) — defines CHAL-01 through CHAL-06 scope

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified by reading installed `package.json` files
- Schema extension: HIGH — read current `schema.ts` and migration SQL, gaps identified precisely
- Architecture patterns: HIGH — derived directly from existing route and hook implementations
- Auth/role mechanics: HIGH — read `middleware/auth.ts` and `auth.service.ts` source
- Pitfalls: HIGH — identified from actual schema gaps and existing code logic; not speculative

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable — no fast-moving dependencies; all libraries are locked versions in monorepo)
