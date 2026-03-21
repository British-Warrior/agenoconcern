# Architecture Research

**Domain:** Social enterprise platform — v1.2 Institution Management & iThink Integration
**Researched:** 2026-03-21
**Confidence:** HIGH (IU codebase direct inspection), MEDIUM (iThink — described from project context, not directly inspectable)

---

## System Overview (v1.1 Baseline)

```
┌───────────────────────────────────────────────────────────────────┐
│                        Browser / PWA                              │
│  React SPA (Vite) — BrowserRouter, AuthProvider, TanStack Query   │
│  Cookie auth (httpOnly JWT) — apiClient with 401 auto-refresh     │
└───────────────────────────────┬───────────────────────────────────┘
                                │ HTTPS REST (credentials: include)
┌───────────────────────────────▼───────────────────────────────────┐
│                    Express Server (Node.js / TypeScript)           │
│  Middleware chain: cors → cookieParser → rawBody(stripe/webhook)  │
│                    → express.json()                               │
│  Auth: authMiddleware (JWT cookie) + requireRole() factory        │
│  API key auth: apiKeyMiddleware (VANTAGE — X-API-Key header)      │
│  Routes (all under /api/):                                        │
│    auth, onboarding, challenges, circles, payments, impact,       │
│    wellbeing, notifications, vantage, challenger, institutions    │
└───────────────────────────────┬───────────────────────────────────┘
                                │ Drizzle ORM (pg driver)
┌───────────────────────────────▼───────────────────────────────────┐
│                         PostgreSQL                                 │
│  22 tables — contributors, contributor_profiles, cv_parse_jobs,   │
│  challenges, challenge_interests, circles, circle_members,        │
│  circle_notes, note_attachments, circle_resolutions,             │
│  resolution_ratings, consent_records, payment_transactions,       │
│  contributor_hours, wellbeing_checkins, push_subscriptions,       │
│  notifications, oauth_accounts, password_reset_tokens,            │
│  challenger_organisations, api_keys, institutions                 │
└───────────────────────────────────────────────────────────────────┘

                    iThink (separate system)
┌───────────────────────────────────────────────────────────────────┐
│  React Native app + Express API (/api/*)                          │
│  Session-based auth (cookie). SQLite local DB.                    │
│  Will gain outbound webhook dispatch capability in v1.2.          │
└───────────────────────────────────────────────────────────────────┘
```

---

## v1.2 Integration Map

Six features. Each has a distinct integration profile. This section answers: what is new, what is modified, what is untouched — for both IU and iThink.

---

### Feature 1: Contributor-Institution FK

**Current state:**

`institutions` table exists with `stats_json JSONB` holding pre-seeded hardcoded counts (`contributors`, `challenges`, `hours`). The `contributors` table has no institution reference. Stats are static — never updated when contributors join or log hours.

**What changes:**

Add `institution_id` FK on the `contributors` table. This is the anchor for everything else in v1.2 — the CM attention view, the aggregate stats computation, and the PDF report all depend on knowing which contributors belong to which institution.

**New DB column (manual migration script — NOT VALID pattern required):**

```sql
-- Step 1: Add column and constraint WITHOUT validating existing rows (no table scan lock)
ALTER TABLE contributors ADD COLUMN institution_id UUID;
ALTER TABLE contributors
  ADD CONSTRAINT contributors_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
  NOT VALID;

-- Step 2: Validate existing rows (uses SHARE UPDATE EXCLUSIVE lock — allows concurrent reads and writes)
ALTER TABLE contributors VALIDATE CONSTRAINT contributors_institution_id_fkey;

-- Step 3: Index for query performance
CREATE INDEX idx_contributors_institution_id ON contributors(institution_id);
```

- `ON DELETE SET NULL` — deleting an institution does not cascade to contributor records.
- Nullable — existing contributors have no institution assignment. CM assigns them.
- `NOT VALID` / `VALIDATE CONSTRAINT` two-step is critical: a single `ALTER TABLE` statement on a live `contributors` table performs a full table scan with a write-blocking lock. The two-step avoids this.
- Index is necessary: every CM query for contributors-by-institution hits this column.

**Stats computation change:**

Replace `stats_json` reads with live aggregate queries. The `institutions` route handler for `GET /:slug` currently returns `institution.statsJson`. This must be replaced with a JOIN-based aggregate at query time:

```sql
-- contributor count
SELECT COUNT(*) FROM contributors WHERE institution_id = $institutionId AND status = 'active';

-- challenges count (challenges where at least one institution contributor is a circle member)
SELECT COUNT(DISTINCT ch.id)
FROM challenges ch
JOIN circles ci ON ci.challenge_id = ch.id
JOIN circle_members cm ON cm.circle_id = ci.id
JOIN contributors c ON c.id = cm.contributor_id
WHERE c.institution_id = $institutionId;

-- hours count
SELECT COALESCE(SUM(ch.hours_logged), 0)
FROM contributor_hours ch
JOIN contributors c ON c.id = ch.contributor_id
WHERE c.institution_id = $institutionId;
```

These are cheap at pilot scale (tens of contributors per institution). The `stats_json` column must remain in the DB schema throughout v1.2 — do not remove it. Add live aggregation as a parallel code path, verify parity against known seed values, then cut over. Do not write-through update `stats_json` — it creates a maintenance burden for minimal gain at this scale.

**Modified files:**

| File | Change |
|------|--------|
| `packages/server/src/db/schema.ts` | Add `institutionId` column to `contributors` table |
| `packages/server/src/routes/institutions.ts` | Replace `statsJson` reads with live aggregates |
| `packages/server/scripts/add-contributor-institution-fk.mjs` | NEW — manual migration: NOT VALID FK + index |

