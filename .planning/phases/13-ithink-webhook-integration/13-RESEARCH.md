# Phase 13: iThink Webhook Integration - Research

**Researched:** 2026-03-23
**Domain:** HMAC-SHA256 webhook security, Express raw body middleware, PostgreSQL idempotency tables, dual-secret rotation, react-native-quick-crypto
**Confidence:** HIGH

## Summary

Phase 13 is a security-first integration: iThink (a React Native neurodivergence assessment app) sends signed webhook POST requests to IU when a screening flags a contributor as needing attention. The IU receiver must validate the HMAC-SHA256 signature before doing anything else, enforce a 5-minute timestamp window to prevent replays, deduplicate via a `webhook_deliveries` table, confirm the contributor-institution relationship, and then insert an `ithink_attention_flags` record. Secret rotation must allow a transition window where both old and new secrets are accepted simultaneously.

All required cryptographic primitives exist in Node.js `node:crypto` — no new npm packages are needed on the IU server side. The Stripe webhook handler in `packages/server/src/routes/payments.ts` already demonstrates the exact `express.raw()` pattern required. The `timingSafeEqual` pattern in `api-key-auth.ts` is directly reusable. The migration pattern (targeted `.mjs` script, mark in `drizzle.__drizzle_migrations`) is established by Phases 11 and 12.

On the iThink side, `react-native-quick-crypto` v1.0.18 (current as of 2026-03-23) has full `Hmac` class support (`createHmac`, `hmac.update`, `hmac.digest`) verified against the library's implementation coverage document. iThink dispatches fire-and-forget after screening completes — no retry logic needed at this phase. Dual-secret rotation uses two env vars (`ITHINK_WEBHOOK_SECRET` and `ITHINK_WEBHOOK_SECRET_PREV`) and tries both in sequence; the transition window is controlled by clearing `_PREV` when rotation is complete.

**Primary recommendation:** Copy the Stripe `webhookHandler` + `express.raw()` pattern exactly, but add three layers Stripe doesn't need: timestamp window check, idempotency table lookup, and institution relationship check — all BEFORE touching `ithink_attention_flags`.

## Standard Stack

### Core (no new packages required on IU server)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:crypto` | Node built-in | `createHmac`, `timingSafeEqual` | Zero dependencies, already used in `api-key-auth.ts` |
| `drizzle-orm` | 0.38.x (existing) | `webhook_deliveries` and `ithink_attention_flags` table queries | Matches existing ORM |
| `zod` | existing | Payload schema validation (WHOOK-05) | Already used throughout |
| `express` | existing | `express.raw()` for raw body capture | Already used for Stripe webhook |
| `postgres` | existing | Migration scripts | Matches Phase 11/12 pattern |

### iThink Side
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native-quick-crypto` | 1.0.18 | `createHmac` SHA256 signing in React Native | Full `Hmac` class implementation verified; Nitro Modules, Node.js API-compatible |
| `react-native-nitro-modules` | peer dep | Required by react-native-quick-crypto v1.x | Required peer dep for Nitro architecture |
| `react-native-quick-base64` | peer dep | Required by react-native-quick-crypto | Required peer dep |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:crypto` on IU server | `@noble/hashes` | node:crypto is built-in — no install needed |
| `react-native-quick-crypto` on iThink | Web Crypto API (`expo-crypto`) | Web Crypto is async-only and lacks `createHmac` Node-style API; quick-crypto is synchronous and matches Node.js idioms exactly |
| `react-native-quick-crypto` on iThink | `react-native-nitro-crypto` | nitro-crypto is newer but less mature; quick-crypto is the established choice |

**Installation (iThink only — IU server needs nothing new):**
```bash
# In iThink React Native project:
npm install react-native-quick-crypto react-native-nitro-modules react-native-quick-base64
cd ios && pod install
```

## Architecture Patterns

