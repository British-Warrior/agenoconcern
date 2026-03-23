# Phase 14: CM Attention Dashboard - Research

**Researched:** 2026-03-23
**Domain:** Express route design with DB-scoped institution filtering, Drizzle ORM joins, TanStack Query mutations with optimistic-clear UX, React CM-route guard patterns
**Confidence:** HIGH

## Summary

Phase 14 builds entirely on patterns already established and working in the codebase. There are no new npm packages required. The server side follows the `adminRouter` pattern exactly: `router.use(authMiddleware, requireRole("community_manager"))` at the top, then route handlers that derive the CM's institution from `req.contributor.id` via a DB lookup — never from a request parameter or JWT claim. The `ithink_attention_flags` table with `clearedBy`, `clearedAt`, and `followUpNotes` columns was created and verified in Phase 13.

The critical security constraint is institution scoping from DB, not from query parameters. The CM's institution must be fetched at the start of every handler by joining `contributors` → `contributor_institutions` → `institutions`. This prevents parameter-manipulation attacks where a CM could request flags for a different institution by changing a query string value. The `requireRole("community_manager")` middleware already handles authentication and role checking, but does NOT enforce institution scope — that is the handler's responsibility.

The frontend follows the `useInstitutions` / `admin.ts` API client / `CMRoute` pattern exactly. A new `useAttention.ts` hook file, a new `api/attention.ts` API client, and a new `AttentionDashboard.tsx` page are all that is needed. The page adds a new route inside the existing `<Route element={<CMRoute />}>` block in `App.tsx`. The resolve action (POST to clear a flag) requires a confirm-before-submit pattern — the same `ConfirmDialog` pattern from `InstitutionManagement.tsx` is directly reusable.

**Primary recommendation:** Implement the server routes in `adminRouter` (or a new `attentionRouter` mounted at `/api/admin`) using the same `requireRole("community_manager")` middleware, derive institution from DB using `req.contributor.id`, and build the frontend as a direct parallel of `useInstitutions` + `InstitutionManagement.tsx`.

## Standard Stack

### Core (no new packages required)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` | 0.38.x (existing) | `ithinkAttentionFlags`, `contributorInstitutions`, `contributors` queries | Already the project ORM; tables already exist |
| `express` | existing | Route handlers on `adminRouter` | Already used for all admin routes |
| `@tanstack/react-query` | existing | `useQuery` for flags list, `useMutation` for resolve action | Already used for all data fetching |
| `react-router` | existing | `CMRoute` guard, new route in `App.tsx` | Already used for all routing |
| `zod` | existing | Resolve request body validation (`followUpNotes` required string) | Already used throughout |

### No new packages needed
All libraries are existing. No installation step required.

## Architecture Patterns

### Recommended File Structure (additions only)

```
packages/server/src/
└── routes/
    └── admin.ts                      # ADD two new routes to existing adminRouter

packages/web/src/
├── api/
│   └── attention.ts                  # NEW: typed API client for attention endpoints
├── hooks/
│   └── useAttention.ts               # NEW: TanStack Query hooks for attention
└── pages/
    └── admin/
        └── AttentionDashboard.tsx    # NEW: CM attention dashboard page
```

`App.tsx` — add one route inside existing `<Route element={<CMRoute />}>` block.

### Pattern 1: Institution Scoping from DB (CRITICAL SECURITY PATTERN)

**What:** Every attention route handler must look up the CM's institution via `req.contributor.id` through the `contributor_institutions` junction table. Never trust a client-supplied institution ID.

**When to use:** Every handler in the attention API.

**Example:**
```typescript
// Source: existing admin.ts pattern + contributor_institutions junction (Phase 12)
router.get("/attention", async (req, res) => {
  const cmId = req.contributor!.id;
  const db = getDb();

  // Derive CM's institution from DB — never from request parameter
  const [assignment] = await db
    .select({ institutionId: contributorInstitutions.institutionId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.contributorId, cmId))
    .limit(1);

  if (!assignment) {
    res.status(403).json({ error: "No institution assigned to this community manager" });
    return;
  }

  const institutionId = assignment.institutionId;

  // Now query flags scoped to THIS institution only
  const flags = await db
    .select({ ... })
    .from(ithinkAttentionFlags)
    .innerJoin(contributors, eq(contributors.id, ithinkAttentionFlags.contributorId))
    .where(
      and(
        eq(ithinkAttentionFlags.institutionId, institutionId),
        isNull(ithinkAttentionFlags.clearedAt),   // unresolved only
      ),
    )
    .orderBy(desc(ithinkAttentionFlags.createdAt));

  res.json(flags);
});
```