**Unchanged:**

- All other routes. Contributors who log in, check wellbeing, join circles — none of those flows touch `institution_id`.
- The institution landing page React component (`InstitutionLanding.tsx`) already reads `stats` from the JSON response. As long as the API response shape stays `{ contributors, challenges, hours }`, the page needs no change.

---

### Feature 2: CM Institution Management Endpoints

**What the CM needs:**

The CM must be able to:
1. List all active institutions
2. List contributors assigned to a given institution
3. Assign a contributor to an institution (set `institution_id`)
4. Remove a contributor from an institution (set `institution_id = NULL`)
5. Create/edit institution name, description, city
6. Activate/deactivate an institution (controls kiosk landing page visibility)

**Auth pattern:**

All CM management routes use `authMiddleware` + `requireRole("community_manager")`. This is identical to the existing CM payments route pattern (`POST /api/payments/retainer`). No new middleware needed.

**New routes (extend `routes/institutions.ts`):**

```
GET  /api/institutions
     — list all institutions (CM view: includes inactive)
     — requires: community_manager role
     — response: { institutions: InstitutionSummary[] }

POST /api/institutions
     — create new institution
     — requires: community_manager role
     — body: { name, description, city }
     — auto-generates slug from name (immutable after creation)
     — response: 201 { institution }

PUT  /api/institutions/:slug
     — update institution name, description, city
     — requires: community_manager role
     — response: { institution }

PATCH /api/institutions/:slug/status
     — toggle isActive (activate/deactivate)
     — requires: community_manager role
     — body: { isActive: boolean }
     — response: { ok: true }

GET  /api/institutions/:slug/contributors
     — list contributors assigned to this institution
     — requires: community_manager role
     — response: { contributors: ContributorSummary[] }

PUT  /api/institutions/:slug/contributors/:contributorId
     — assign contributor to institution (idempotent)
     — requires: community_manager role
     — body: {} (assignment inferred from route)
     — response: 200 { ok: true }

DELETE /api/institutions/:slug/contributors/:contributorId
       — remove contributor from institution (sets institution_id = NULL)
       — requires: community_manager role
       — response: 200 { ok: true }
```

**Route boundary note:**

The existing `GET /api/institutions/:slug` is public (no auth). The new CM management routes must be positioned after `authMiddleware` + `requireRole`. The router file should be structured so public routes come first, guarded routes come after. The `requireRole` factory already handles the check.

**Modified files:**

| File | Change |
|------|--------|
| `packages/server/src/routes/institutions.ts` | Add CM management routes |
| `packages/shared/src/types/` | Add `InstitutionSummary`, `ContributorSummary` types if not already present |
| `packages/shared/src/schemas/` | Add Zod input schemas for route body validation |

---

### Feature 3: PDF Generation Endpoint

**Architecture decision: server-side generation, streamed PDF.**

The institution impact report must be a standalone document usable outside the browser — suitable for email attachment, printing, or inclusion in grant applications. It must be generated on demand, not stored.

**Recommended library: `pdfkit ^0.18.0`**

- Pure Node.js PDF generation. No headless browser, no Chrome binary.
- Ships an ESM entry point (`js/pdfkit.es.js`) — compatible with this ESM-first monorepo.
- Streams directly to Express response via `doc.pipe(res)` — no memory buffering.
- v0.18.0 published March 15, 2026. HIGH confidence.