### Recommended File Structure (IU server additions)
```
packages/server/
├── scripts/
│   └── create-webhook-tables.mjs     # migration: ithink_attention_flags + webhook_deliveries
├── src/
│   ├── db/
│   │   └── schema.ts                 # add ithinkAttentionFlags, webhookDeliveries tables
│   ├── routes/
│   │   └── webhooks.ts               # POST /api/webhooks/ithink handler
│   └── config/
│       └── env.ts                    # add ITHINK_WEBHOOK_SECRET, ITHINK_WEBHOOK_SECRET_PREV
```

```
iThink React Native app/
└── src/
    └── services/
        └── webhook.service.ts        # HMAC signing + POST dispatch
```

Registration in `express-app.ts`:
```typescript
// Raw body BEFORE express.json() — same pattern as Stripe
import { ithinkWebhookHandler } from "./routes/webhooks.js";
app.post("/api/webhooks/ithink", express.raw({ type: "application/json" }), ithinkWebhookHandler);
```

### Pattern 1: Raw Body Registration (CRITICAL — must precede express.json)

**What:** The webhook route must be registered with `express.raw()` BEFORE the global `express.json()` middleware. If JSON parsing runs first, the raw bytes differ from what iThink signed.

**When to use:** Every webhook route that verifies an HMAC signature.

**Example:**
```typescript
// Source: existing packages/server/src/express-app.ts (Stripe pattern)
// Register BEFORE express.json():
app.post("/api/webhooks/ithink", express.raw({ type: "application/json" }), ithinkWebhookHandler);

// Then the global parser:
app.use(express.json());
```

### Pattern 2: HMAC-SHA256 Verification with timingSafeEqual

**What:** Compute `HMAC-SHA256(secret, rawBody)` and compare with the incoming signature using `timingSafeEqual`. Both buffers must be the same length before comparison.

**When to use:** All webhook signature checks.

**Example:**
```typescript
// Source: node:crypto docs + existing api-key-auth.ts pattern
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(rawBody: Buffer, incomingSig: string, secret: string): boolean {
  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const incomingBuf = Buffer.from(incomingSig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  if (incomingBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(incomingBuf, expectedBuf);
}
```

### Pattern 3: Dual-Secret Rotation

**What:** Two env vars (`ITHINK_WEBHOOK_SECRET` and `ITHINK_WEBHOOK_SECRET_PREV`) are checked in sequence. A request is valid if EITHER matches. During rotation: set new secret as `ITHINK_WEBHOOK_SECRET`, move old to `ITHINK_WEBHOOK_SECRET_PREV`, deploy. After all in-flight requests clear (minutes), clear `_PREV`.

**When to use:** WHOOK-08 admin secret rotation.

**Example:**
```typescript
// Source: Svix dual-secret pattern (https://www.svix.com/blog/zero-downtime-secret-rotation-webhooks/)
function verifyWithDualSecret(rawBody: Buffer, sig: string): boolean {
  const primary = getEnv().ITHINK_WEBHOOK_SECRET;
  const prev = getEnv().ITHINK_WEBHOOK_SECRET_PREV;

  if (verifySignature(rawBody, sig, primary)) return true;
  if (prev && verifySignature(rawBody, sig, prev)) return true;
  return false;
}
```

### Pattern 4: Idempotency Guard via webhook_deliveries

**What:** Before writing any flag, check if `delivery_id` already exists in `webhook_deliveries`. If it does, return 200 immediately. If not, insert it and proceed. The delivery_id is a unique ID from the iThink payload (e.g. UUID per dispatch).

**Example:**
```typescript
// Check idempotency AFTER signature + timestamp checks, BEFORE flag insert
const [existing] = await db
  .select({ id: webhookDeliveries.id })
  .from(webhookDeliveries)
  .where(eq(webhookDeliveries.deliveryId, payload.deliveryId))
  .limit(1);

if (existing) {
  res.json({ received: true });
  return;
}

// Insert delivery record (idempotency lock)
await db.insert(webhookDeliveries).values({ deliveryId: payload.deliveryId, receivedAt: new Date() });
```