### Pattern 2: requireRole Applied at Router Level

**What:** `router.use(authMiddleware, requireRole("community_manager"))` at the top of the router — all routes are automatically protected. This is already how `adminRouter` works.

**When to use:** All admin routes — already established, no change needed.

**Example:**
```typescript
// Source: existing packages/server/src/routes/admin.ts lines 37-38
router.use(authMiddleware, requireRole("community_manager"));
```

Note: `requireRole` already allows `admin` role to pass through (`req.contributor.role !== role && req.contributor.role !== "admin"` — see `auth.ts` line 62). No change needed.

### Pattern 3: Resolve Flag with Follow-Up Notes

**What:** `POST /api/admin/attention/:flagId/resolve` — validates UUID param, validates body (`followUpNotes` required), checks flag belongs to CM's institution (DB scoped), updates `clearedBy`, `clearedAt`, `followUpNotes`, `updatedAt` on the flag row.

**When to use:** ATTN-03 resolve action.

**Example:**
```typescript
// Source: existing UUID_PATTERN + admin.ts update pattern
router.post("/attention/:flagId/resolve", async (req, res) => {
  const flagId = req.params["flagId"] as string;

  if (!UUID_PATTERN.test(flagId)) {
    res.status(400).json({ error: "Invalid flag ID" });
    return;
  }

  const result = resolveAttentionFlagSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const cmId = req.contributor!.id;
  const db = getDb();

  // Derive CM's institution
  const [assignment] = await db
    .select({ institutionId: contributorInstitutions.institutionId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.contributorId, cmId))
    .limit(1);

  if (!assignment) {
    res.status(403).json({ error: "No institution assigned to this community manager" });
    return;
  }

  // Fetch the flag — verify it exists AND belongs to CM's institution
  const [flag] = await db
    .select({ id: ithinkAttentionFlags.id, clearedAt: ithinkAttentionFlags.clearedAt })
    .from(ithinkAttentionFlags)
    .where(
      and(
        eq(ithinkAttentionFlags.id, flagId),
        eq(ithinkAttentionFlags.institutionId, assignment.institutionId),
      ),
    )
    .limit(1);

  if (!flag) {
    // 404 regardless of whether flag exists or belongs to different institution
    // Avoids leaking which flags exist across institutions
    res.status(404).json({ error: "Flag not found" });
    return;
  }

  if (flag.clearedAt) {
    res.status(409).json({ error: "Flag already resolved" });
    return;
  }

  const [updated] = await db
    .update(ithinkAttentionFlags)
    .set({
      clearedBy: cmId,
      clearedAt: new Date(),
      followUpNotes: result.data.followUpNotes,
      updatedAt: new Date(),
    })
    .where(eq(ithinkAttentionFlags.id, flagId))
    .returning();

  res.json(updated);
});
```

### Pattern 4: Signal History Endpoint

**What:** `GET /api/admin/attention/history` — returns ALL flags (including resolved ones) for the CM's institution, ordered by `createdAt` descending. Serves ATTN-04.

