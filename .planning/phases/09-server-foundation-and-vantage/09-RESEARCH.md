# Phase 9: Server Foundation and VANTAGE - Research

**Researched:** 2026-03-16
**Domain:** Express API key authentication, express-rate-limit, Drizzle ORM PostgreSQL enum migration
**Confidence:** HIGH

## Summary

Phase 9 adds a second authentication path to the existing Express server: API key auth via `X-API-Key` header, separate from the JWT cookie path already in use. The key lifecycle involves generating a random raw key (shown once), hashing it with SHA-256, and storing only the hash. Lookup at request time re-hashes the incoming header value and compares against stored hashes using a timing-safe comparison.

The `challenger` role value must be added to the existing `contributor_role` Postgres enum. This is an irreversible operation (`ALTER TYPE ... ADD VALUE`) with a critical transaction constraint: it cannot execute inside a transaction block on PostgreSQL < 12, and on PostgreSQL ≥ 12 the new value cannot be used within the same transaction it was added. Drizzle-kit `generate` will detect the schema diff and emit the correct `ALTER TYPE` SQL in a named migration file; the project's existing migration infrastructure (drizzle-kit migrate, breakpoints) already handles this pattern — migration 0001 proves it works.

The challenger_organisations table is new and has no irreversibility concerns; it is a standard Drizzle table definition. Rate-limiting uses `express-rate-limit` v8 with a custom `keyGenerator` that extracts the `X-API-Key` header, applying limits per-key rather than per-IP. VANTAGE-CONTRACT.md is a human-authored Markdown document listing consumed endpoints; no code generation is needed.

**Primary recommendation:** Implement API key middleware as a standalone module parallel to `middleware/auth.ts`, add `challenger` to `contributorRoleEnum` in schema.ts and generate a named migration, wire `express-rate-limit` on the VANTAGE route prefix, and create `VANTAGE-CONTRACT.md` documenting the endpoints VANTAGE will call.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `express-rate-limit` | 8.3.1 (latest) | Per-key rate limiting on VANTAGE endpoints | First-party Express middleware; production-proven; custom `keyGenerator` support |
| `node:crypto` (built-in) | Node.js stdlib | SHA-256 hashing of raw API keys; `randomBytes` for generation; `timingSafeEqual` for comparison | No dependency, constant-time comparison prevents timing attacks |
| `drizzle-orm` / `drizzle-kit` | 0.38.0 / 0.30.0 (already installed) | Schema migration for `challenger_organisations` table and `contributor_role` enum | Already in use; generates correct `ALTER TYPE ADD VALUE` SQL |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 3.24.0 (already installed) | Validate API key creation request body (name, scopes, expiresAt) | Consistent with existing pattern |
| `@indomitable-unity/shared` | workspace | `ContributorRole` type union must include `"challenger"` | Shared types keep middleware and routes in sync |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SHA-256 (crypto stdlib) | bcrypt/argon2 | SHA-256 is fine for API keys (random 32-byte value, not user-chosen password); bcrypt/argon2 add latency with no security benefit for high-entropy random keys |
| express-rate-limit in-memory store | Redis store (`rate-limit-redis`) | In-memory is fine for single-process dev; add Redis store if horizontal scaling required — out of scope for this phase |

**Installation:**
```bash
npm install express-rate-limit
```
(No other new dependencies required — crypto is Node built-in, all others already installed.)

---

## Architecture Patterns

### Recommended Project Structure

New files to add within the existing server structure:

```
packages/server/src/
├── middleware/
│   ├── auth.ts                    # existing JWT cookie middleware
│   └── api-key-auth.ts            # NEW: X-API-Key middleware
├── routes/
│   ├── ...                        # existing routes
│   └── vantage.ts                 # NEW: VANTAGE-specific routes (rate-limited)
├── db/
│   └── schema.ts                  # modified: add challenger to contributorRoleEnum, add challenger_organisations table, add api_keys table
├── drizzle/
│   └── NNNN_add-challenger-role-and-orgs.sql  # generated migration
└── VANTAGE-CONTRACT.md            # NEW: endpoint contract document
```

### Pattern 1: API Key Middleware (Parallel to authMiddleware)