### Pattern 5: Timestamp Replay Window

**What:** The iThink payload includes a `timestamp` (Unix epoch seconds). IU rejects requests where `Math.abs(Date.now() / 1000 - timestamp) > 300` (5 minutes = 300 seconds).

**When to use:** Always — before idempotency check, before DB writes.

**Example:**
```typescript
const now = Math.floor(Date.now() / 1000);
const age = Math.abs(now - payload.timestamp);
if (age > 300) {
  res.status(401).json({ error: "Request timestamp outside acceptable window" });
  return;
}
```

### Pattern 6: iThink HMAC Signing (React Native)

**What:** iThink signs the JSON body using `react-native-quick-crypto`'s `createHmac`. The signature goes in a custom header (e.g. `X-IThink-Signature`). Body is the raw JSON string.

**Example:**
```typescript
// Source: react-native-quick-crypto implementation coverage docs (Hmac class: fully implemented)
import QuickCrypto from "react-native-quick-crypto";

function signPayload(body: string, secret: string): string {
  return QuickCrypto.createHmac("sha256", secret)
    .update(body)
    .digest("hex");
}

// In the dispatch function:
const body = JSON.stringify(payload);
const signature = signPayload(body, ITHINK_WEBHOOK_SECRET);

await fetch(IU_WEBHOOK_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-IThink-Signature": signature,
    "X-IThink-Timestamp": String(Math.floor(Date.now() / 1000)),
    "X-IThink-Delivery": payload.deliveryId,
  },
  body,
});
```

### Pattern 7: Institution Relationship Check (WHOOK-06)

**What:** After validating the signature, timestamp, and idempotency, verify the contributor identified by `contributorEmail` is actually assigned to the institution identified by `institutionSlug`. Uses the `contributor_institutions` junction table built in Phase 12.

**Example:**
```typescript
// Join through contributor email → id, then check junction table
const [contributor] = await db
  .select({ id: contributors.id })
  .from(contributors)
  .where(eq(contributors.email, payload.contributorEmail))
  .limit(1);

const [institution] = await db
  .select({ id: institutions.id })
  .from(institutions)
  .where(eq(institutions.slug, payload.institutionSlug))
  .limit(1);

if (!contributor || !institution) {
  res.status(422).json({ error: "Unknown contributor or institution" });
  return;
}

const [assignment] = await db
  .select({ id: contributorInstitutions.id })
  .from(contributorInstitutions)
  .where(
    and(
      eq(contributorInstitutions.contributorId, contributor.id),
      eq(contributorInstitutions.institutionId, institution.id),
    ),
  )
  .limit(1);

if (!assignment) {
  res.status(403).json({ error: "Contributor not assigned to this institution" });
  return;
}
```

### Complete Webhook Handler Order of Operations

This order is non-negotiable — any deviation creates security holes:

```
1. Signature verification (timingSafeEqual, dual-secret)
2. Timestamp window check (replay protection)
3. Zod schema validation
4. Idempotency check (webhook_deliveries lookup)
5. Institution relationship check (WHOOK-06)
6. Flag insertion (ithink_attention_flags)
7. Delivery record insertion (mark as processed)
8. Return 200
```