`@react-pdf/renderer` was evaluated and rejected: active open ESM/`__dirname` breakage issues (#2624, #2907, #3017) confirmed open March 2026 in the ESM-first Node.js environment this project uses. Do not use it.

Puppeteer was rejected: 300MB Chromium binary, 2–5s cold start per render, unacceptable for a synchronous HTTP download.

**New route:**

```
GET /api/institutions/:slug/report.pdf
    — requires: community_manager role
    — generates PDF from live aggregate data
    — streams PDF bytes to response
    — Content-Type: application/pdf
    — Content-Disposition: attachment; filename="[slug]-impact-report-[date].pdf"
    — req.setTimeout(30_000) — guard against long renders on large datasets
```

**Data the report contains:**

Computed from the same live aggregates as the stats endpoint, plus:
- Institution name, city, description
- Contributor list with name, status, hours contributed in period
- Active challenges involving institution contributors
- Wellbeing score band (aggregate, only if >= 5 contributors have check-ins in period — omit with note if threshold not met; never individual scores)
- Date range query parameters (`from`, `to` — default: past 90 days)
- Report generation date

**Data flow:**

```
CM clicks "Download Report"
    ↓ GET /api/institutions/:slug/report.pdf (cookie auth, CM role)
Route handler:
    1. fetch institution record (verify exists + active)
    2. 4 parallel Drizzle queries:
       - contributor list with hours in period
       - challenge count via circle_members join
       - wellbeing aggregate (anonymised, min-5 threshold)
       - total hours in period
    3. const doc = new PDFDocument()
    4. res.setHeader("Content-Type", "application/pdf")
    5. res.setHeader("Content-Disposition", `attachment; filename="${slug}-report.pdf"`)
    6. doc.pipe(res)
    7. build report content imperatively (pdfkit API)
    8. doc.end()
Browser receives PDF bytes → download prompt or inline viewer
```

**New files:**

```
packages/server/src/
├── routes/institutions.ts       MODIFIED — add GET /:slug/report.pdf route
└── pdf/
    └── institution-report.ts   NEW — pdfkit document builder (server-only)
```

**Important:** The PDF builder lives in `packages/server/src/pdf/` and is a server-only concern. It must not be imported into the React web bundle. Using a dedicated folder makes this boundary explicit.

**Package to add to `packages/server/package.json`:**

```
pdfkit         ^0.18.0
@types/pdfkit  ^0.13.x     (TypeScript types — not bundled with pdfkit)
```

---

### Feature 4: Webhook Receiver Endpoint (IU receives from iThink)

**What this receives:**

iThink sends a signed HTTP POST after a screening that produces a cohort-level attention signal. The payload is institution-level aggregate data — **no individual contributor identifiers**. This is a hard privacy constraint, not a preference.

Payload contains:
- Institution identifier (slug or ID — must be agreed)
- Signal type (e.g. `"attention_flag"`, `"high_concern"`)
- Cohort size and flagged count (aggregate — never individual contributor IDs or emails)
- Timestamp of the screening
- A unique event ID for idempotency

**Architecture pattern: same as Stripe webhook.**

The existing Stripe webhook handler (`POST /api/payments/webhook`) demonstrates the correct pattern:

1. Raw body parsed before `express.json()` — required for HMAC signature verification
2. Signature verified using a shared secret (timingSafeEqual — not `===`)
3. Timestamp window check — reject if `|server_time - webhook_timestamp| > 300s` (replay protection)
4. Idempotency check — store event_id in `webhook_deliveries` table before processing
5. Payload validated with Zod — reject any payload containing per-contributor fields
6. Signal written to `institution_attention_signals` table
7. Returns 200 immediately — always 200 if signature is valid (prevents iThink retry storms)

Apply this same pattern to the iThink receiver.

**New route mount (express-app.ts):**

```typescript
// BEFORE express.json() — raw body required for HMAC verification
app.post(
  "/api/webhooks/ithink",
  express.raw({ type: "application/json" }),
  iThinkWebhookHandler,
);
```

**Signature verification:**

iThink signs payloads with HMAC-SHA256 using a shared secret. IU verifies using `crypto.timingSafeEqual` on the computed vs received HMAC. The shared secret is stored in `env.ts` as `ITHINK_WEBHOOK_SECRET`. `getEnv()` must throw at startup if this value is missing — no fallback.

```typescript
// Verification pattern (in webhook handler)
const signature = req.headers["x-ithink-signature"] as string;
const computed = createHmac("sha256", getEnv().ITHINK_WEBHOOK_SECRET)
  .update(req.body as Buffer)
  .digest("hex");
const sigBuf = Buffer.from(signature.replace("sha256=", ""), "hex");
const compBuf = Buffer.from(computed, "hex");
if (sigBuf.length !== compBuf.length || !timingSafeEqual(sigBuf, compBuf)) {
  res.status(401).json({ error: "Invalid signature" });
  return;
}
```

**New DB tables:**

```sql
-- Idempotency dedup table
CREATE TABLE webhook_deliveries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      VARCHAR(50) NOT NULL,         -- 'ithink'
  event_id    VARCHAR(255) NOT NULL,         -- from payload
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, event_id)
);

-- Institution-level attention signals (cohort aggregate — no per-contributor data)
CREATE TABLE institution_attention_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  delivery_id  UUID NOT NULL REFERENCES webhook_deliveries(id),
  signal_type  VARCHAR(100) NOT NULL,        -- e.g. "attention_flag", "high_concern"
  cohort_size  INTEGER NOT NULL,             -- total contributors in cohort at time of screening
  flagged_count INTEGER NOT NULL,            -- count of cohort members flagged
  raw_payload  JSONB NOT NULL,               -- full webhook payload for audit
  screened_at  TIMESTAMPTZ NOT NULL,         -- timestamp from iThink payload
  received_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attention_signals_institution ON institution_attention_signals(institution_id);
CREATE INDEX idx_attention_signals_received ON institution_attention_signals(institution_id, received_at DESC);
```

**No per-contributor FK.** The `institution_attention_signals` table intentionally has no `contributor_id` column. iThink sends cohort aggregates. Adding a `contributor_id` to this table would require iThink to send individual identifiers — a design decision that violates the privacy-first contract.

**Contributor matching not required:** Unlike the earlier design iteration (which proposed matching by email), the final payload design is cohort-level only. The receiver resolves the institution by slug (`institutions.slug`), not a contributor.

**New files:**

```
packages/server/src/
├── routes/webhooks.ts                    NEW — iThink webhook handler
├── db/schema.ts                          MODIFIED — webhook_deliveries + institution_attention_signals tables
├── config/env.ts                         MODIFIED — add ITHINK_WEBHOOK_SECRET (no fallback)
└── express-app.ts                        MODIFIED — mount webhook route before express.json()
packages/server/scripts/
└── add-webhook-tables.mjs                NEW — manual migration script
```

---

### Feature 5: Webhook Dispatch from iThink (iThink-side changes)

**What iThink must add:**

iThink currently has no outbound webhook capability. It needs to:
1. Store a webhook endpoint URL and shared secret per institution (configurable by CM)
2. After a screening that produces a flagged cohort result, send a signed POST to the configured URL
3. Handle failures gracefully (log failures, never block the primary screening operation)

**iThink architecture context:**

- React Native app + Express API
- Session-based auth
- SQLite local DB

**HMAC signing in iThink (React Native):**

The iThink app runs React Native. Node.js built-in `crypto` is not available. `expo-crypto` does not expose `createHmac`. The correct library is `react-native-quick-crypto ^1.0.17` (Margelo's JSI-based `node:crypto` drop-in). Requires bare Expo workflow (`expo prebuild`) — does not work in Expo Go.

**New iThink DB table (SQLite):**

```sql
CREATE TABLE IF NOT EXISTS webhook_configs (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_identifier TEXT NOT NULL,  -- matches IU institution slug
  endpoint_url          TEXT NOT NULL,
  secret                TEXT NOT NULL,   -- shared secret for HMAC signing
  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**New iThink API routes (CM configures):**

```
POST /api/webhooks/config
     — create/update webhook config for an institution
     — requires: session auth, CM role
     — body: { institutionIdentifier, endpointUrl, secret }

GET  /api/webhooks/config
     — list webhook configs
     — requires: session auth, CM role
```

**Webhook dispatch function (called from screening completion handler):**

```typescript
async function dispatchWebhook(
  config: WebhookConfig,
  payload: WebhookPayload,
): Promise<void> {
  const body = JSON.stringify(payload);
  const sig = "sha256=" + createHmac("sha256", config.secret).update(body).digest("hex");

  try {
    const response = await fetch(config.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-iThink-Signature": sig,
      },
      body,
    });

    if (!response.ok) {
      console.error(`[webhook] Dispatch failed: ${response.status}`);
    }
  } catch (err) {
    // Fire-and-forget — screening must not fail if webhook is unreachable
    console.error("[webhook] Dispatch error:", err);
  }
}
```

**Payload shape (agreed contract between iThink and IU):**

```typescript
interface IThinkWebhookPayload {
  event_id: string;              // UUID — used by IU for idempotency dedup
  event: "attention_flag";
  institution_slug: string;      // matches IU institution slug
  signal_type: string;           // e.g. "high_concern", "needs_checkin"
  cohort_size: number;           // total contributors screened
  flagged_count: number;         // count flagged (no individual IDs)
  screened_at: string;           // ISO 8601 — used by IU for timestamp window check
}
```

No `contributorEmail`, no `contributorId`. The payload contract explicitly excludes per-contributor identifiers. Any deviation in the iThink implementation causes the IU Zod schema to reject the webhook.

**Key constraint:** The webhook dispatch must be fire-and-forget from the screening handler's perspective. A network failure sending a webhook must never cause the screening to fail or the iThink API to return an error to the React Native client.

**iThink files touched:**

```
iThink/
├── src/db/schema.sql (or migrations/)
│   └── add webhook_configs table
├── src/routes/
│   └── webhooks.ts         NEW — config CRUD endpoints
└── src/services/
    └── webhook.service.ts  NEW — dispatchWebhook() + HMAC signing