**Example:**
```typescript
// Source: same institution-scoping pattern as GET /attention
router.get("/attention/history", async (req, res) => {
  const cmId = req.contributor!.id;
  const db = getDb();

  const [assignment] = await db
    .select({ institutionId: contributorInstitutions.institutionId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.contributorId, cmId))
    .limit(1);

  if (!assignment) {
    res.status(403).json({ error: "No institution assigned to this community manager" });
    return;
  }

  const history = await db
    .select({
      id: ithinkAttentionFlags.id,
      contributorName: contributors.name,
      signalType: ithinkAttentionFlags.signalType,
      cohortSize: ithinkAttentionFlags.cohortSize,
      flaggedCount: ithinkAttentionFlags.flaggedCount,
      clearedAt: ithinkAttentionFlags.clearedAt,
      followUpNotes: ithinkAttentionFlags.followUpNotes,
      createdAt: ithinkAttentionFlags.createdAt,
    })
    .from(ithinkAttentionFlags)
    .innerJoin(contributors, eq(contributors.id, ithinkAttentionFlags.contributorId))
    .where(eq(ithinkAttentionFlags.institutionId, assignment.institutionId))
    .orderBy(desc(ithinkAttentionFlags.createdAt));

  res.json(history);
});
```

### Pattern 5: TanStack Query Hooks (frontend)

**What:** Follows `useInstitutions.ts` pattern exactly — named query keys, `useQuery` for reads, `useMutation` for resolve, `invalidateQueries` on success.

**Example:**
```typescript
// Source: packages/web/src/hooks/useInstitutions.ts pattern
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as attentionApi from "../api/attention.js";

const ATTENTION_KEY = ["admin", "attention"] as const;
const HISTORY_KEY = ["admin", "attention", "history"] as const;

export function useAttentionFlags() {
  return useQuery({
    queryKey: ATTENTION_KEY,
    queryFn: () => attentionApi.getAttentionFlags(),
  });
}

export function useAttentionHistory() {
  return useQuery({
    queryKey: HISTORY_KEY,
    queryFn: () => attentionApi.getAttentionHistory(),
  });
}

export function useResolveFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flagId, followUpNotes }: { flagId: string; followUpNotes: string }) =>
      attentionApi.resolveFlag(flagId, followUpNotes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ATTENTION_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORY_KEY });
    },
  });
}
```

### Pattern 6: API Client (frontend)

**What:** Follows `packages/web/src/api/admin.ts` pattern using `apiClient` from `./client.ts`.

**Example:**
```typescript
// Source: packages/web/src/api/admin.ts pattern
import { apiClient } from "./client.js";

export interface AttentionFlag {
  id: string;
  contributorId: string;
  contributorName: string;
  signalType: string;
  cohortSize: number | null;
  flaggedCount: number | null;
  createdAt: string;
}

export interface AttentionHistoryEntry extends AttentionFlag {
  clearedAt: string | null;
  followUpNotes: string | null;
}

export function getAttentionFlags(): Promise<AttentionFlag[]> {
  return apiClient<AttentionFlag[]>("/api/admin/attention");
}

export function getAttentionHistory(): Promise<AttentionHistoryEntry[]> {
  return apiClient<AttentionHistoryEntry[]>("/api/admin/attention/history");
}

export function resolveFlag(flagId: string, followUpNotes: string): Promise<AttentionHistoryEntry> {
  return apiClient<AttentionHistoryEntry>(`/api/admin/attention/${flagId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ followUpNotes }),
  });
}
```

### Pattern 7: Confirm-Before-Resolve UI

**What:** The `ConfirmDialog` pattern from `InstitutionManagement.tsx` is reusable. A local state `confirmingFlagId: string | null` controls which flag has a pending confirm dialog. On "Resolve" button click, set the state; on dialog confirm, call the mutation; on cancel, clear state.

**When to use:** The resolve action requires follow-up notes — the dialog also needs a `<textarea>` for notes input, not just a confirm/cancel.

**Example:**
```typescript
// Source: InstitutionManagement.tsx ConfirmDialog pattern adapted for resolve-with-notes
const [confirmingFlagId, setConfirmingFlagId] = useState<string | null>(null);
const [followUpNotes, setFollowUpNotes] = useState("");
const resolveFlag = useResolveFlag();