### Anti-Patterns to Avoid
- **Parsing JSON before verifying signature:** `express.json()` must not run before the webhook route. Always register with `express.raw()` per the Stripe pattern already in the codebase.
- **Using `===` or `==` for signature comparison:** Always use `timingSafeEqual`. Timing attacks are real.
- **Writing the flag before checking idempotency:** Idempotency check must come before all writes. A duplicate request with a valid signature should never create a second flag.
- **Swallowing institution check errors silently:** Return 403 and write nothing. Do not fail open.
- **Fallback value for ITHINK_WEBHOOK_SECRET:** The phase requirements specify no fallback (unlike JWT_SECRET which defaults in dev). Missing secret must throw at startup, not at request time.
- **Trusting `institutionSlug` without DB lookup:** Always resolve slug → institution.id via DB, never assume the slug maps to anything without verification.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HMAC computation | Custom SHA256 loop | `node:crypto createHmac` | Handles encoding, streaming, endianness correctly |
| Timing-safe comparison | `sig1 === sig2` or character loops | `timingSafeEqual` | Character-by-character comparison leaks timing info |
| Idempotency | In-memory Map/Set | `webhook_deliveries` table with UNIQUE constraint | Process restarts lose memory; DB survives; handles concurrent requests |
| Secret rotation downtime | Rolling restart with single secret | Dual env var pattern | Zero overlap = potential delivery failures during rotation |
| Raw body capture | String parsing / `JSON.stringify(req.body)` | `express.raw()` before `express.json()` | Re-serialized JSON may differ (whitespace, key order) from what was signed |

**Key insight:** The DB is the only reliable idempotency store across process restarts and horizontal scaling. An in-memory guard would silently fail on restart.

## Common Pitfalls

### Pitfall 1: express.json() Middleware Ordering
**What goes wrong:** Global `express.json()` runs before the webhook handler, converting the raw Buffer to a parsed object. When you compute the HMAC over `req.body`, you're hashing a re-serialized string that may differ from what iThink signed.
**Why it happens:** `app.use(express.json())` is global. Routes registered after it get a parsed body.
**How to avoid:** Register the webhook route with `express.raw()` BEFORE the `app.use(express.json())` line. This is already the pattern for Stripe in `express-app.ts` (line 33).
**Warning signs:** Signature verification always fails in production but passes in unit tests where you pass the buffer directly.

### Pitfall 2: Buffer Length Mismatch Before timingSafeEqual
**What goes wrong:** `timingSafeEqual` throws if the two buffers have different lengths. If the incoming signature is malformed or truncated, an unhandled exception bubbles up.
**Why it happens:** Callers forget to check `incomingBuf.length !== expectedBuf.length` first.
**How to avoid:** Always check lengths before calling `timingSafeEqual`. Return `false` (not throw) on mismatch. This is the pattern already in `api-key-auth.ts` (lines 64-67).
**Warning signs:** 500 errors instead of 401 on malformed signature requests.

### Pitfall 3: Timestamp in Milliseconds vs Seconds
**What goes wrong:** iThink sends `Math.floor(Date.now() / 1000)` (seconds), but IU compares with `Date.now()` (milliseconds), making every request look 1000x older than it is.
**Why it happens:** Mixed conventions between environments.
**How to avoid:** Agree on Unix epoch seconds in the payload contract. Both sides divide `Date.now()` by 1000. Document this in the Zod schema comment.
**Warning signs:** All requests fail the 5-minute timestamp window even when sent immediately.

### Pitfall 4: No UNIQUE Constraint on webhook_deliveries
**What goes wrong:** Two simultaneous deliveries of the same event (iThink retries a timed-out request) both pass the idempotency SELECT before either inserts, resulting in two flags.
**Why it happens:** The SELECT + INSERT pattern has a race window.
**How to avoid:** Add a UNIQUE constraint on `delivery_id` in the `webhook_deliveries` table. Use `INSERT ... ON CONFLICT DO NOTHING` and check `rowCount`. If `rowCount === 0`, the delivery was already processed.
**Warning signs:** Duplicate flags in `ithink_attention_flags` for the same screening.

### Pitfall 5: ITHINK_WEBHOOK_SECRET Has a Default Fallback
**What goes wrong:** Developer sets a default in `env.ts` like `.default("dev-webhook-secret")`. In production, a misconfigured deployment silently uses the dev secret, and malicious actors who know the default can forge valid webhooks.
**Why it happens:** Convenience copy-paste from other env vars.
**How to avoid:** Use `z.string().min(32)` with NO `.default()`. The server must refuse to start if the secret is absent. This matches the phase requirement "no fallback."
**Warning signs:** Server starts without the env var set and processes requests normally.

