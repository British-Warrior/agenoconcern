# Phase 12: Institution Data Foundation - Research

**Researched:** 2026-03-22
**Domain:** PostgreSQL many-to-many schema, Drizzle ORM junction table queries, React inline-edit card UI, live aggregation queries
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### CM Institution Management UI
- Navigation: institution management lives under the existing admin section, not as a new top-level nav item
- List view: card-based grid (not compact table) — each card shows name, city, active status badge, contributor count, and live stats
- Create/edit: inline editing on the card — click to expand and edit in place, no separate form page
- Activate/deactivate: toggle switch with confirmation dialog ("Deactivate [name]? This hides the kiosk page") before applying

#### Contributor Assignment Workflow
- **IMPORTANT: Many-to-many model** — contributors can belong to multiple institutions (junction table, NOT a single FK on contributors). This overrides the research recommendation of a single institution_id FK.
- Assignment direction: from the contributor profile — CM selects institutions via a multi-select picker (checkboxes/tags showing all institutions)
- Institution card contributor list: shows name + platform status + last activity date (last check-in, last circle note, etc.)
- Unassigned contributors: shown in a separate "Unassigned" group in the CM view — not hidden

#### Live Stats Presentation
- Stats on public landing page: same metrics currently in statsJson (contributor count, challenges, hours) but derived from live queries
- Empty state: hide the stats section entirely until at least 1 contributor is assigned — don't show zeros
- CM cards also show live stats — same metrics visible on both the public page and the CM institution cards
- statsJson column: keep as a cache/fallback layer, don't drop it — populate periodically; preserves landing page data during transition

#### Data Model & Migration
- Junction table (`contributor_institutions` or similar) replaces the single FK approach — many-to-many relationship
- Challenges and hours are global to the contributor, not institution-scoped — stats aggregate all contributor activity regardless of which institution(s) they're linked to
- Per-institution counting: if a contributor is linked to 2 institutions, each institution counts them in its stats (reflects actual engagement at each venue)
- Existing seeded statsJson data: preserved as initial values until live data supersedes them — landing pages don't go blank during transition

### Claude's Discretion
- Junction table schema design (column names, indexes, constraints)
- Card component layout and spacing details
- Multi-select picker implementation pattern
- Live aggregation query approach (view vs inline query vs scheduled refresh)
- "Last activity" resolution (which activity types to check, how far back)

### Deferred Ideas (OUT OF SCOPE)
- Webhook integration (Phase 13)
- Attention flags (Phase 14)
- PDF reports (Phase 15)
</user_constraints>

## Summary

Phase 12 builds on the `institutions` table created in Phase 11. The core new work is a many-to-many `contributor_institutions` junction table, CM-facing institution CRUD routes and UI, and live aggregation replacing the statsJson-only approach. No new npm packages are needed — the existing stack (Drizzle ORM 0.38, postgres.js, Express, React Query 5, Tailwind) handles all requirements.

The existing codebase has clear patterns for everything needed: junction tables already exist (`circle_members`, `challenge_interests`), aggregate queries using `sql<number>\`COUNT(*)::int\`` are established, the `requireRole("community_manager")` middleware is in place, the `apiClient` fetch wrapper covers auth cookie handling, and React Query mutation invalidation is the standard data update pattern. The inline-edit card pattern is new to this codebase but straightforward with React local state.

Migration approach follows Phase 9/11 precedent: targeted `.mjs` script using `postgres` directly, marked manually in `drizzle.__drizzle_migrations` — no drizzle-kit needed. Live aggregation uses inline Drizzle subqueries rather than a PostgreSQL view, keeping the aggregation logic in TypeScript and avoiding extra DB objects.

**Primary recommendation:** Follow the `circle_members` junction table pattern exactly. Use `sql<number>\`COUNT(*)::int\`` subqueries for live stats. Build CM routes in a new `src/routes/admin.ts` file mounted at `/api/admin`. Implement inline edit with a single `editingId` state variable per page.

## Standard Stack

### Core (no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.38.0 | ORM — junction table queries, joins, aggregates | Already in use throughout codebase |
| postgres | ^3.4.0 | DB connection (used in migration scripts) | Already used in all migration scripts |
| express | ^4.21.0 | API routing and middleware | Existing server framework |
| @tanstack/react-query | ^5.62.0 | Server state, mutation invalidation | Established pattern in all hooks |
| zod | ^3.24.0 | Input validation on API routes | Used in all existing routes via shared schemas |