```

The screening completion handler (wherever it lives in iThink's route layer) calls `dispatchWebhook()` after persisting the screening result, outside any transaction, wrapped in try-catch that only logs on failure.

---

### Feature 6: CM Attention Dashboard (React page)

**What it shows:**

A list of institution cohort attention signals from iThink, most recent first. Each row shows:
- Institution name
- Signal type (human-readable label, not raw code)
- Cohort summary: "X of Y flagged" (`flagged_count / cohort_size`)
- When received (relative time: "3 days ago")
- Trend: last 30 days of signals for the filtered institution as a simple list or mini-chart

**Privacy guarantee:** No contributor names, no individual identifiers, no per-person data anywhere in this view. The attention view shows institution cohort health, not individual contributor status.

**Institution scope enforcement:**

The CM's institution is resolved from the database on every request — not from the JWT. The CM's `contributor.id` from the JWT is used to look up `contributors.institution_id` in the DB. All queries filter by that institution ID. This prevents cross-institution data leakage if a JWT is replayed or if the CM role is ever shared.

**New API routes (on IU server):**

```
GET  /api/attention
     — list attention signals for the CM's institution
     — requires: community_manager role
     — CM institution resolved from DB (contributors.institution_id), never from JWT
     — query params: none required (institution is inferred from CM identity)
     — response: { signals: AttentionSignal[], institutionName: string }

GET  /api/attention/stats
     — badge count: number of signals received in last 30 days for the CM's institution
     — requires: community_manager role
     — response: { count: number }
```

Note: signals are read-only from IU's perspective. There is no "resolve" action — iThink signals are informational. The CM acts out-of-band (contacts the institution, follows up with contributors). If a "dismiss" UX is wanted later, add it in v1.3 with a `dismissed_at` column.

**New route file:**

```
packages/server/src/routes/attention.ts    NEW
```

Mounted in `express-app.ts` as `app.use("/api/attention", attentionRoutes)`.

**New React page:**

```
packages/web/src/pages/attention/
└── AttentionDashboard.tsx    NEW
```

Mounted in `App.tsx` as a protected route, restricted to `community_manager` role:

```typescript
<Route path="/attention" element={<AttentionDashboard />} />
```

**New API client and hook files:**

```
packages/web/src/api/attention.ts       NEW — typed fetch wrappers
packages/web/src/hooks/useAttention.ts  NEW — TanStack Query hooks
```

**Data flow:**

```
CM opens /attention (protected route, community_manager only)
    ↓ GET /api/attention (cookie auth, CM role)
Server:
  1. resolve CM's institution: SELECT institution_id FROM contributors WHERE id = $cmId
  2. if no institution assigned: 200 { signals: [], institutionName: null }
  3. SELECT s.*, i.name AS institution_name
     FROM institution_attention_signals s
     JOIN institutions i ON i.id = s.institution_id
     WHERE s.institution_id = $cmInstitutionId
     ORDER BY s.received_at DESC
     LIMIT 30
    ↓