### Pitfall 6: react-native-quick-crypto install() Not Called
**What goes wrong:** `createHmac` is undefined or falls back to a stub, producing incorrect signatures.
**Why it happens:** `react-native-quick-crypto` requires `install()` to be called at app startup to replace the global crypto module.
**How to avoid:** Call `import { install } from 'react-native-quick-crypto'; install();` at the top of the iThink app entry point before any crypto operations.
**Warning signs:** HMAC digests are all zeros or undefined at runtime on device; tests pass because Jest mocks the module.

## Code Examples

### DB Schema: webhook_deliveries and ithink_attention_flags

```typescript
// Source: schema.ts pattern from existing codebase (institutions, contributorInstitutions)

export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  deliveryId: varchar("delivery_id", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 50 }).notNull().default("ithink"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const ithinkSignalTypeEnum = pgEnum("ithink_signal_type", [
  "attention_flag",
  // extend as iThink signal types are added
]);

export const ithinkAttentionFlags = pgTable("ithink_attention_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  deliveryId: varchar("delivery_id", { length: 255 }).notNull().unique(),
  signalType: ithinkSignalTypeEnum("signal_type").notNull(),
  cohortSize: integer("cohort_size"),
  flaggedCount: integer("flagged_count"),
  clearedBy: uuid("cleared_by").references(() => contributors.id, { onDelete: "set null" }),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
  followUpNotes: text("follow_up_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### env.ts additions

```typescript
// Source: existing env.ts pattern (z.string().min(1) for required secrets)
// IMPORTANT: No .default() — server must refuse to start without this set
ITHINK_WEBHOOK_SECRET: z.string().min(32),
ITHINK_WEBHOOK_SECRET_PREV: z.string().min(32).optional(),
```

### Migration Script Structure

```javascript
// Source: create-institutions-table.mjs pattern
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL || '...');

await sql`
  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(50) NOT NULL DEFAULT 'ithink',
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
  )
`;

await sql`
  CREATE TYPE IF NOT EXISTS ithink_signal_type AS ENUM ('attention_flag')
`;

await sql`
  CREATE TABLE IF NOT EXISTS ithink_attention_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    delivery_id VARCHAR(255) NOT NULL UNIQUE,
    signal_type ithink_signal_type NOT NULL,
    cohort_size INTEGER,
    flagged_count INTEGER,
    cleared_by UUID REFERENCES contributors(id) ON DELETE SET NULL,
    cleared_at TIMESTAMPTZ,
    follow_up_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

// Mark migration:
await sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
          VALUES ('0006_ithink-webhook-tables', ${Date.now()})
          ON CONFLICT DO NOTHING`;
```

### Zod Payload Schema

```typescript
// Source: pattern from shared/src/schemas/ + phase requirements
import { z } from "zod";

export const ithinkWebhookPayloadSchema = z.object({
  deliveryId: z.string().uuid(),
  timestamp: z.number().int().positive(),  // Unix epoch seconds
  contributorEmail: z.string().email(),
  institutionSlug: z.string().min(1),
  signalType: z.enum(["attention_flag"]),
  cohortSize: z.number().int().min(1).optional(),
  flaggedCount: z.number().int().min(0).optional(),
});