### No New Packages Required
All functionality is achievable with the existing stack. Specific confirmations:
- Multi-select picker: plain HTML checkboxes + React state (no component library needed)
- Toggle switch: Tailwind-styled `<button role="switch">` with `aria-checked`
- Confirmation dialog: simple React state-controlled overlay (pattern already exists in KioskWarningOverlay)
- Inline editing: `editingId` state + conditional render within card

## Architecture Patterns

### Recommended Project Structure Changes
```
packages/server/src/
├── routes/
│   ├── institutions.ts          # EXISTING — extend with CM routes (or keep public/CM split)
│   └── admin.ts                 # NEW — CM-only: institution CRUD + contributor assignment
├── scripts/
│   └── create-contributor-institutions.mjs  # NEW — junction table migration

packages/web/src/
├── api/
│   └── admin.ts                 # NEW — typed API client for CM routes
├── hooks/
│   └── useInstitutions.ts       # NEW — React Query hooks for institution management
└── pages/
    └── admin/                   # NEW directory
        └── InstitutionManagement.tsx  # NEW — CM institution list + inline edit page
```

**Note on routing:** The CM institution management page should be placed under an `/admin` path and guarded with a `CMRoute` component (mirrors `ChallengerRoute`). App.tsx will need a new `CMRoute` guard and a route entry.

### Pattern 1: Junction Table (many-to-many)

**What:** `contributor_institutions` table linking contributors to institutions. Follows the `circle_members` pattern exactly.

**Schema definition:**
```typescript
// Source: packages/server/src/db/schema.ts — circle_members as reference pattern
export const contributorInstitutions = pgTable(
  "contributor_institutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contributorId: uuid("contributor_id")
      .notNull()
      .references(() => contributors.id, { onDelete: "cascade" }),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
    assignedBy: uuid("assigned_by").references(() => contributors.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("contributor_institutions_unique").on(table.contributorId, table.institutionId),
  ],
);
```

**Migration SQL:**
```sql
CREATE TABLE IF NOT EXISTS contributor_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES contributors(id) ON DELETE SET NULL,
  CONSTRAINT contributor_institutions_unique UNIQUE (contributor_id, institution_id)
);

CREATE INDEX IF NOT EXISTS idx_ci_contributor_id ON contributor_institutions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_ci_institution_id ON contributor_institutions(institution_id);
```

**Indexes:** Both FK columns need indexes — PostgreSQL doesn't auto-create them for referenced columns, only for the referencing side. The `institution_id` index is critical for the "list contributors for an institution" query.

### Pattern 2: Live Aggregation Query (inline subquery approach)

**What:** Per-institution stats computed at query time using Drizzle `sql` template tag. No PostgreSQL view — keeps logic in TypeScript.

**Rationale for inline query over view:** The existing codebase never uses PostgreSQL views. All aggregation uses `sql<number>\`COUNT(*)::int\`` inline. Consistent with challenger dashboard query in `challenger.ts` which joins multiple tables inline.

**Live stats for a single institution:**
```typescript
// Source: pattern from packages/server/src/routes/circles.ts + challenges.ts
import { sql, eq, inArray } from "drizzle-orm";
import { contributorInstitutions, contributorHours, challengeInterests, challenges, contributors } from "../db/schema.js";

async function getLiveStats(institutionId: string, db: ReturnType<typeof getDb>) {
  // Step 1: get contributor IDs for this institution
  const memberRows = await db
    .select({ contributorId: contributorInstitutions.contributorId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.institutionId, institutionId));

  const memberIds = memberRows.map((r) => r.contributorId);

  if (memberIds.length === 0) {
    return { contributors: 0, challenges: 0, hours: 0 };
  }

  // Step 2: aggregate challenges and hours across those contributors
  const [challengeCount, hoursTotal] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(DISTINCT ${challengeInterests.challengeId})::int` })
      .from(challengeInterests)
      .where(inArray(challengeInterests.contributorId, memberIds)),
    db
      .select({ total: sql<number>`COALESCE(SUM(${contributorHours.hoursLogged}), 0)::int` })
      .from(contributorHours)
      .where(inArray(contributorHours.contributorId, memberIds)),
  ]);

  return {
    contributors: memberIds.length,
    challenges: challengeCount[0]?.count ?? 0,
    hours: hoursTotal[0]?.total ?? 0,
  };
}
```

**Note:** `inArray` from `drizzle-orm` is used in `circles.ts` for exactly this pattern. When `memberIds` is empty, return zeros without executing the aggregate queries (avoids `IN ()` SQL error).

### Pattern 3: Institution CRUD Route Structure

**What:** CM-only routes mounted at `/api/admin`. Protected by `authMiddleware` + `requireRole("community_manager")`.

```typescript
// Source: pattern from packages/server/src/routes/challenges.ts
import { authMiddleware, requireRole } from "../middleware/auth.js";