**What:** Reads `X-API-Key` header, SHA-256 hashes it, queries `api_keys` table for a matching hash that is active and not expired, attaches a synthetic identity to `req.vantageClient`.
**When to use:** On all VANTAGE routes only. Never applied to existing contributor routes.

```typescript
// Source: Node.js docs (crypto.createHash), project convention from middleware/auth.ts
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { apiKeys } from "../db/schema.js";

export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.headers["x-api-key"];

  if (!raw || typeof raw !== "string") {
    res.status(401).json({ error: "API key required" });
    return;
  }

  const incomingHash = createHash("sha256").update(raw).digest("hex");

  const db = getDb();
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, incomingHash),
        eq(apiKeys.isActive, true),
        gt(apiKeys.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!key) {
    res.status(401).json({ error: "Invalid or expired API key" });
    return;
  }

  // Attach identity for downstream handlers
  req.vantageClient = { keyId: key.id, scopes: key.scopes as string[] };
  next();
}
```

Note: `req.vantageClient` requires a declaration merging extension on `Express.Request`, matching the pattern used for `req.contributor` in `middleware/auth.ts`.

### Pattern 2: API Key Generation (Show-Once Pattern)

**What:** Generate a cryptographically random raw key, derive the hash, store only the hash. Return the raw key exactly once in the creation response.
**When to use:** `POST /api/vantage/keys` endpoint only.

```typescript
// Source: Node.js docs (crypto.randomBytes)
import { randomBytes, createHash } from "node:crypto";

function generateApiKey(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex"); // 64-char hex string
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}
```

Insert `hash` into `api_keys.key_hash`. Return `raw` in the response body — never stored, never retrievable again.

### Pattern 3: Rate Limiting on VANTAGE Routes

**What:** Apply `express-rate-limit` with `keyGenerator` reading `X-API-Key` header, scoped to the VANTAGE route prefix.
**When to use:** Applied at the router level for all VANTAGE endpoints.

```typescript
// Source: https://express-rate-limit.mintlify.app/reference/configuration (verified 2026-03-16)
import { rateLimit } from "express-rate-limit";

export const vantageRateLimiter = rateLimit({
  windowMs: 60 * 1000,    // 1-minute window
  limit: 60,              // 60 requests per window per key (adjust to spec)
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by API key, not by IP
    return (req.headers["x-api-key"] as string) ?? req.ip ?? "unknown";
  },
  handler: (_req, res) => {
    res.status(429).json({ error: "Rate limit exceeded" });
  },
});
```

Apply in `express-app.ts` or in `routes/vantage.ts`:
```typescript
router.use(vantageRateLimiter);
router.use(apiKeyMiddleware);
```

Rate limiter MUST be applied before `apiKeyMiddleware` so unauthenticated flooding is also throttled.

### Pattern 4: Drizzle Schema Changes

**What:** Add `"challenger"` to `contributorRoleEnum`, add `api_keys` table, add `challenger_organisations` table.
**When to use:** Single schema.ts edit; generates one named migration.

```typescript
// Extend existing contributorRoleEnum — Source: drizzle-orm/pg-core pgEnum usage
export const contributorRoleEnum = pgEnum("contributor_role", [
  "contributor",
  "community_manager",
  "admin",
  "challenger",  // ADD THIS VALUE
]);

// New api_keys table
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => contributors.id, { onDelete: "set null" }),
});

// New challenger_organisations table
export const challengerOrganisations = pgTable("challenger_organisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  apiKeyId: uuid("api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Generate migration with a descriptive name:
```bash
npm run db:generate -- --name=add-challenger-role-and-orgs
```

This emits `ALTER TYPE "public"."contributor_role" ADD VALUE 'challenger';` plus `CREATE TABLE` statements.

### Pattern 5: VANTAGE-CONTRACT.md

**What:** A Markdown document at `packages/server/VANTAGE-CONTRACT.md` listing every endpoint VANTAGE calls, with request headers, query params, request body, response shape, and HTTP status codes.
**When to use:** Authored once; kept in sync with route changes.

Structure:
```markdown
# VANTAGE API Contract

## Authentication
All endpoints require: `X-API-Key: <raw-key>`

## Endpoints