export type IThinkWebhookPayload = z.infer<typeof ithinkWebhookPayloadSchema>;
```

### Complete IU Webhook Handler Skeleton

```typescript
// Source: synthesized from Stripe webhookHandler pattern + security requirements
export async function ithinkWebhookHandler(req: Request, res: Response): Promise<void> {
  // 1. Extract headers
  const sig = req.headers["x-ithink-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  // 2. Verify HMAC signature (dual-secret)
  if (!verifyWithDualSecret(req.body as Buffer, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 3. Parse payload for timestamp check (parse raw body manually)
  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse((req.body as Buffer).toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  // 4. Zod validation
  const result = ithinkWebhookPayloadSchema.safeParse(rawPayload);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }
  const payload = result.data;

  // 5. Timestamp window (5 minutes = 300 seconds)
  const age = Math.abs(Math.floor(Date.now() / 1000) - payload.timestamp);
  if (age > 300) {
    res.status(401).json({ error: "Request timestamp outside window" });
    return;
  }

  const db = getDb();

  // 6. Idempotency check
  const [existing] = await db
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.deliveryId, payload.deliveryId))
    .limit(1);

  if (existing) {
    res.json({ received: true });
    return;
  }

  // 7. Resolve contributor and institution
  const [contributor] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, payload.contributorEmail))
    .limit(1);

  const [institution] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.slug, payload.institutionSlug))
    .limit(1);

  if (!contributor || !institution) {
    res.status(422).json({ error: "Unknown contributor or institution" });
    return;
  }

  // 8. Institution relationship check
  const [assignment] = await db
    .select({ id: contributorInstitutions.id })
    .from(contributorInstitutions)
    .where(
      and(
        eq(contributorInstitutions.contributorId, contributor.id),
        eq(contributorInstitutions.institutionId, institution.id),
      ),
    )
    .limit(1);

  if (!assignment) {
    res.status(403).json({ error: "Contributor not assigned to this institution" });
    return;
  }

  // 9. Insert flag + delivery record
  await db.insert(ithinkAttentionFlags).values({
    contributorId: contributor.id,
    institutionId: institution.id,
    deliveryId: payload.deliveryId,
    signalType: payload.signalType,
    cohortSize: payload.cohortSize ?? null,
    flaggedCount: payload.flaggedCount ?? null,
  });

  await db.insert(webhookDeliveries).values({
    deliveryId: payload.deliveryId,
    source: "ithink",
  });

  res.json({ received: true });
}
```

### iThink webhook.service.ts Skeleton

```typescript
// Source: react-native-quick-crypto docs (Hmac class: fully implemented)
import { install } from "react-native-quick-crypto";
import QuickCrypto from "react-native-quick-crypto";

install(); // Must be called before any crypto operations

const IU_WEBHOOK_URL = process.env.IU_WEBHOOK_URL!;
const ITHINK_WEBHOOK_SECRET = process.env.ITHINK_WEBHOOK_SECRET!;

export async function dispatchAttentionFlag(params: {
  contributorEmail: string;
  institutionSlug: string;
  signalType: string;
  cohortSize?: number;
  flaggedCount?: number;
}): Promise<void> {
  const payload = {
    deliveryId: generateUUID(),   // platform UUID
    timestamp: Math.floor(Date.now() / 1000),
    ...params,
  };

  const body = JSON.stringify(payload);
  const signature = QuickCrypto.createHmac("sha256", ITHINK_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  // Fire-and-forget — don't await in the screening handler
  fetch(IU_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-IThink-Signature": signature,
    },
    body,
  }).catch((err) => console.warn("[webhook] dispatch failed:", err));
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `crypto` from JSI bridge in React Native | `react-native-quick-crypto` via Nitro Modules (C++ JSI) | v1.0 (2024) | No bridge overhead; synchronous; drops old `rn-nodeify` shimming |
| Single webhook secret rotation = downtime | Dual-secret env var pattern | Established pattern (Svix, GitHub, Stripe) | Zero-downtime rotation with no custom infrastructure |
| Stripe-style `stripe-signature` header with version prefix | Project-specific header (`X-IThink-Signature`) | Project design | Simpler; no version negotiation needed for this integration |