// List institutions (CM)
router.get("/institutions", authMiddleware, requireRole("community_manager"), async (req, res) => {
  // Returns all institutions regardless of isActive, with live stats
});

// Create institution
router.post("/institutions", authMiddleware, requireRole("community_manager"), async (req, res) => {
  // Validates body: name, description, city, slug (auto-derived or provided)
});

// Update institution
router.put("/institutions/:id", authMiddleware, requireRole("community_manager"), async (req, res) => {
  // Validates UUID, updates name/description/city
});

// Toggle active
router.patch("/institutions/:id/active", authMiddleware, requireRole("community_manager"), async (req, res) => {
  // Sets isActive = !current, returns updated record
});

// List contributors for institution (with last activity)
router.get("/institutions/:id/contributors", authMiddleware, requireRole("community_manager"), async (req, res) => {});

// Assign contributor to institution
router.post("/institutions/:id/contributors", authMiddleware, requireRole("community_manager"), async (req, res) => {});

// Remove contributor from institution
router.delete("/institutions/:id/contributors/:contributorId", authMiddleware, requireRole("community_manager"), async (req, res) => {});

// List all contributors with their institution assignments (for the assignment picker)
router.get("/contributors", authMiddleware, requireRole("community_manager"), async (req, res) => {});
```

### Pattern 4: Inline Edit Card UI

**What:** Card in expanded/collapsed state, controlled by local React state. No external library needed.

```typescript
// Source: pattern consistent with ChallengeFeed.tsx CM panel approach
const [editingId, setEditingId] = useState<string | null>(null);
const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

// In render:
{institutions.map((inst) => (
  editingId === inst.id
    ? <InstitutionCardEdit inst={inst} onDone={() => setEditingId(null)} />
    : <InstitutionCardView inst={inst} onEdit={() => setEditingId(inst.id)} onToggle={() => setConfirmDeactivate(inst.id)} />
))}
```

**Confirmation dialog:** Reuse the same pattern as `KioskWarningOverlay.tsx` — a fixed overlay with backdrop, rendered conditionally.

### Pattern 5: Last Activity Resolution

**What:** For each contributor assigned to an institution, show the most recent activity timestamp across wellbeing check-ins and circle notes. This is Claude's discretion.

**Recommended approach:** Two separate queries returning max timestamps per contributor, then take the later of the two client-side. Avoids complex SQL UNION.

```typescript
// Last check-in per contributor
const lastCheckins = await db
  .select({
    contributorId: wellbeingCheckins.contributorId,
    lastAt: sql<string>`MAX(${wellbeingCheckins.completedAt})`,
  })
  .from(wellbeingCheckins)
  .where(inArray(wellbeingCheckins.contributorId, memberIds))
  .groupBy(wellbeingCheckins.contributorId);

// Last circle note per contributor
const lastNotes = await db
  .select({
    contributorId: circleNotes.authorId,
    lastAt: sql<string>`MAX(${circleNotes.createdAt})`,
  })
  .from(circleNotes)
  .where(inArray(circleNotes.authorId, memberIds))
  .groupBy(circleNotes.authorId);
