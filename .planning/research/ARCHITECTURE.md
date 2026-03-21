# Architecture Research

**Domain:** Social enterprise platform — v1.2 Institution Management & iThink Integration
**Researched:** 2026-03-21
**Confidence:** HIGH (based on direct codebase inspection of v1.1 codebase)

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
│  20 tables — contributors, contributor_profiles, cv_parse_jobs,   │
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

**New DB column (manual migration script):**

```sql
ALTER TABLE contributors ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL;
CREATE INDEX idx_contributors_institution_id ON contributors(institution_id);
```

- `ON DELETE SET NULL` — deleting an institution does not cascade to contributor records.
- Nullable — existing contributors have no institution assignment. CM assigns them.
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

These are cheap at pilot scale (tens of contributors per institution). The `stats_json` column can remain in the DB schema and be kept in sync as a denormalized cache later if needed, but for v1.2 it should be computed live and `stats_json` left as dead storage. Do not add a write-through update trigger — it creates a maintenance burden for minimal gain at this scale.

**Modified files:**

| File | Change |
|------|--------|
| `packages/server/src/db/schema.ts` | Add `institutionId` column to `contributors` table |
| `packages/server/src/routes/institutions.ts` | Replace `statsJson` reads with live aggregates |
| `packages/server/scripts/` | New migration script: `add-contributor-institution-fk.mjs` |

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

**Auth pattern:**

All CM management routes use `authMiddleware` + `requireRole("community_manager")`. This is identical to the existing CM payments route pattern (`POST /api/payments/retainer`). No new middleware needed.

**New routes (extend `routes/institutions.ts`):**

```
GET  /api/institutions
     — list all active institutions (id, name, slug, city)
     — requires: community_manager role
     — response: { institutions: InstitutionSummary[] }

GET  /api/institutions/:slug/contributors
     — list contributors assigned to this institution
     — requires: community_manager role
     — response: { contributors: ContributorSummary[] }

PUT  /api/institutions/:slug/contributors/:contributorId
     — assign contributor to institution (idempotent)
     — requires: community_manager role
     — body: {} (no body needed — assignment inferred from route)
     — response: 200 { ok: true }

DELETE /api/institutions/:slug/contributors/:contributorId
       — remove contributor from institution
       — requires: community_manager role
       — response: 200 { ok: true }
```

**Route boundary note:**

The existing `GET /api/institutions/:slug` is public (no auth). The new CM management routes must be positioned after `authMiddleware` + `requireRole`. The router file should be structured so public routes come first, guarded routes come after — or two separate router instances are used (public and cm-guarded).

Recommended: single router file, with the two unguarded routes (public slug lookup + root listing for CM) gated explicitly, and all write routes explicitly guarded. The `requireRole` factory already handles the check.

**Modified files:**

| File | Change |
|------|--------|
| `packages/server/src/routes/institutions.ts` | Add 4 CM management routes |
| `packages/shared/src/types/` | Add `InstitutionSummary`, `ContributorSummary` types if not already present |
| `packages/shared/src/schemas/` | Add Zod input schemas for route params validation |

---

### Feature 3: PDF Generation Endpoint

**Architecture decision: server-side rendering, streamed PDF.**

The institution impact report must be a standalone document usable outside the browser — suitable for email attachment, printing, or inclusion in grant applications. It must be generated on demand, not stored.

**Recommended library: `@react-pdf/renderer`**

- Renders a React component tree to PDF in a Node.js process.
- No headless browser required (no Puppeteer overhead, no Chrome binary to manage in deployment).
- Produces deterministic, printable output.
- HIGH confidence: widely used for exactly this pattern in Node.js APIs.

**New route:**

```
GET /api/institutions/:slug/report.pdf
    — requires: community_manager role
    — generates PDF from live aggregate data
    — streams PDF bytes to response
    — Content-Type: application/pdf
    — Content-Disposition: attachment; filename="[slug]-impact-report-[date].pdf"
```

**Data the report contains:**

Computed from the same live aggregates as the stats endpoint, plus:
- Institution name, city, description
- Contributor list with name, status, hours contributed
- Active challenges involving institution contributors
- Wellbeing summary (aggregate scores — never individual contributor data)
- Report generation date

**Data flow:**

```
CM clicks "Download Report"
    ↓ GET /api/institutions/:slug/report.pdf (cookie auth, CM role)
Route handler:
    1. fetch institution record (verify exists + active)
    2. aggregate contributor list + hours + challenge data (3-4 Drizzle queries)
    3. pass data to ImpactReportDocument React component
    4. renderToStream(ImpactReportDocument) → Node.js Readable
    5. pipe(res) with Content-Type: application/pdf
Browser receives PDF bytes → browser PDF viewer or download prompt
```