const handleResolveConfirm = async () => {
  if (!confirmingFlagId || !followUpNotes.trim()) return;
  await resolveFlag.mutateAsync({ flagId: confirmingFlagId, followUpNotes: followUpNotes.trim() });
  setConfirmingFlagId(null);
  setFollowUpNotes("");
};
```

### Pattern 8: Route Registration in App.tsx

**What:** Add a new route inside the existing `<Route element={<CMRoute />}>` block.

**Example:**
```tsx
// Source: existing App.tsx lines 62-65 — add one route to the existing CMRoute block
<Route element={<CMRoute />}>
  <Route path="/admin/institutions" element={<InstitutionManagement />} />
  <Route path="/admin/contributors/:id" element={<ContributorDetail />} />
  <Route path="/admin/attention" element={<AttentionDashboard />} />  {/* NEW */}
</Route>
```

### Anti-Patterns to Avoid

- **Deriving institution from query param or request body:** Never do `req.query.institutionId` or `req.body.institutionId` for scoping. Always look up from `contributor_institutions` using `req.contributor.id`. A CM could manipulate query parameters to see another institution's flags.
- **Using JWT role claim as sufficient authorization:** The JWT proves who the user is and their role, but NOT which institution they manage. The institution must be confirmed via DB lookup on every request.
- **Returning 403/404 with institution-specific detail:** When a flag is not found OR belongs to a different institution, always return 404 (not 403). Returning 403 leaks that a flag exists in another institution.
- **Not invalidating both query keys on resolve:** After resolving a flag, both `["admin", "attention"]` (active list) and `["admin", "attention", "history"]` (history list) must be invalidated. Missing one leaves stale data on screen.
- **Allowing resolve on already-cleared flag:** Check `clearedAt IS NOT NULL` before updating. Return 409 if already resolved. Prevents double-resolution from double-clicks.
- **Notes without requiring non-empty input:** `followUpNotes` must be validated as non-empty (`z.string().min(1)`) — requiring notes is the business rule for ATTN-03.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth + role enforcement | Custom middleware per route | `router.use(authMiddleware, requireRole("community_manager"))` | Already working in `adminRouter` — copy exactly |
| Institution scope enforcement | Trust query param | DB lookup via `contributor_institutions` with `req.contributor.id` | Only source of truth; prevents parameter manipulation |
| Typed API client | Raw `fetch` in components | `apiClient` from `./client.ts` | Handles 401 token refresh, error normalization, credentials |
| Query invalidation | Manual state updates | `queryClient.invalidateQueries` | TanStack Query refetches in background, handles loading state |
| Confirm dialog | Browser `window.confirm()` | Local state + inline dialog (ConfirmDialog pattern from InstitutionManagement.tsx) | Browser confirm blocks the thread, no textarea for notes |

**Key insight:** The institution-scoping pattern is the entire security model for this phase. Everything else is plumbing that already exists.

## Common Pitfalls

### Pitfall 1: CM Has Multiple Institutions Assigned
**What goes wrong:** A CM is assigned to more than one institution in `contributor_institutions`. The `LIMIT 1` query returns the first assignment arbitrarily. Flags from the other institution are invisible.
**Why it happens:** Phase 12 allows many-to-many assignments. The pilot assumption is one CM per institution, but the DB doesn't enforce it.
**How to avoid:** Clarify business rule before implementation. If a CM always manages exactly one institution, document the assumption and keep `LIMIT 1`. If multi-institution CMs are possible, change the query to fetch all institution IDs and use `inArray` in the flags query.
**Warning signs:** CM reports missing flags that were created for their second institution.
**Recommendation:** Keep `LIMIT 1` for Phase 14 (matches pilot scale) and document the assumption. This is a known limitation for the planner to call out in a verification checkpoint.

### Pitfall 2: Route Ordering — `/attention/history` vs `/attention/:flagId/resolve`
**What goes wrong:** Express matches `/attention/history` as `/attention/:flagId` with `flagId = "history"` if the `POST /attention/:flagId/resolve` route is registered before `GET /attention/history` AND if Express is evaluating GET/POST on the same path segment.
**Why it happens:** Express route matching is order-dependent and path-only; it doesn't distinguish GET vs POST before path matching.
**How to avoid:** Register the specific routes first: `GET /attention` then `GET /attention/history` then `POST /attention/:flagId/resolve`. Since `history` is a GET and resolve is a POST, Express will correctly differentiate by method. This is NOT actually a problem when methods differ — but it is good practice to register specific paths before parameterized paths regardless.
**Warning signs:** GET /attention/history returns 400 "Invalid flag ID" because "history" fails UUID validation.

### Pitfall 3: `followUpNotes` Validation on Server Only
**What goes wrong:** Server validates `followUpNotes` as required, but frontend allows submission with empty notes. User sees a confusing 400 error from the server after submitting.
**Why it happens:** Frontend form validation is added late or skipped.
**How to avoid:** Frontend must disable the "Confirm" button in the resolve dialog when `followUpNotes.trim() === ""`. This matches the business rule before the request is even sent.
**Warning signs:** Empty POST bodies reaching the server, returning 400 errors in normal user flows.

### Pitfall 4: Missing Navbar Link to Attention Dashboard
**What goes wrong:** The page is accessible at `/admin/attention` but the CM has no way to navigate there from the Navbar.
**Why it happens:** Plan focuses on the page and API, Navbar update is an afterthought.
**How to avoid:** Add "Attention" to the Navbar alongside "Admin" — both visible only to CM/admin roles. This is the same conditional link pattern already in `Navbar.tsx`.
**Warning signs:** Manual URL entry is the only way to reach the page.

### Pitfall 5: `req.contributor` Could Be Undefined
**What goes wrong:** TypeScript allows `req.contributor` to be `undefined` even after `authMiddleware` runs, because the global `Express.Request` type declares it as optional. Accessing `req.contributor.id` without a null check causes a TypeScript error or runtime crash.
**Why it happens:** The global Express type augmentation uses `?:` for `contributor`.
**How to avoid:** Use `req.contributor!.id` (non-null assertion) inside routes protected by `router.use(authMiddleware, ...)`, matching the existing pattern in `admin.ts` line 434 (`req as unknown as { contributor?: ... }`).
**Warning signs:** TypeScript error `Object is possibly undefined` on `req.contributor.id`.

## Code Examples

### Zod Schema for Resolve Body

```typescript
// Source: existing zod schema patterns in packages/shared/src/schemas/
import { z } from "zod";