```

Then merge in TypeScript: `Math.max(Date.parse(checkin.lastAt), Date.parse(note.lastAt))` per contributor.

### Pattern 6: CM Route Guard (frontend)

**What:** New `CMRoute` component guarding admin pages. Mirrors `ChallengerRoute.tsx` exactly.

```typescript
// Source: pattern from packages/web/src/components/layout/ChallengerRoute.tsx
export function CMRoute() {
  const { isAuthenticated, isLoading, contributor } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (contributor?.role !== "community_manager" && contributor?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

Route in `App.tsx`:
```tsx
<Route element={<CMRoute />}>
  <Route path="/admin/institutions" element={<InstitutionManagement />} />
</Route>
```

### Pattern 7: Multi-Select Picker for Institution Assignment

**What:** From the contributor profile (CM view), a list of all institutions with checkboxes. Checked = assigned, unchecked = not assigned. Submit button sends the full new set of assignments.

**Implementation:** On open, fetch all institutions + current assignments. Track checked state locally. On save, diff against current and issue add/remove calls, or replace with a single "set assignments" endpoint that accepts the full list.

**Recommended:** "Set assignments" endpoint is simpler — `PUT /api/admin/contributors/:contributorId/institutions` with body `{ institutionIds: string[] }`. The server deletes all existing rows for that contributor and inserts the new set in a transaction.

### Anti-Patterns to Avoid

- **Dropping statsJson:** Keep it — landing pages use it as fallback during transition. The context locks this.
- **Using Drizzle relations API (`.with()`):** The codebase never uses this API. All joins are explicit `.innerJoin()` / `.leftJoin()`. Do not introduce `relations()` exports.
- **Empty `inArray(col, [])` call:** `inArray` with empty array generates invalid SQL `IN ()`. Always guard: `if (memberIds.length === 0) return earlyResult`.
- **Separate page for institution create/edit:** CONTEXT.md locks inline editing. Do not create `/admin/institutions/new` or `/admin/institutions/:id/edit` routes.
- **Slug auto-generation on edit:** Slug changes would break all kiosk QR codes. Generate slug from name only on CREATE. Do not expose slug as an editable field on the edit form.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth cookie handling in fetch | Custom headers/token management | `apiClient` from `api/client.ts` | Already handles 401 refresh retry |
| Role checking | Custom role logic | `requireRole("community_manager")` middleware | Existing middleware, handles admin bypass |
| Input validation | Manual `if` checks | Zod schemas in `@indomitable-unity/shared` | Consistent with all existing routes |
| Optimistic UI updates | Custom cache management | React Query `invalidateQueries` on mutation success | Established pattern in all hooks |
| Confirmation dialog | External library | Local state overlay (KioskWarningOverlay pattern) | No new dep needed, pattern exists |
| UUID validation on route params | Custom regex per route | `UUID_PATTERN` constant (exists in `challenger.ts`) | Copy the `/^[0-9a-f]{8}-...$/i` pattern |

**Key insight:** Every building block for this phase already exists in the codebase. The work is composition and new endpoints, not new infrastructure.

## Common Pitfalls

### Pitfall 1: inArray with Empty Array
**What goes wrong:** `db.select().from(table).where(inArray(col, []))` generates `WHERE col IN ()` which is invalid SQL and throws a PostgreSQL error.
**Why it happens:** When an institution has no assigned contributors, `memberIds` is an empty array.
**How to avoid:** Always check `if (memberIds.length === 0)` before calling any query that uses `inArray(col, memberIds)`. Return `{ contributors: 0, challenges: 0, hours: 0 }` early.
**Warning signs:** 500 errors on institution landing page for empty institutions.

### Pitfall 2: Slug Mutability Breaking Kiosk URLs
**What goes wrong:** The CM edits an institution name and expects the slug to update — this invalidates all printed QR codes pointing to `/i/old-slug`.
**Why it happens:** Slug is derived from name on create, but name can change on edit.
**How to avoid:** The edit form must NOT include a slug field. Slug is set at creation and immutable thereafter. The API `PUT /institutions/:id` must ignore any `slug` field in the request body.
**Warning signs:** 404s on institution landing pages after name edits.

### Pitfall 3: Live Stats N+1 Query
**What goes wrong:** Fetching live stats for each institution card individually — N institutions = N+1 queries on the CM list view.
**Why it happens:** Naively calling `getLiveStats(inst.id)` in a loop.
**How to avoid:** The CM list endpoint should batch-compute stats for all institutions in one pass: one query to get all `contributor_institutions` rows, then group by institution_id in TypeScript. Or use SQL `GROUP BY institution_id` for the contributor count directly.
**Warning signs:** Slow CM list page load as institution count grows.

### Pitfall 4: Missing Index on institution_id
**What goes wrong:** Slow queries when listing contributors for a specific institution.
**Why it happens:** PostgreSQL does not automatically create an index on the `institution_id` FK column in `contributor_institutions`.
**How to avoid:** Explicitly `CREATE INDEX IF NOT EXISTS idx_ci_institution_id ON contributor_institutions(institution_id)` in the migration script.
**Warning signs:** Slow contributor list in CM view as contributor count grows.

### Pitfall 5: statsJson Not Updated After Assignment
**What goes wrong:** The public landing page still shows old statsJson values after contributors are assigned — if the cache layer is never updated, live stats and cache diverge.
**Why it happens:** CONTEXT.md says keep statsJson as cache/fallback. If the live aggregation path is broken, the page silently shows stale data.
**How to avoid:** The `/api/institutions/:slug` public route should return live stats directly (not statsJson). statsJson is only the fallback if live query fails. Document this clearly in code comments.
**Warning signs:** Landing page shows `contributors: 0` when CM sees `contributors: 3` on the card.

### Pitfall 6: Transaction Required for Set-Assignments
**What goes wrong:** DELETE + INSERT for contributor-institution assignments runs as two separate queries. If the INSERT fails, the DELETE is not rolled back — contributor loses all assignments.
**Why it happens:** No transaction wrapping.
**How to avoid:** Wrap DELETE + INSERT in `db.transaction(async (tx) => { ... })` — pattern exists in `challenger.ts` (contributor + org creation).
**Warning signs:** Contributors appearing in "Unassigned" group after failed assignment save.

### Pitfall 7: CM Route Missing from App.tsx
**What goes wrong:** `/admin/institutions` navigates to blank page or 404 because the route is not registered.
**Why it happens:** Easy to write the component and API without wiring the route.
**How to avoid:** Add `CMRoute` guard + route in `App.tsx` as part of the same task that creates the component. Verify navigation from Dashboard works.

## Code Examples

### Drizzle Junction Table Insert (assign contributor)
```typescript
// Source: pattern from packages/server/src/routes/circles.ts (circleMembers insert)
await db
  .insert(contributorInstitutions)
  .values({
    contributorId,
    institutionId,
    assignedBy: req.contributor!.id,
  })
  .onConflictDoNothing(); // idempotent — safe to call twice
```

### Drizzle Junction Table Delete (remove contributor)
```typescript
// Source: pattern from packages/server/src/routes/circles.ts
await db
  .delete(contributorInstitutions)
  .where(
    and(
      eq(contributorInstitutions.contributorId, contributorId),
      eq(contributorInstitutions.institutionId, institutionId),
    ),
  );
```

### Set Assignments Transaction Pattern
```typescript
// Source: pattern from packages/server/src/routes/challenger.ts (transaction)
await db.transaction(async (tx) => {
  // Remove all current assignments for this contributor
  await tx
    .delete(contributorInstitutions)
    .where(eq(contributorInstitutions.contributorId, contributorId));
  // Insert new set
  if (institutionIds.length > 0) {
    await tx.insert(contributorInstitutions).values(
      institutionIds.map((institutionId) => ({
        contributorId,
        institutionId,
        assignedBy: req.contributor!.id,
      })),
    );
  }
});
```

### Batch Live Stats for CM List
```typescript
// All institution stats in one pass — avoids N+1
const allAssignments = await db
  .select({
    institutionId: contributorInstitutions.institutionId,
    contributorId: contributorInstitutions.contributorId,
  })
  .from(contributorInstitutions);

// Group by institution
const byInstitution = new Map<string, string[]>();
for (const row of allAssignments) {
  if (!byInstitution.has(row.institutionId)) byInstitution.set(row.institutionId, []);
  byInstitution.get(row.institutionId)!.push(row.contributorId);
}

// Then for each institution: memberIds = byInstitution.get(inst.id) ?? []
```

### React Query Mutation with Invalidation
```typescript
// Source: pattern from packages/web/src/hooks/useCircles.ts
const assignMutation = useMutation({
  mutationFn: ({ institutionId, contributorId }: { institutionId: string; contributorId: string }) =>
    adminApi.assignContributor(institutionId, contributorId),
  onSuccess: () => {
    void queryClient.invalidateQueries({ queryKey: ["institutions"] });
    void queryClient.invalidateQueries({ queryKey: ["contributors", "unassigned"] });
  },
});
```

### Institution Active Toggle with Confirmation
```typescript
// Source: KioskWarningOverlay.tsx for dialog pattern, challenges.ts for patch pattern
const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);

// Confirmation overlay:
{confirmDeactivate && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 max-w-sm mx-4 space-y-4">
      <p className="font-semibold text-neutral-900">
        Deactivate {institutions.find(i => i.id === confirmDeactivate)?.name}?
        This hides the kiosk page.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => { void toggleActive(confirmDeactivate); setConfirmDeactivate(null); }}>
          Deactivate
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDeactivate(null)}>Cancel</Button>
      </div>
    </div>
  </div>
)}
```

### Public Landing Page — Live Stats (updated endpoint logic)
```typescript
// Replace statsJson return with live query in packages/server/src/routes/institutions.ts
const liveStats = await getLiveStats(institution.id, db);

res.json({
  id: institution.id,
  name: institution.name,
  slug: institution.slug,
  description: institution.description,
  city: institution.city,
  stats: liveStats.contributors > 0 ? liveStats : null,
  // null triggers "hide stats section" on frontend per CONTEXT.md
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| statsJson JSONB only (Phase 11) | Live aggregation + statsJson as cache | Phase 12 | Landing page shows real data; CM sees same numbers |
| No contributor-institution relationship | many-to-many junction table | Phase 12 | Contributors can be at multiple venues |
| No CM institution management | CM CRUD UI in /admin | Phase 12 | CM can manage institutions without DB access |

**Existing in codebase (not deprecated):**
- `statsJson` column: kept as cache/fallback — do not drop
- Public `GET /api/institutions/:slug`: extend to return live stats, not replace

## Open Questions

1. **Slug uniqueness validation on create**
   - What we know: `slug` has a `UNIQUE` constraint in the DB. The current schema uses `varchar(100) UNIQUE`.
   - What's unclear: Should the API auto-generate slug from name (e.g., `"Brixton Library"` → `"brixton-library"`) or let CM provide it?
   - Recommendation: Auto-generate on create from name (lowercase, replace spaces/special chars with hyphens, truncate to 100 chars). Do not expose to CM — reduces error surface and protects QR codes.

2. **Contributor last-activity lookback window**
   - What we know: CONTEXT.md says "last check-in, last circle note" — no lookback window specified.
   - What's unclear: Should this show "never" (null) or a placeholder for contributors with no activity at all?
   - Recommendation: Show `null` as "No activity yet" in the UI. No lookback window needed — just `MAX()` across all time.

3. **How to reach the CM institution management page from the existing UI**
   - What we know: CONTEXT.md says "under the existing admin section" but there is no admin section in the current Navbar. The Navbar has no CM-specific links.
   - What's unclear: Whether "admin section" means a new Navbar entry for CM role only, or a link from the Dashboard.
   - Recommendation: Add a conditional "Admin" nav item to `Navbar.tsx` visible only when `contributor.role === "community_manager" || role === "admin"`. Link to `/admin/institutions`. This is minimal surface area — one nav item, one route.

4. **Contributor picker scope: who appears in the assignment picker?**
   - What we know: CONTEXT.md says "CM selects institutions via a multi-select picker" from the contributor profile, and "Unassigned contributors: shown in a separate Unassigned group".
   - What's unclear: Does the assignment flow also go the other direction — from the institution card, assign an existing contributor?
   - Recommendation: Support both directions. Institution card has an "Add contributor" button that opens a picker of all contributors (with search). Contributor profile in CM view has an institution picker. Both call the same API.

## Sources

### Primary (HIGH confidence)
- `packages/server/src/db/schema.ts` — verified junction table pattern (`circle_members`, `challenge_interests`), aggregate query pattern, existing institutions table structure
- `packages/server/src/routes/circles.ts` — verified `inArray`, `innerJoin`, `sql<number>\`COUNT\`` patterns
- `packages/server/src/routes/challenges.ts` — verified `requireRole`, aggregate count, `sql<number>` patterns
- `packages/server/src/routes/institutions.ts` — verified public endpoint returning statsJson
- `packages/server/scripts/create-institutions-table.mjs` — verified migration script pattern using postgres.js directly
- `packages/server/scripts/mark-migration.mjs` — verified migration marking pattern
- `packages/web/src/components/layout/ChallengerRoute.tsx` — verified role guard pattern for new CMRoute
- `packages/web/src/hooks/useAuth.ts` — verified React Query + mutation pattern
- `packages/web/src/api/client.ts` — verified apiClient with 401 refresh retry
- `packages/web/src/components/ui/Card.tsx`, `Input.tsx`, `Button.tsx` — verified UI primitives for CM page

### Secondary (MEDIUM confidence)
- `packages/web/src/pages/institution/InstitutionLanding.tsx` — verified existing stats display pattern and empty-state conditional rendering

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing verified in codebase
- Architecture: HIGH — patterns directly verified in existing code, not hypothesized
- Pitfalls: HIGH — most pitfalls (inArray empty, slug mutation, N+1) are concrete and verified against actual code structure
- Open questions: MEDIUM — recommendations are reasonable but involve UI decisions with discretion

**Research date:** 2026-03-22
**Valid until:** 2026-04-22 (stable — no fast-moving dependencies involved)