AttentionDashboard renders signal list
```

---

## New Tables Summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `webhook_deliveries` | Idempotency dedup for incoming iThink webhooks | `source`, `event_id` (UNIQUE constraint on pair) |
| `institution_attention_signals` | Stores incoming iThink cohort-level signals | `institution_id`, `signal_type`, `cohort_size`, `flagged_count`, `screened_at`, `raw_payload` |
| `webhook_configs` (iThink/SQLite) | Stores iThink outbound webhook targets per institution | `institution_identifier`, `endpoint_url`, `secret`, `is_active` |

---

## New Columns Summary

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `contributors` | `institution_id` | `UUID REFERENCES institutions(id) ON DELETE SET NULL` | Assigns contributor to an institution (nullable, NOT VALID migration) |

---

## New Routes Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/institutions` | CM | List all institutions (CM management view) |
| `POST` | `/api/institutions` | CM | Create institution |
| `PUT` | `/api/institutions/:slug` | CM | Edit institution |
| `PATCH` | `/api/institutions/:slug/status` | CM | Toggle active/inactive |
| `GET` | `/api/institutions/:slug/contributors` | CM | List contributors assigned to institution |
| `PUT` | `/api/institutions/:slug/contributors/:id` | CM | Assign contributor to institution |
| `DELETE` | `/api/institutions/:slug/contributors/:id` | CM | Remove contributor from institution |
| `GET` | `/api/institutions/:slug/report.pdf` | CM | Download PDF impact report |
| `POST` | `/api/webhooks/ithink` | HMAC signature | Receive signed cohort signal from iThink |
| `GET` | `/api/attention` | CM | List institution attention signals (DB-scoped to CM's institution) |
| `GET` | `/api/attention/stats` | CM | Badge count of signals in last 30 days |

All CM routes use `authMiddleware` + `requireRole("community_manager")`.
The webhook route uses HMAC signature verification, not JWT auth.
The attention routes resolve institution from DB, never from JWT.

---

## Recommended Project Structure Changes for v1.2

```
packages/
├── server/src/
│   ├── routes/
│   │   ├── institutions.ts     MODIFIED — CM CRUD + PDF route + live stats; public slug read unchanged
│   │   ├── webhooks.ts         NEW — iThink webhook receiver
│   │   └── attention.ts        NEW — CM attention view endpoints
│   ├── db/
│   │   └── schema.ts           MODIFIED — institution_id FK on contributors; webhook_deliveries + institution_attention_signals tables
│   ├── pdf/
│   │   └── institution-report.ts   NEW — pdfkit document builder (server-only; never imported by web)
│   ├── config/
│   │   └── env.ts              MODIFIED — add ITHINK_WEBHOOK_SECRET (no fallback, server fails to start without it)
│   └── express-app.ts          MODIFIED — mount webhooks route (before express.json()); mount attention routes
│
├── server/scripts/
│   ├── add-contributor-institution-fk.mjs     NEW — NOT VALID migration: FK column + index
│   └── add-webhook-tables.mjs                 NEW — migration: webhook_deliveries + institution_attention_signals
│
└── web/src/
    ├── pages/attention/
    │   └── AttentionDashboard.tsx    NEW — cohort-level signal view; no per-contributor data
    ├── api/
    │   └── attention.ts              NEW — typed fetch wrappers
    ├── hooks/
    │   └── useAttention.ts           NEW — TanStack Query hooks
    └── App.tsx                       MODIFIED — add /attention route
```

**iThink (separate repo):**

```
iThink/
├── src/db/
│   └── [migration] webhook_configs table
├── src/routes/
│   └── webhooks.ts         NEW — CM config endpoints
└── src/services/
    └── webhook.service.ts  NEW — dispatchWebhook() + HMAC signing (react-native-quick-crypto)
```

---

## Architectural Patterns

### Pattern 1: Raw Body Before JSON Parser (Webhook Verification)

**What:** Stripe webhook handler already demonstrates this. iThink webhook follows the same pattern.

**When to use:** Any endpoint that must verify an HMAC signature over the raw request body. `express.json()` replaces `req.body` with a parsed object — the raw bytes needed for signature verification are gone.

**Implementation:**

```typescript
// express-app.ts — webhook routes BEFORE express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeHandler);
app.post("/api/webhooks/ithink", express.raw({ type: "application/json" }), iThinkHandler);

// JSON parsing — comes after webhook mounts
app.use(express.json());
```

### Pattern 2: Live Aggregate Stats (Replace Static JSONB)

**What:** Replace `stats_json` reads in the institutions route with JOIN-based aggregate queries at request time.

**When to use:** When data is too dynamic to cache safely at this scale, and query cost is negligible (single-institution aggregates over tens of contributors).

**Trade-off:** At >1000 contributors per institution, materialise the stats with a periodic job. At pilot scale, live queries are simpler and always correct. The `stats_json` column stays in the schema — do not remove it, as it allows an easy fallback and a later caching mechanism if needed.

### Pattern 3: Server-Side PDF Streaming (pdfkit)

**What:** pdfkit builds a PDF document imperatively in Node.js and pipes the stream directly to the Express response. No buffering.

**When to use:** On-demand document generation that must be printable and distributable without requiring a browser session.

**Example:**

```typescript
import PDFDocument from "pdfkit";
import { buildReportData } from "../pdf/institution-report.js";

router.get("/:slug/report.pdf", authMiddleware, requireRole("community_manager"), async (req, res) => {
  req.setTimeout(30_000);
  const data = await buildReportData(req.params.slug, req.query);
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.slug}-report.pdf"`);
  doc.pipe(res);
  // ... build report content imperatively
  doc.end();
});
```

### Pattern 4: Webhook Idempotency via Dedup Table

**What:** Before processing any webhook payload, INSERT into `webhook_deliveries` with a UNIQUE constraint on `(source, event_id)`. Catch PG unique violation (error code `23505`) — if it fires, the event has already been processed; return 200 and skip.

**When to use:** Any inbound webhook where replays must not create duplicate records.

```typescript
try {
  await db.insert(webhookDeliveries).values({ source: "ithink", eventId: payload.event_id });
} catch (err: any) {
  if (err?.code === "23505") {
    res.json({ received: true }); // already processed
    return;
  }
  throw err;
}
// safe to process now — dedup guaranteed
```

### Pattern 5: DB-Resolved Institution Scope (Attention Routes)

**What:** Resolve the CM's institution from `contributors.institution_id` in the DB on every request. Do not trust institution IDs from JWT claims or request params for data access decisions.

**Why:** If a JWT is replayed or a CM is reassigned, the JWT claim becomes stale. DB resolution is always authoritative.

```typescript
const [cm] = await db
  .select({ institutionId: contributors.institutionId })
  .from(contributors)
  .where(eq(contributors.id, req.contributor!.id))
  .limit(1);