**Deprecated/outdated:**
- `rn-nodeify` + `node-libs-react-native`: The old way to get Node.js crypto in React Native — incompatible with New Architecture. `react-native-quick-crypto` replaces it.
- `Buffer.from(sig).equals(Buffer.from(expected))`: NOT timing-safe. Always use `timingSafeEqual`.

## Open Questions

1. **iThink payload contract field names confirmed?**
   - What we know: Phase context lists `contributorEmail, institutionSlug, signalType, cohortSize, flaggedCount` as the agreed contract
   - What's unclear: STATE.md flags this as a prerequisite — "must be agreed before Phase 13 planning begins — any field name deviation breaks Zod schema"
   - Recommendation: Planner should include a checkpoint task in 13-01 or 13-02 to confirm these exact names with Kirk before the Zod schema is finalised. The schema above uses these names as planned — treat them as confirmed unless Kirk corrects them.

2. **iThink repo file structure**
   - What we know: STATE.md flags this as unconfirmed — "architecture estimates file paths from project description, not direct inspection"
   - What's unclear: Where `webhook.service.ts` should live; whether a `services/` directory exists; whether it's Expo or bare React Native
   - Recommendation: Plan 13-03 should include a task step to confirm the actual repo structure before creating files. The planner should use a `checkpoint:human-verify` before writing iThink-side files.

3. **`webhook_deliveries` table: TTL/cleanup strategy**
   - What we know: For idempotency, delivery IDs should persist long enough to cover the iThink retry window
   - What's unclear: iThink retry policy is not documented — how many retries, over what period?
   - Recommendation: Keep all delivery records indefinitely at this phase (table will be small). Add cleanup as a future enhancement. This is safe and simple.

4. **`ITHINK_WEBHOOK_SECRET_PREV` handling when not set**
   - What we know: `z.string().min(32).optional()` allows the env var to be absent
   - What's unclear: When absent, `verifyWithDualSecret` should skip the `_PREV` check — this must not throw
   - Recommendation: Guard `if (prev && verifySignature(...))` — already in the code example above.

## Sources

### Primary (HIGH confidence)
- Existing codebase `packages/server/src/middleware/api-key-auth.ts` — `timingSafeEqual` pattern (lines 60-70)
- Existing codebase `packages/server/src/express-app.ts` — `express.raw()` webhook registration pattern (line 33)
- Existing codebase `packages/server/src/routes/payments.ts` — webhook handler with idempotency guard (lines 300-326)
- Existing codebase `packages/server/src/config/env.ts` — env schema pattern (zod, no-default for secrets)
- Existing codebase `packages/server/scripts/create-institutions-table.mjs` — migration script pattern
- `react-native-quick-crypto` implementation coverage doc (fetched 2026-03-23) — Hmac class marked ✅ fully implemented
- Node.js `node:crypto` docs — `createHmac`, `timingSafeEqual`

### Secondary (MEDIUM confidence)
- GitHub Docs — Validating webhook deliveries (https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) — confirms `timingSafeEqual` pattern and raw body requirement
- Svix Blog — Zero downtime secret rotation (https://www.svix.com/blog/zero-downtime-secret-rotation-webhooks/) — dual-secret with space-delimited signatures pattern

### Tertiary (LOW confidence)
- WebSearch results on idempotency table patterns — consistent with Stripe implementation in codebase, elevated to MEDIUM by cross-reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all IU server libraries are existing codebase; react-native-quick-crypto HMAC verified against implementation coverage doc
- Architecture: HIGH — patterns are direct copies of existing working code (Stripe webhook handler, api-key-auth)
- Pitfalls: HIGH — most pitfalls are verified against actual codebase code (express.raw ordering, timingSafeEqual buffer length check)
- Open questions: documented honestly — payload contract and iThink file structure need human confirmation before Plan 13-03 executes

**Research date:** 2026-03-23
**Valid until:** 2026-04-23 (stable domain; react-native-quick-crypto version pinned at 1.0.18)