**New files:**

```
packages/server/src/
├── routes/institutions.ts       MODIFIED — add GET /:slug/report.pdf route
└── pdf/
    └── institution-report.tsx  NEW — @react-pdf/renderer React component
```

**Important:** `@react-pdf/renderer` uses a custom renderer, not the DOM renderer. The component file lives in `packages/server/src/pdf/` and is a server-only concern. It must not be imported into the React web bundle. Using a dedicated folder makes this boundary explicit.

**Package to add to `packages/server/package.json`:**

```
@react-pdf/renderer  ^4.x
```

Confirm exact version at install time — the library follows semver and v4.x is the current major as of mid-2025.

---

### Feature 4: Webhook Receiver Endpoint (IU receives from iThink)

**What this receives:**

iThink sends a signed HTTP POST when a screening flags a contributor as needing attention. The payload contains:
- External contributor identifier (email or a shared ID — must be agreed)
- Institution identifier (slug or ID — must be agreed)
- Signal type (e.g. `"attention_flag"`)
- Timestamp of the screening

**Architecture pattern: same as Stripe webhook.**

The existing Stripe webhook handler (`POST /api/payments/webhook`) demonstrates the correct pattern:

1. Raw body parsed before `express.json()` — required for HMAC signature verification
2. Signature verified using a shared secret
3. Payload parsed and stored
4. Returns 200 immediately — no blocking operations in the handler

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

iThink signs payloads with HMAC-SHA256 using a shared secret. IU verifies using `crypto.timingSafeEqual` on the computed vs received HMAC. The shared secret is stored in `env.ts` as `ITHINK_WEBHOOK_SECRET`.

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

**New DB table: `ithink_attention_flags`**

```sql
CREATE TABLE ithink_attention_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  signal_type VARCHAR(100) NOT NULL,          -- e.g. "attention_flag", "high_concern"
  raw_payload JSONB NOT NULL,                 -- full webhook payload for audit
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,                    -- NULL = unresolved; set when CM clears
  resolved_by UUID REFERENCES contributors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attention_flags_contributor ON ithink_attention_flags(contributor_id);
CREATE INDEX idx_attention_flags_institution ON ithink_attention_flags(institution_id);
CREATE INDEX idx_attention_flags_unresolved ON ithink_attention_flags(institution_id) WHERE resolved_at IS NULL;
```

The partial index on `(institution_id) WHERE resolved_at IS NULL` makes the CM attention view query fast without scanning resolved records.

**Contributor matching:**

The webhook payload contains an identifier from iThink's system. The receiver must match this to a `contributors.id` in IU. The most robust approach is email — both systems have it, it's human-readable, and it avoids needing a shared UUID scheme. The webhook receiver queries `contributors` by email, gets the `id`, and uses it for the FK. If no match is found, log the event (in `raw_payload`) and return 200 with a note — do not return 404 (iThink must not retry indefinitely on unknown contributors).

**New files:**

```
packages/server/src/
├── routes/webhooks.ts          NEW — iThink webhook handler
├── db/schema.ts               MODIFIED — add ithink_attention_flags table
├── config/env.ts              MODIFIED — add ITHINK_WEBHOOK_SECRET
└── express-app.ts             MODIFIED — mount webhook route before express.json()
packages/server/scripts/
└── add-attention-flags-table.mjs   NEW — manual migration script
```

---

### Feature 5: Webhook Dispatch from iThink (iThink-side changes)

**What iThink must add:**

iThink currently has no outbound webhook capability. It needs to:
1. Store a webhook endpoint URL and shared secret per institution (configurable by CM)
2. After a screening that produces a flagged result, send a signed POST to the configured URL
3. Handle failures gracefully (retry with backoff, log failures)

**iThink architecture context:**

- React Native app + Express API
- Session-based auth
- SQLite local DB

**New iThink DB table (SQLite):**

```sql
CREATE TABLE IF NOT EXISTS webhook_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_identifier TEXT NOT NULL,  -- matches IU institution slug
  endpoint_url TEXT NOT NULL,
  secret TEXT NOT NULL,                  -- shared secret for HMAC signing
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**New iThink API route (CM configures from IU or directly):**

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

  const response = await fetch(config.endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-iThink-Signature": sig,
    },
    body,
  });

  if (!response.ok) {
    // Log failure — do not throw, screening completion must not be blocked by webhook failure
    console.error(`[webhook] Dispatch failed: ${response.status}`);
  }
}
```