### GET /api/challenges
**Purpose:** List open challenges for challenger portal
**Headers:** X-API-Key (required)
**Query:** page, limit, domain, type
**Response 200:** { challenges: ChallengeListItem[], total: number }
**Response 401:** { error: string }
**Response 429:** { error: string }

...
```

### Anti-Patterns to Avoid

- **Reusing `authMiddleware` for API keys:** The JWT cookie middleware returns 401 if no `access_token` cookie is present. VANTAGE requests have no cookie. Never apply `authMiddleware` to VANTAGE routes.
- **Storing the raw API key:** Only the SHA-256 hash goes in the database. The raw key is returned once at creation and then discarded server-side.
- **Applying rate limit AFTER auth middleware:** An unauthenticated client can flood the auth check. Rate limit first.
- **Using `==` or `===` to compare hashes:** Must use `crypto.timingSafeEqual` to prevent timing attacks.
- **Blocking `ALTER TYPE ADD VALUE` inside a transaction:** Drizzle-kit migrate runs each `-->` breakpoint segment as a separate statement. The existing `0001_numerous_puppet_master.sql` proves this works (`ALTER TYPE "public"."comm_channel" ADD VALUE 'both';`). Do not manually wrap the migration in a BEGIN/COMMIT block.
- **Running migrations on production without staging verification:** The phase notes explicitly require staging deploy verification before production because the enum ADD is irreversible.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Rate limiting per key | Custom request counter in memory | `express-rate-limit` v8 with `keyGenerator` | Edge cases: multiple simultaneous requests, window reset, 429 headers, store abstraction |
| Cryptographically random key | `Math.random()`-based string | `crypto.randomBytes(32).toString('hex')` | `Math.random` is not cryptographically secure |
| Timing-safe hash comparison | `===` string comparison | `crypto.timingSafeEqual()` | Constant-time comparison prevents timing oracle attacks |
| Schema diffing / SQL generation | Handwritten ALTER statements | `drizzle-kit generate --name=...` | Drizzle tracks migration state in `_journal.json`; handwritten files can desync the journal |

**Key insight:** The rate limiting and crypto primitives exist precisely because the naïve implementations have well-known security holes. Use the standard tools.

---

## Common Pitfalls

### Pitfall 1: ALTER TYPE ADD VALUE in a Transaction Block

**What goes wrong:** The migration runner wraps all statements in a transaction. `ALTER TYPE ... ADD VALUE` cannot be used within the same transaction on PostgreSQL (pre-12 it fails entirely; post-12 the value cannot be used within that transaction).
**Why it happens:** drizzle-kit's default migration runner may wrap statements in `BEGIN`/`COMMIT`. However, drizzle-kit uses `-->statement-breakpoint` to split statements and runs each independently — this is proven by migration 0001 in this project which already uses `ALTER TYPE ADD VALUE` successfully.
**How to avoid:** Use `drizzle-kit migrate` (not raw `psql` with a manually wrapped script). Never manually add `BEGIN;` around the migration SQL.
**Warning signs:** Error message `ERROR: ALTER TYPE ... ADD cannot run inside a transaction block` from Postgres.

### Pitfall 2: Raw API Key Leaking via Logs

**What goes wrong:** The raw API key appears in access logs, error logs, or response objects beyond the creation response.
**Why it happens:** Logging middleware logs full request headers; error handlers log request state.
**How to avoid:** Ensure logging middleware masks or omits `X-API-Key` header. Never log the raw key variable after generation. The creation endpoint returns it in the response body (not header) so it is not auto-logged.
**Warning signs:** Raw 64-char hex strings appearing in application logs.

### Pitfall 3: ContributorRole Type Not Updated in Shared Package

**What goes wrong:** The `ContributorRole` type in `packages/shared/src/types/auth.ts` still reads `"contributor" | "community_manager" | "admin"`. After the DB migration adds `"challenger"`, TypeScript code that reads the role from the database gets type errors or silently passes unknown values.
**Why it happens:** Schema and shared types are maintained separately.
**How to avoid:** Update `ContributorRole` in `shared/src/types/auth.ts` in the same PR as the schema change. Also update `CONTRIBUTOR_ROLES` constant in `shared/src/constants.ts` if it exists as a runtime array.
**Warning signs:** TypeScript error `Type '"challenger"' is not assignable to type 'ContributorRole'`.

### Pitfall 4: Rate Limiter Applied to All Routes

**What goes wrong:** `vantageRateLimiter` is mounted at the top-level app rather than on the VANTAGE router, throttling regular contributor requests.
**Why it happens:** Express middleware mounting order confusion.
**How to avoid:** Mount the rate limiter only in `routes/vantage.ts` (or under a specific `/api/vantage` prefix in `express-app.ts`), not via `app.use(vantageRateLimiter)` globally.
**Warning signs:** Contributors receiving 429 responses on non-VANTAGE endpoints.

### Pitfall 5: API Key Lookup Performance

**What goes wrong:** Every VANTAGE request does a full table scan of `api_keys` to find a matching hash.
**Why it happens:** No index on `key_hash` column.
**How to avoid:** Drizzle's `.unique()` on `keyHash` automatically creates a unique index in PostgreSQL. The lookup `WHERE key_hash = $1` uses that index.
**Warning signs:** Slow VANTAGE requests under load; EXPLAIN ANALYZE showing sequential scan.

### Pitfall 6: Staging Not Verified Before Production

**What goes wrong:** `ALTER TYPE ADD VALUE` is applied to production with a typo or wrong value — it cannot be reversed. Removing an enum value in Postgres requires a complex multi-step migration (alter to text, drop type, recreate, alter back).
**Why it happens:** Rushing migrations to production.
**How to avoid:** Apply and verify the migration on a staging environment first. Confirm with `SELECT enum_range(NULL::contributor_role)` that `'challenger'` appears.
**Warning signs:** Deployment pipeline that skips staging.

---

## Code Examples

Verified patterns from official sources:

### SHA-256 Hash Generation (Node.js stdlib)

```typescript
// Source: https://nodejs.org/api/crypto.html#cryptocreatehashalgorithm-options
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Generate a raw API key
const rawKey = randomBytes(32).toString("hex"); // 64-char hex