export const resolveAttentionFlagSchema = z.object({
  followUpNotes: z.string().min(1, "Follow-up notes are required"),
});

export type ResolveAttentionFlagInput = z.infer<typeof resolveAttentionFlagSchema>;
```

This schema should live either in `packages/shared/src/schemas/` (exported from shared package) or inline at the top of `admin.ts` — either works since it is only used server-side. Inline in `admin.ts` is simpler given Phase 14's limited scope.

### Drizzle Query: Active Flags with Contributor Name

```typescript
// Source: admin.ts innerJoin pattern (lines 288-293) + ithinkAttentionFlags schema
import { and, desc, eq, isNull } from "drizzle-orm";
import { ithinkAttentionFlags, contributors, contributorInstitutions } from "../db/schema.js";

const activeFlags = await db
  .select({
    id: ithinkAttentionFlags.id,
    contributorId: ithinkAttentionFlags.contributorId,
    contributorName: contributors.name,
    signalType: ithinkAttentionFlags.signalType,
    cohortSize: ithinkAttentionFlags.cohortSize,
    flaggedCount: ithinkAttentionFlags.flaggedCount,
    createdAt: ithinkAttentionFlags.createdAt,
  })
  .from(ithinkAttentionFlags)
  .innerJoin(contributors, eq(contributors.id, ithinkAttentionFlags.contributorId))
  .where(
    and(
      eq(ithinkAttentionFlags.institutionId, institutionId),
      isNull(ithinkAttentionFlags.clearedAt),
    ),
  )
  .orderBy(desc(ithinkAttentionFlags.createdAt));
```

### Drizzle Imports Required

```typescript
// The attention routes need these Drizzle imports not already in admin.ts:
import { and, asc, desc, eq, isNull, inArray, sql } from "drizzle-orm";
import {
  institutions,
  contributors,
  contributorInstitutions,
  ithinkAttentionFlags,
} from "../db/schema.js";
```

`ithinkAttentionFlags` and `isNull` / `desc` are the new ones. `contributorInstitutions` and `contributors` are already imported in `admin.ts`.

### Empty State in AttentionDashboard.tsx

```tsx
// Source: ContributorDetail.tsx empty-state pattern
if (!flags || flags.length === 0) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Attention Dashboard</h1>
      <p className="text-neutral-500 mt-8">No flagged contributors at your institution.</p>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Trust institution param from frontend | DB-scoped institution via `req.contributor.id` | Established in Phase 12 | Prevents parameter-manipulation cross-institution leakage |