if (!cm?.institutionId) {
  res.json({ signals: [], institutionName: null });
  return;
}
// use cm.institutionId for all subsequent queries
```

### Pattern 6: Fire-and-Forget Webhook Dispatch (iThink side)

**What:** Dispatch is wrapped in try-catch. Failures are logged but never propagate. The screening result is persisted regardless of webhook outcome.

**When to use:** Any outbound integration where the primary action (screening persistence) must not be blocked by a network call to an external system.

---

## Data Flow Diagrams

### Flow 1: CM Assigns Contributor to Institution

```
CM selects contributor, chooses institution
    ↓ PUT /api/institutions/brixton-library/contributors/:contributorId
authMiddleware → requireRole("community_manager")
    ↓
UPDATE contributors SET institution_id = $institutionId WHERE id = $contributorId
    ↓
200 { ok: true }
    ↓ useMutation onSuccess: invalidateQueries(["institution", slug, "contributors"])
Contributor list refetches — contributor now appears under institution
```

### Flow 2: Institution Landing Page with Live Stats

```
Browser visits /i/brixton-library (public, no auth)
    ↓ GET /api/institutions/brixton-library
Route handler:
  1. fetch institution record by slug (WHERE is_active = true)
  2. COUNT(contributors WHERE institution_id = institution.id AND status = 'active')
  3. COUNT(DISTINCT challenges via circles/circle_members JOIN)
  4. SUM(contributor_hours WHERE contributor institution_id = institution.id)
    ↓
{ id, name, slug, description, city, stats: { contributors, challenges, hours } }
InstitutionLanding renders stats — no React component change needed (same response shape)
```

### Flow 3: iThink Screening → IU Attention Signal

```
iThink user completes a screening (cohort result: X of Y flagged)
    ↓ Screening result persisted in iThink SQLite DB
iThink screening handler calls dispatchWebhook(config, payload)
    ↓ POST https://iu.example.com/api/webhooks/ithink
    ↓ X-iThink-Signature: sha256=<hmac>
    ↓ Body: { event_id, event, institution_slug, signal_type, cohort_size, flagged_count, screened_at }

IU webhook handler:
  1. verify HMAC (timingSafeEqual, not ===)
  2. check timestamp window (|now - screened_at| <= 300s)
  3. parse payload from raw Buffer via JSON.parse
  4. validate with Zod (reject any payload containing per-contributor fields)
  5. lookup institution by slug
  6. INSERT webhook_deliveries (dedup) — catch 23505 and return 200 if duplicate
  7. INSERT institution_attention_signals (institution_id, signal_type, cohort_size, flagged_count, raw_payload, screened_at)
  8. res.status(200).json({ received: true })  ← always 200 if signature + timestamp valid
```

### Flow 4: CM Attention Dashboard

```
CM opens /attention (protected route, community_manager only)
    ↓ GET /api/attention (cookie auth, CM role)
Server:
  1. resolve CM's institution from DB: SELECT institution_id FROM contributors WHERE id = $cmId
  2. if no institution: return { signals: [], institutionName: null }
  3. SELECT s.*, i.name FROM institution_attention_signals s
     JOIN institutions i ON i.id = s.institution_id
     WHERE s.institution_id = $cmInstitutionId
     ORDER BY s.received_at DESC LIMIT 30
    ↓
AttentionDashboard renders signal list (cohort aggregates — no contributor names)
```

### Flow 5: CM Downloads PDF Impact Report

```
CM clicks "Download Report" for Brixton Library
    ↓ GET /api/institutions/brixton-library/report.pdf (cookie auth, CM role)
Route handler:
  1. req.setTimeout(30_000)
  2. fetch institution record (verify exists + active, guard empty state)
  3. 4 parallel Drizzle queries (contributor list, hours, challenges, wellbeing aggregate with min-5 threshold)
  4. const doc = new PDFDocument()
  5. res.setHeader("Content-Type", "application/pdf")
  6. res.setHeader("Content-Disposition", "attachment; filename=...")
  7. doc.pipe(res)
  8. build report content via pdfkit API (no buffering)
  9. doc.end()