// Hash it for storage
const keyHash = createHash("sha256").update(rawKey).digest("hex");

// Compare incoming key against stored hash (timing-safe)
function verifyApiKey(incoming: string, storedHash: string): boolean {
  const incomingHash = createHash("sha256").update(incoming).digest("hex");
  const a = Buffer.from(incomingHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

### express-rate-limit with X-API-Key keyGenerator

```typescript
// Source: https://express-rate-limit.mintlify.app/reference/configuration (verified 2026-03-16)
// Current version: 8.3.1
import { rateLimit } from "express-rate-limit";

const vantageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers["x-api-key"];
    return typeof apiKey === "string" ? apiKey : (req.ip ?? "unknown");
  },
  handler: (_req, res) => {
    res.status(429).json({ error: "Rate limit exceeded" });
  },
});
```

### Drizzle pgEnum — Adding a Value

```typescript
// Source: drizzle-orm/pg-core pgEnum usage; existing schema.ts pattern
// Modify the existing array in packages/server/src/db/schema.ts:
export const contributorRoleEnum = pgEnum("contributor_role", [
  "contributor",
  "community_manager",
  "admin",
  "challenger",   // added
]);

// Then run:
// npm run db:generate -- --name=add-challenger-role-and-orgs
// npm run db:migrate
```

Drizzle-kit generates:
```sql
ALTER TYPE "public"."contributor_role" ADD VALUE 'challenger';
```

### Express Request Augmentation for vantageClient

```typescript
// Extend Express.Request — add to middleware/api-key-auth.ts
declare global {
  namespace Express {
    interface Request {
      vantageClient?: {
        keyId: string;
        scopes: string[];
      };
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `max` option in express-rate-limit | `limit` option | v7.0 | `max` still works (deprecated alias) but `limit` is canonical |
| `X-RateLimit-*` legacy headers | `RateLimit` combined header (draft-8) | v6+ | Set `standardHeaders: 'draft-8'`, `legacyHeaders: false` |
| express-rate-limit v5 IP-only limiting | v7+/v8 with `keyGenerator` for any identifier | v7.0 | Direct support for API-key based rate limiting |

**Deprecated/outdated:**
- `max` option: Renamed to `limit` in v7. Use `limit`.
- Legacy `X-RateLimit-*` headers: Use `standardHeaders: 'draft-8'` for RFC-compliant headers.

---

## Open Questions

1. **Rate limit values (requests per window)**
   - What we know: The requirement says "rate-limited (express-rate-limit)" but does not specify the threshold.
   - What's unclear: How many requests per minute/hour is VANTAGE expected to make? What constitutes abuse?
   - Recommendation: Use 60 req/min as a reasonable default; document the value in VANTAGE-CONTRACT.md so VANTAGE can budget accordingly. The planner should note this as a configurable value (env var or constant).

2. **API key scopes schema**
   - What we know: VANT-02 says "scoped permissions." The phase does not define specific scope names.
   - What's unclear: What scopes are needed (e.g., `challenges:read`, `impact:read`)?
   - Recommendation: Store scopes as `jsonb` string array. Define scope constants in the shared package. The middleware can check required scopes per-endpoint. Scope definition can be minimal for this phase (a single `"vantage"` scope) with expansion deferred.

3. **VANTAGE-CONTRACT.md endpoint inventory**
   - What we know: VANTAGE is a challenger portal that will consume REST endpoints. Phase 10 handles the challenger registration flow.
   - What's unclear: Which existing endpoints does VANTAGE need right now (challenges list? impact data?).
   - Recommendation: The contract document should list the endpoints VANTAGE will consume in Phase 10+. The planner should scaffold the contract with at minimum: challenge listing and the authentication/key endpoints. Exact endpoint shapes can be filled from existing route implementations.

4. **challenger_organisations table detail**
   - What we know: The table must exist per success criteria. Phase 10 handles the registration flow.
   - What's unclear: What columns are required beyond the basics? Does it need an `api_key_id` FK, or is that Phase 10?
   - Recommendation: Create a minimal schema now (id, name, contact_email, created_at, updated_at) with an optional `api_key_id` FK. Phase 10 can add columns via a new migration.

---

## Sources

### Primary (HIGH confidence)
- Node.js stdlib `node:crypto` — `createHash`, `randomBytes`, `timingSafeEqual` verified at https://nodejs.org/api/crypto.html
- PostgreSQL official docs — `ALTER TYPE ADD VALUE` transaction restriction verified at https://www.postgresql.org/docs/current/sql-altertype.html
- express-rate-limit configuration — `keyGenerator`, `limit`, `windowMs` verified at https://express-rate-limit.mintlify.app/reference/configuration (latest release v8.3.1 per GitHub, March 2026)
- drizzle-kit generate — `--name` flag, `-->statement-breakpoint` mechanism verified at https://orm.drizzle.team/docs/drizzle-kit-generate

### Secondary (MEDIUM confidence)
- `packages/server/drizzle/0001_numerous_puppet_master.sql` — confirms drizzle-kit already generates `ALTER TYPE ADD VALUE` correctly in this project; the migration runner handles it outside a transaction.
- API key SHA-256 hashing pattern — multiple consistent sources: https://zuplo.com/blog/2022/12/01/api-key-authentication, https://codesignal.com/learn/courses/api-key-authentication-security/lessons/api-key-generation-basics

### Tertiary (LOW confidence)
- SHA-256 vs bcrypt for API keys — noted that SHA-256 is appropriate for high-entropy random keys (not user-chosen passwords); single source (Zuplo blog). Cross-referenced with Node.js crypto docs confirming SHA-256 availability. Recommendation stands.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — express-rate-limit v8 verified; crypto stdlib is stable; drizzle-kit already in use in project
- Architecture patterns: HIGH — patterns follow existing codebase conventions (middleware/auth.ts, db/schema.ts, route pattern)
- Pitfalls: HIGH — ALTER TYPE ADD VALUE transaction restriction confirmed by PostgreSQL official docs; existing project migration 0001 confirms drizzle-kit handles it correctly
- Open questions: MEDIUM — rate limit values and scope definitions are policy decisions not yet specified

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (express-rate-limit and drizzle-kit are stable; PostgreSQL ALTER TYPE behaviour is extremely stable)