| Polling-based real-time updates | Page-load TanStack Query fetch (no WebSocket) | Phase 14 design decision (out of scope per requirements) | Simple, correct for low-frequency signals |

**Not needed (confirmed out of scope):**
- WebSocket push for real-time flag updates — polling on page load is sufficient per requirements
- Per-contributor screening details in CM view — GDPR risk, explicitly out of scope
- Automated CM email alerts — out of scope

## Open Questions

1. **CM with multiple institution assignments**
   - What we know: `contributor_institutions` is many-to-many; the pilot assumes one CM per institution
   - What's unclear: Is a CM ever assigned to more than one institution?
   - Recommendation: Planner should add a `checkpoint:decision` task in 14-01 asking Kirk to confirm: "A CM is always assigned to exactly one institution." If yes, `LIMIT 1` is correct. If no, the query must use `inArray` with all institution IDs.

2. **Where to add the resolve Zod schema**
   - What we know: It could go in `packages/shared/src/schemas/` (like `ithink-webhook.ts`) or inline in `admin.ts`
   - What's unclear: No requirement says it must be shared — Phase 14 only uses it server-side
   - Recommendation: Inline in `admin.ts` is simpler and keeps Phase 14 self-contained. The planner should use inline unless a future requirement needs client-side validation of the same schema.

3. **Navbar link placement**
   - What we know: Navbar currently has one conditional "Admin" link for CM/admin pointing to `/admin/institutions`
   - What's unclear: Should there be a separate "Attention" link, or an "Admin" dropdown, or a sub-nav within the admin section?
   - Recommendation: Keep it simple — add a second conditional Navbar link "Attention" alongside "Admin", visible only to CM/admin. No dropdown needed at pilot scale.

## Sources

### Primary (HIGH confidence)
- Codebase `packages/server/src/routes/admin.ts` — `requireRole` pattern, UUID validation, DB query patterns (read 2026-03-23)
- Codebase `packages/server/src/middleware/auth.ts` — `authMiddleware`, `requireRole`, `req.contributor` type (read 2026-03-23)
- Codebase `packages/server/src/db/schema.ts` — `ithinkAttentionFlags` table confirmed with `clearedBy`, `clearedAt`, `followUpNotes` columns (read 2026-03-23)
- Codebase `packages/web/src/hooks/useInstitutions.ts` — TanStack Query hook pattern with dual query key invalidation (read 2026-03-23)
- Codebase `packages/web/src/api/admin.ts` — typed `apiClient` wrapper pattern (read 2026-03-23)
- Codebase `packages/web/src/components/layout/CMRoute.tsx` — route guard pattern (read 2026-03-23)
- Codebase `packages/web/src/App.tsx` — CMRoute block location, import pattern (read 2026-03-23)
- Phase 13-01 SUMMARY.md — confirms `ithink_attention_flags` table created and verified in PostgreSQL (read 2026-03-23)
- Phase 12-02 PLAN.md — confirms `requireRole("community_manager")` pattern, CMRoute guard pattern (read 2026-03-23)

### Secondary (MEDIUM confidence)
- TanStack Query v5 docs — `useMutation` `onSuccess` `invalidateQueries` pattern (consistent with existing codebase usage; not independently verified against latest docs but codebase evidence is strong)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing codebase; no new packages; confirmed by code inspection
- Architecture: HIGH — every pattern has a direct working equivalent in the codebase; no guesswork
- Pitfalls: HIGH — most pitfalls derived from actual codebase constraints (many-to-many junction, Express route ordering, TypeScript `req.contributor` optional type)
- Open questions: documented honestly — CM multi-institution assignment is the only real ambiguity

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable domain; no fast-moving dependencies)