**Payload shape (agreed contract between iThink and IU):**

```typescript
interface IThinkWebhookPayload {
  event: "attention_flag";
  institutionSlug: string;       // matches IU institution slug
  contributorEmail: string;      // used by IU to look up contributor
  signalType: string;            // e.g. "high_concern", "needs_checkin"
  screeningCompletedAt: string;  // ISO 8601
}
```

**Key constraint:** The webhook dispatch must be fire-and-forget from the screening handler's perspective. A network failure sending a webhook must never cause the screening to fail or the iThink API to return an error to the React Native client.

**iThink files touched:**

```
iThink/
├── src/db/schema.sql (or migrations/)
│   └── add webhook_configs table
├── src/routes/
│   └── webhooks.ts         NEW — config CRUD endpoints
└── src/services/
    └── webhook.service.ts  NEW — dispatchWebhook() + signing logic
```

The screening completion handler (wherever it lives in iThink's route layer) calls `dispatchWebhook()` after persisting the screening result, wrapped in a try-catch that only logs on failure.

---

### Feature 6: CM Attention Dashboard (React page)

**What it shows:**

A list of contributors flagged by iThink, filterable by institution. Each row shows:
- Contributor name
- Institution name
- Signal type
- When received
- "Clear" action (CM marks as resolved after follow-up)

**New API routes (on IU server):**

```
GET  /api/attention
     — list unresolved attention flags
     — requires: community_manager role
     — query params: ?institutionSlug=... (optional filter)
     — response: { flags: AttentionFlag[] }

POST /api/attention/:flagId/resolve
     — CM marks a flag as resolved after follow-up
     — requires: community_manager role
     — sets resolved_at = NOW(), resolved_by = req.contributor.id
     — response: { ok: true }
```

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

The `ProtectedRoute` or a new `CMRoute` wrapper handles the role guard client-side. The server guards the API endpoints independently — client-side route guarding is defence-in-depth only.

**New API client file:**

```
packages/web/src/api/attention.ts    NEW
```

Typed fetch wrappers for `GET /api/attention` and `POST /api/attention/:flagId/resolve`.

**New hook:**

```
packages/web/src/hooks/useAttention.ts    NEW
```

TanStack Query wrappers following the existing hook pattern (`useQuery` for list, `useMutation` for resolve).

**Data flow:**

```
CM opens /attention
    ↓ GET /api/attention?institutionSlug=brixton-library (cookie auth, CM role)
Server: JOIN ithink_attention_flags + contributors + institutions WHERE resolved_at IS NULL
    ↓
AttentionDashboard renders flag list with institution filter
CM clicks "Clear" on a flag
    ↓ POST /api/attention/:flagId/resolve (cookie auth, CM role)
Server: UPDATE ithink_attention_flags SET resolved_at = NOW(), resolved_by = $cmId
    ↓
useMutation onSuccess: invalidateQueries(["attention"]) → list refetches
Flag disappears from list
```

---

## New Tables Summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| — | (no new table) | Contributors gain `institution_id FK → institutions.id` |
| `ithink_attention_flags` | Stores incoming iThink webhook events as actionable flags | `contributor_id`, `institution_id`, `signal_type`, `resolved_at`, `raw_payload` |
| `webhook_configs` (iThink/SQLite) | Stores iThink outbound webhook targets per institution | `institution_identifier`, `endpoint_url`, `secret`, `is_active` |

---

## New Columns Summary

| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `contributors` | `institution_id` | `UUID REFERENCES institutions(id) ON DELETE SET NULL` | Assigns contributor to an institution |

---

## New Routes Summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/institutions` | CM | List all active institutions |
| `GET` | `/api/institutions/:slug/contributors` | CM | List contributors assigned to institution |
| `PUT` | `/api/institutions/:slug/contributors/:id` | CM | Assign contributor to institution |
| `DELETE` | `/api/institutions/:slug/contributors/:id` | CM | Remove contributor from institution |
| `GET` | `/api/institutions/:slug/report.pdf` | CM | Download PDF impact report |
| `POST` | `/api/webhooks/ithink` | Signature | Receive signed webhook from iThink |
| `GET` | `/api/attention` | CM | List unresolved attention flags |
| `POST` | `/api/attention/:flagId/resolve` | CM | Mark flag as resolved |

All CM routes use `authMiddleware` + `requireRole("community_manager")`.
The webhook route uses HMAC signature verification, not JWT auth.

---

## Recommended Project Structure Changes for v1.2

```
packages/
├── server/src/
│   ├── routes/
│   │   ├── institutions.ts     MODIFIED — add CM management routes + PDF route
│   │   ├── webhooks.ts         NEW — iThink webhook receiver
│   │   └── attention.ts        NEW — CM attention view endpoints
│   ├── db/
│   │   └── schema.ts           MODIFIED — institution_id FK on contributors, ithink_attention_flags table
│   ├── pdf/
│   │   └── institution-report.tsx  NEW — @react-pdf/renderer component (server-only)
│   ├── config/
│   │   └── env.ts              MODIFIED — add ITHINK_WEBHOOK_SECRET
│   └── express-app.ts          MODIFIED — mount webhooks route (before express.json()), attention routes
│
├── server/scripts/
│   ├── add-contributor-institution-fk.mjs     NEW — manual migration
│   └── add-attention-flags-table.mjs          NEW — manual migration
│
└── web/src/
    ├── pages/attention/
    │   └── AttentionDashboard.tsx    NEW
    ├── api/
    │   └── attention.ts              NEW — typed fetch wrappers
    ├── hooks/
    │   └── useAttention.ts           NEW
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
    └── webhook.service.ts  NEW — dispatchWebhook() + HMAC signing
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

**Trade-off:** At >1000 contributors per institution, materialise the stats with a periodic job. At pilot scale, live queries are simpler and always correct.

### Pattern 3: Server-Side PDF Rendering

**What:** `@react-pdf/renderer` renders a React component tree to a PDF `Readable` stream in the Node.js process. The stream is piped directly to the HTTP response.

**When to use:** On-demand document generation that must be printable and distributable without requiring a browser session.

**Example:**

```typescript
import { renderToStream } from "@react-pdf/renderer";
import { InstitutionReport } from "../pdf/institution-report.js";

router.get("/:slug/report.pdf", authMiddleware, requireRole("community_manager"), async (req, res) => {
  const data = await buildReportData(req.params.slug);
  const stream = await renderToStream(<InstitutionReport data={data} />);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${req.params.slug}-report.pdf"`);
  stream.pipe(res);
});
```

### Pattern 4: Partial Index for Actionable Queue

**What:** `CREATE INDEX idx_attention_flags_unresolved ON ithink_attention_flags(institution_id) WHERE resolved_at IS NULL`

**When to use:** When a table accumulates many rows but the application mostly queries a small active subset (unresolved flags). The partial index only indexes rows matching the WHERE clause — stays small as flags are resolved.

### Pattern 5: Fire-and-Forget Webhook Dispatch (iThink side)

**What:** Dispatch is wrapped in try-catch. Failures are logged but never propagate. The screening result is persisted regardless of webhook outcome.

**When to use:** Any outbound integration where the primary action (screening persistence) must not be blocked by a network call to an external system.

---

## Data Flow Diagrams

### Flow 1: CM Assigns Contributor to Institution

```
CM clicks "Assign to Brixton Library"
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
InstitutionLanding renders stats — no React component change needed
```

### Flow 3: iThink Screening → IU Attention Flag

```
iThink user completes a screening
    ↓ Screening result persisted in iThink SQLite DB
iThink screening handler calls dispatchWebhook(config, payload)
    ↓ POST https://iu.example.com/api/webhooks/ithink
    ↓ X-iThink-Signature: sha256=<hmac>
    ↓ Body: { event, institutionSlug, contributorEmail, signalType, screeningCompletedAt }

IU webhook handler:
  1. verify HMAC (timingSafeEqual)
  2. parse payload from raw Buffer
  3. lookup contributor by email
  4. lookup institution by slug
  5. INSERT ithink_attention_flags (contributor_id, institution_id, signal_type, raw_payload)
  6. res.status(200).json({ received: true })  ← always 200 if signature valid
```

### Flow 4: CM Attention Dashboard

```
CM opens /attention (protected route, community_manager only)
    ↓ GET /api/attention?institutionSlug=brixton-library
SELECT f.id, f.signal_type, f.received_at,
       c.name AS contributor_name,
       i.name AS institution_name
FROM ithink_attention_flags f
JOIN contributors c ON c.id = f.contributor_id
JOIN institutions i ON i.id = f.institution_id
WHERE f.resolved_at IS NULL
  AND i.slug = 'brixton-library'
ORDER BY f.received_at DESC
    ↓
AttentionDashboard renders flag list
CM clicks "Clear" on a flag
    ↓ POST /api/attention/:flagId/resolve
UPDATE ithink_attention_flags
SET resolved_at = NOW(), resolved_by = $cmContributorId
WHERE id = $flagId
    ↓
invalidateQueries(["attention"]) → list refetches without the cleared flag
```

### Flow 5: CM Downloads PDF Impact Report

```
CM clicks "Download Report" for Brixton Library
    ↓ GET /api/institutions/brixton-library/report.pdf (cookie auth, CM role)
Route handler:
  1. fetch institution record
  2. 4 parallel Drizzle queries (contributor list, hours, challenges, wellbeing aggregates)
  3. renderToStream(<InstitutionReport data={...} />) — @react-pdf/renderer
  4. res.setHeader("Content-Type", "application/pdf")
  5. stream.pipe(res)
Browser receives PDF bytes → download prompt or inline viewer
```

---

## Integration Points — New vs Modified vs Unchanged

### IU Server

| File | Status | Reason |
|------|--------|--------|
| `routes/institutions.ts` | MODIFIED | Add CM management routes + PDF route; replace stats_json with live aggregates |
| `routes/webhooks.ts` | NEW | iThink webhook receiver |
| `routes/attention.ts` | NEW | CM attention view endpoints |
| `pdf/institution-report.tsx` | NEW | @react-pdf/renderer document component |
| `db/schema.ts` | MODIFIED | `institution_id` FK on contributors; `ithink_attention_flags` table |
| `config/env.ts` | MODIFIED | Add `ITHINK_WEBHOOK_SECRET` |
| `express-app.ts` | MODIFIED | Mount webhook route (before express.json()); mount attention routes |
| `scripts/add-contributor-institution-fk.mjs` | NEW | Manual migration: FK column + index |
| `scripts/add-attention-flags-table.mjs` | NEW | Manual migration: attention flags table |

### IU Web

| File | Status | Reason |
|------|--------|--------|
| `pages/attention/AttentionDashboard.tsx` | NEW | CM attention view React page |
| `api/attention.ts` | NEW | Typed fetch wrappers for attention endpoints |
| `hooks/useAttention.ts` | NEW | TanStack Query hooks |
| `App.tsx` | MODIFIED | Add `/attention` route |

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
| `src/services/webhook.service.ts` | NEW | `dispatchWebhook()` + HMAC signing |
| Screening completion handler | MODIFIED | Call `dispatchWebhook()` after persisting result |

---

## Recommended Build Order

Dependencies determine the safe sequence. DB schema must exist before routes use it. IU receiver must exist before iThink dispatch is tested end-to-end.

**Step 1 — DB migrations (IU)**

1. `add-contributor-institution-fk.mjs` — adds `institution_id` to `contributors`
2. Update `db/schema.ts` to reflect the new column
3. `add-attention-flags-table.mjs` — adds `ithink_attention_flags`
4. Update `db/schema.ts` for the new table

Rationale: all subsequent steps depend on the schema. Run migrations before writing any route code that references the new columns.

**Step 2 — Institution stats live aggregates (IU server)**

Modify the existing `GET /api/institutions/:slug` handler to compute stats from live queries instead of `statsJson`. This is a self-contained change to an existing file with a clear contract. Ship it before adding the CM management routes, so the public landing page stays correct throughout the build.

**Step 3 — CM institution management routes (IU server + web)**

1. Add the 4 CM management routes to `routes/institutions.ts`
2. Add `GET /api/institutions` (list all institutions for CM)
3. Add the web API client (`api/attention.ts` not needed yet — but the institution management calls can go in `api/institutions.ts`)

This gives the CM the ability to assign contributors to institutions before the PDF or webhook features are complete.

**Step 4 — Webhook receiver (IU server)**

1. Add `ITHINK_WEBHOOK_SECRET` to `config/env.ts`
2. Create `routes/webhooks.ts` with the iThink receiver handler
3. Mount in `express-app.ts` before `express.json()`

This can be tested independently by sending a signed POST from curl before iThink is modified.

**Step 5 — Webhook dispatch (iThink)**

1. Add `webhook_configs` table to iThink SQLite
2. Add CM config routes
3. Add `webhook.service.ts` with `dispatchWebhook()`
4. Modify the screening completion handler to call it

**Step 6 — CM attention view (IU server + web)**

1. Create `routes/attention.ts`
2. Mount in `express-app.ts`
3. Create `pages/attention/AttentionDashboard.tsx`, `api/attention.ts`, `hooks/useAttention.ts`
4. Add route to `App.tsx`

This is last because it consumes flags that only exist once both webhook sides are built and tested end-to-end.

**Step 7 — PDF report (IU server)**

1. Add `@react-pdf/renderer` to `packages/server/package.json`
2. Create `pdf/institution-report.tsx`
3. Add `GET /:slug/report.pdf` route to `routes/institutions.ts`

PDF is self-contained and the last CM feature. It depends on the institution management data (Step 3) but not on webhooks or the attention view.

---

## Anti-Patterns

### Anti-Pattern 1: Storing PDF Files in S3 on Generation

**What people do:** Generate the PDF once, store it in S3, return a download URL.

**Why it's wrong:** The report must reflect current data. Cached PDFs go stale the moment a contributor is added, an hour is logged, or a flag is resolved. For the CM at pilot scale (one institution per session), on-demand generation is negligible cost.

**Do this instead:** Generate on request, stream to response, no storage. If S3 is needed later (e.g., email attachment), generate at send time.

### Anti-Pattern 2: Putting PDF Component in Shared or Web Package

**What people do:** Put the `@react-pdf/renderer` component in `packages/shared` or `packages/web/src/components`.

**Why it's wrong:** `@react-pdf/renderer` uses a custom renderer incompatible with the DOM. Importing it into the web bundle causes build failures or runtime crashes.

**Do this instead:** Isolate in `packages/server/src/pdf/`. Server-only. The PDF component is never imported by the web package.

### Anti-Pattern 3: Blocking Screening on Webhook Dispatch (iThink)

**What people do:** `await dispatchWebhook(...)` in the screening handler without a try-catch, or with the screening commit inside the same transaction.

**Why it's wrong:** If IU is unavailable, the screening fails. A network error in an outbound call corrupts the primary operation.

**Do this instead:** Fire and forget. Persist the screening first. Call `dispatchWebhook` after, wrapped in try-catch that logs on failure but does not rethrow.

### Anti-Pattern 4: Using JSON Body Parser for Webhook Routes

**What people do:** Forget to add the raw body parser before `express.json()` for webhook endpoints.

**Why it's wrong:** The HMAC signature is computed over the raw bytes. Once `express.json()` parses the body, the raw bytes are gone — signature verification always fails.

**Do this instead:** Mount webhook routes with `express.raw({ type: "application/json" })` before `app.use(express.json())` in `express-app.ts`. This is already done for the Stripe webhook — follow the same pattern exactly.

### Anti-Pattern 5: Returning Non-200 for Unknown Contributors in Webhook Receiver

**What people do:** Return `404` when the webhook payload references a contributor email not found in IU.

**Why it's wrong:** iThink's retry logic will keep sending the webhook. The contributor may not be in IU yet, or may have a different email. The request is valid — it just can't be acted on.

**Do this instead:** Return `200 { received: true }` for all signature-valid requests. Log the unmatched payload in `raw_payload` for manual investigation. Do not insert an `ithink_attention_flags` row if the contributor is unresolvable.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k contributors (pilot) | Live aggregate queries — no caching needed; `@react-pdf/renderer` synchronous rendering acceptable |
| 1k-10k contributors | Materialise institution stats via periodic job (update `stats_json` every N minutes); add pagination to attention dashboard |
| 10k+ contributors | Extract webhook receiver to a separate process with a queue; attention flags processing becomes async |

---

## Sources

- Direct codebase inspection: `packages/server/src/` (all route files, middleware, db/schema.ts, config/env.ts, express-app.ts, scripts/)
- Direct codebase inspection: `packages/web/src/` (App.tsx, all page directories, hooks/, api/)
- Direct codebase inspection: `.planning/PROJECT.md` — v1.2 feature list and scope confirmed
- Existing webhook pattern: `routes/payments.ts` + `express-app.ts` (Stripe raw body mount)
- Existing API key pattern: `middleware/api-key-auth.ts` + `routes/vantage.ts`
- `@react-pdf/renderer`: MEDIUM confidence — widely used server-side PDF library in Node.js ecosystem; version to be confirmed at install time
- iThink architecture: described in project context; not directly inspectable — iThink modifications are specced from description only (MEDIUM confidence on exact file paths, HIGH confidence on the pattern)

---

*Architecture research for: Indomitable Unity v1.2 Institution Management & iThink Integration*
*Researched: 2026-03-21*