Browser receives PDF bytes → download prompt or inline viewer
```

---

## Integration Points — New vs Modified vs Unchanged

### IU Server

| File | Status | Reason |
|------|--------|--------|
| `routes/institutions.ts` | MODIFIED | Add CM CRUD routes, contributor assignment routes, PDF route; replace stats_json with live aggregates |
| `routes/webhooks.ts` | NEW | iThink cohort-level webhook receiver |
| `routes/attention.ts` | NEW | CM attention view endpoints (DB-scoped) |
| `pdf/institution-report.ts` | NEW | pdfkit document builder (server-only) |
| `db/schema.ts` | MODIFIED | `institution_id` FK on contributors; `webhook_deliveries`; `institution_attention_signals` |
| `config/env.ts` | MODIFIED | Add `ITHINK_WEBHOOK_SECRET` (no fallback — server fails to start without it) |
| `express-app.ts` | MODIFIED | Mount webhook route (before express.json()); mount attention routes |
| `scripts/add-contributor-institution-fk.mjs` | NEW | Manual migration: NOT VALID FK column + index |
| `scripts/add-webhook-tables.mjs` | NEW | Manual migration: webhook_deliveries + institution_attention_signals |

### IU Web

| File | Status | Reason |
|------|--------|--------|
| `pages/attention/AttentionDashboard.tsx` | NEW | CM cohort signal view (no per-contributor data) |
| `api/attention.ts` | NEW | Typed fetch wrappers for attention endpoints |
| `hooks/useAttention.ts` | NEW | TanStack Query hooks |
| `App.tsx` | MODIFIED | Add `/attention` route (protected, CM only) |

### Unchanged IU Components

All of the following are untouched by v1.2:
- All existing route files except `routes/institutions.ts` (only additive changes there)
- All service files (`auth.service.ts`, `stripe.service.ts`, etc.)
- All MCP tools
- Middleware files (`auth.ts`, `api-key-auth.ts`) — no changes needed
- All contributor-facing web pages (wellbeing, circles, challenges, onboarding, dashboard)
- Institution landing page React component (`InstitutionLanding.tsx`) — API response shape unchanged
- Challenger portal (all files)
- VANTAGE routes

### iThink (separate repo)

| File | Status | Reason |
|------|--------|--------|
| `src/db/` migration | NEW | `webhook_configs` table |
| `src/routes/webhooks.ts` | NEW | CM config CRUD endpoints |
| `src/services/webhook.service.ts` | NEW | `dispatchWebhook()` + HMAC signing via react-native-quick-crypto |
| Screening completion handler | MODIFIED | Call `dispatchWebhook()` after persisting result (outside transaction, fire-and-forget) |

---

## Recommended Build Order

Dependencies determine the safe sequence. DB schema must exist before routes use it. IU receiver must exist before iThink dispatch is tested end-to-end.

**Step 1 — DB migrations (IU)**

1. `add-contributor-institution-fk.mjs` — adds `institution_id` to `contributors` (NOT VALID + VALIDATE + index)
2. Update `db/schema.ts` to reflect the new column
3. `add-webhook-tables.mjs` — adds `webhook_deliveries` and `institution_attention_signals`
4. Update `db/schema.ts` for the new tables

Rationale: all subsequent steps depend on the schema. Run migrations before writing any route code that references the new columns.

**Step 2 — Institution stats live aggregates (IU server)**

Modify the existing `GET /api/institutions/:slug` handler to compute stats from live queries instead of `statsJson`. This is a self-contained change to an existing file with a clear contract. Ship it before adding the CM management routes, so the public landing page stays correct throughout the build.

**Step 3 — CM institution management routes (IU server + web)**

1. Add CM CRUD routes to `routes/institutions.ts` (list, create, edit, status toggle)
2. Add contributor assignment/removal routes to `routes/institutions.ts`
3. Add typed API client and TanStack Query hooks for institution management UI
4. Add CM institution management page to web

This gives the CM the ability to assign contributors to institutions before the PDF or webhook features are complete.

**Step 4 — Webhook receiver (IU server)**

1. Add `ITHINK_WEBHOOK_SECRET` to `config/env.ts` (no fallback)
2. Create `routes/webhooks.ts` with the iThink receiver handler (full security stack: raw body, timingSafeEqual, timestamp window, idempotency, Zod, institution lookup)
3. Mount in `express-app.ts` before `express.json()`

This can be tested independently by sending a signed POST from curl before iThink is modified.

**Step 5 — Webhook dispatch (iThink)**

1. Add `webhook_configs` table to iThink SQLite
2. Add CM config routes in iThink
3. Add `webhook.service.ts` with `dispatchWebhook()` (react-native-quick-crypto)
4. Modify the screening completion handler to call it (fire-and-forget, outside transaction)

**Step 6 — CM attention view (IU server + web)**

1. Create `routes/attention.ts` (DB-resolved institution scope on every request)
2. Mount in `express-app.ts`
3. Create `pages/attention/AttentionDashboard.tsx`, `api/attention.ts`, `hooks/useAttention.ts`
4. Add route to `App.tsx`

This is after webhook receiver because it consumes signals that only exist once both webhook sides are built and tested end-to-end.

**Step 7 — PDF report (IU server)**

1. Add `pdfkit ^0.18.0` and `@types/pdfkit` to `packages/server/package.json`
2. Create `pdf/institution-report.ts` (pdfkit builder, server-only)
3. Add `GET /:slug/report.pdf` route to `routes/institutions.ts`
4. Add "Download Report" button to CM institution management page in web

PDF is self-contained and the last CM feature. It depends on the institution management data (Step 3) but not on webhooks or the attention view.

---

## Anti-Patterns

### Anti-Pattern 1: Storing PDF Files in S3 on Generation

**What people do:** Generate the PDF once, store it in S3, return a download URL.

**Why it's wrong:** The report must reflect current data. Cached PDFs go stale the moment a contributor is added, an hour is logged, or a new signal arrives. For the CM at pilot scale (one institution per session), on-demand generation is negligible cost.

**Do this instead:** Generate on request, stream to response via `doc.pipe(res)`, no storage. If S3 is needed later (e.g., email attachment), generate at send time.

### Anti-Pattern 2: Putting PDF Builder in Shared or Web Package

**What people do:** Put the pdfkit document builder in `packages/shared` or `packages/web/src/`.

**Why it's wrong:** pdfkit is a server-only concern. It references Node.js streams. Importing it into the web bundle causes build failures. The `packages/server/src/pdf/` folder makes the server-only boundary explicit.

**Do this instead:** Isolate in `packages/server/src/pdf/`. Never import it from `packages/web` or `packages/shared`.

### Anti-Pattern 3: Blocking Screening on Webhook Dispatch (iThink)

**What people do:** `await dispatchWebhook(...)` in the screening handler without a try-catch, or inside the screening database transaction.

**Why it's wrong:** If IU is unavailable, the screening fails. A network error in an outbound call corrupts the primary operation.

**Do this instead:** Fire and forget. Persist the screening first, outside any transaction. Call `dispatchWebhook` after, with a top-level try-catch that logs on failure but does not rethrow.

### Anti-Pattern 4: Using JSON Body Parser for Webhook Routes

**What people do:** Forget to add the raw body parser before `express.json()` for webhook endpoints.

**Why it's wrong:** The HMAC signature is computed over the raw bytes. Once `express.json()` parses the body, the raw bytes are gone — signature verification always fails with no obvious error.

**Do this instead:** Mount webhook routes with `express.raw({ type: "application/json" })` before `app.use(express.json())` in `express-app.ts`. This is already done for the Stripe webhook — follow the same pattern exactly.

### Anti-Pattern 5: Using `===` for HMAC Signature Comparison

**What people do:** Compare `computedSig === receivedSig` as strings.

**Why it's wrong:** String equality short-circuits on first mismatch — this is a timing side-channel that allows incremental signature reconstruction over many requests.

**Do this instead:** `crypto.timingSafeEqual(Buffer.from(computedSig, "hex"), Buffer.from(receivedSig, "hex"))`. This pattern is already in `api-key-auth.ts` — copy it exactly.

### Anti-Pattern 6: Per-Contributor Data in iThink Webhook Payload or CM View

**What people do:** Add a `contributorEmail` or `contributorId` field to the webhook payload so the CM can see exactly which contributors were flagged.

**Why it's wrong:** iThink is a privacy-first local-processing tool. Exfiltrating individual contributor identifiers over a webhook exposes GDPR special-category data (health/wellbeing signals). It destroys contributor trust and creates a breach liability. The CM view then becomes per-contributor surveillance, not cohort health monitoring.

**Do this instead:** The webhook carries only `cohort_size` and `flagged_count`. The CM sees "6 of 18 flagged at Brixton Library" — actionable at the institution level. Individual intervention happens through normal CM-contributor relationship, not through the attention dashboard.

### Anti-Pattern 7: Resolving CM Institution from JWT Claims

**What people do:** Include the CM's `institutionId` in the JWT payload and use it directly to filter attention queries.

**Why it's wrong:** JWTs are long-lived. If the CM is reassigned to a different institution, or if the JWT is replayed from a previous session, the claim is stale. Cross-institution leakage is a GDPR data breach — high-cost to remediate.

**Do this instead:** Resolve `contributors.institution_id` from the DB on every attention request using the CM's `contributor.id` from the verified JWT. DB state is always authoritative.

### Anti-Pattern 8: Returning Non-200 for Webhook Payload Processing Failures

**What people do:** Return 422/404 when the institution slug in the webhook payload is not found in IU, or when the timestamp is slightly outside the window.

**Why it's wrong:** iThink will retry on non-200 responses. If IU is briefly inconsistent (e.g., institution not yet created), the retry storm fills logs and creates duplicate events once the issue resolves.

**Do this instead:** Return 200 for all signature-valid requests that fail for business logic reasons (unknown institution, outside timestamp window). Log the failure with the raw payload for investigation. Return 401 only for signature failure (the one case where iThink should never retry without fixing its signing code).

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k contributors (pilot) | Live aggregate queries — no caching needed; pdfkit synchronous streaming acceptable; single-process webhook handling |
| 1k-10k contributors | Materialise institution stats via periodic job (update `stats_json` every N minutes); add pagination to attention dashboard |
| 10k+ contributors | Extract webhook receiver to a separate process with a queue; attention signals processing becomes async; PDF generation moves to a job queue with S3 delivery |

---

## Sources

- Direct codebase inspection: `packages/server/src/` (all route files, middleware, db/schema.ts, config/env.ts, express-app.ts, scripts/)
- Direct codebase inspection: `packages/web/src/` (App.tsx, all page directories, hooks/, api/)
- Existing webhook pattern: `routes/payments.ts` + `express-app.ts` (Stripe raw body mount)
- Existing API key pattern: `middleware/api-key-auth.ts` + `routes/vantage.ts` (timingSafeEqual)
- [foliojs/pdfkit releases](https://github.com/foliojs/pdfkit/releases) — v0.18.0 published March 15, 2026; ESM entry point confirmed (HIGH confidence)
- [margelo/react-native-quick-crypto](https://github.com/margelo/react-native-quick-crypto) — v1.0.17; `createHmac` + `Hmac.digest()` confirmed in implementation coverage doc (HIGH confidence)
- [PostgreSQL ALTER TABLE docs](https://www.postgresql.org/docs/current/sql-altertable.html) — NOT VALID / VALIDATE CONSTRAINT pattern (HIGH confidence)
- [standard-webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) — HMAC-SHA256 + timestamp replay prevention (MEDIUM confidence)
- [GitHub: Validating Webhook Deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) — timingSafeEqual pattern (HIGH confidence)
- [Hookdeck: Webhook Idempotency](https://hookdeck.com/docs/guides/deduplication-guide) — dedup table pattern (MEDIUM confidence)
- react-pdf rejection: issues #2624, #2907, #3017 confirmed open March 2026 (HIGH confidence)
- iThink architecture: described from project context; not directly inspectable (MEDIUM confidence on exact file paths)

---

*Architecture research for: Indomitable Unity v1.2 Institution Management & iThink Integration*
*Researched: 2026-03-21 (updated with pdfkit decision and cohort-level signal model)*
