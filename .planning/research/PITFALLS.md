# Pitfalls Research

**Domain:** Adding institution management, PDF reports, webhook integration, and CM attention views to existing Node.js/PostgreSQL platform (v1.2)
**Project:** Indomitable Unity
**Researched:** 2026-03-21
**Confidence:** HIGH — all pitfalls grounded in the actual v1.1 codebase (`packages/server/src/`, `packages/web/src/`); research verified against official PostgreSQL documentation, official Node.js `crypto` module, and current security guidance.

> **Scope note:** This file covers v1.2 pitfalls only. v1.1 pitfalls (kiosk cache leaks, enum migration strategy, MCP auth scope, dual auth path divergence, challenger PII exposure) are in the previous version of this file. Phase references use v1.2 phase naming.

---

## Critical Pitfalls

---

### Pitfall 1: Adding `institution_id` FK to `contributors` While Live Data Exists

**What goes wrong:**
The `contributors` table already contains active data (pilot contributors). Adding a `FOREIGN KEY (institution_id) REFERENCES institutions(id)` constraint in a single `ALTER TABLE` statement will perform a full table scan to validate every existing row. During that scan, Postgres holds an `AccessShareLock` that blocks writes to `contributors`. More critically, existing rows all have `NULL` for `institution_id` — if the FK column is added as `NOT NULL` without a default, the migration fails immediately on a non-empty table. If added as nullable, the FK is satisfied (nulls are always valid for FKs), but the migration still locks the table during validation.

For the `institutions` table, `statsJson` is currently seeded JSONB (`{ contributors: 0, challenges: 0, hours: 0 }`). When live aggregation replaces it, any code path that still reads `statsJson` will return stale zeros for institutions with real contributors assigned. Both the public landing page (`GET /api/institutions/:slug`) and any CM dashboard will silently serve stale data during the migration window.

**Why it happens:**
Developers write the Drizzle schema change, run `drizzle-kit generate`, and apply the migration without reading the generated SQL. The generated SQL will contain `ALTER TABLE contributors ADD COLUMN institution_id UUID REFERENCES institutions(id)` — a single statement that validates immediately on the full table. The stale JSONB problem happens because the code switch (from `statsJson` read to SQL aggregate) and the schema change (adding the FK column) are deployed separately without a data-consistency contract between them.

**How to avoid:**
Use the two-step `NOT VALID` / `VALIDATE CONSTRAINT` pattern for the FK:

```sql
-- Step 1: Add column and constraint WITHOUT validating existing rows (no table scan)
ALTER TABLE contributors ADD COLUMN institution_id UUID;
ALTER TABLE contributors
  ADD CONSTRAINT contributors_institution_id_fkey
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
  NOT VALID;

-- Step 2: Validate existing rows separately (uses SHARE UPDATE EXCLUSIVE lock — allows reads and writes)
ALTER TABLE contributors VALIDATE CONSTRAINT contributors_institution_id_fkey;
```

Write this as a named manual SQL migration script (following the established pattern in `packages/server/scripts/`), not via `drizzle-kit push`. The `NOT VALID` step completes in milliseconds. The `VALIDATE CONSTRAINT` step acquires a weaker lock — concurrent reads and writes to `contributors` continue while it runs.

For the JSONB-to-live-aggregation transition: keep `statsJson` populated and readable throughout v1.2. Do not remove the `statsJson` column. Add the live aggregation query as an alternative code path, behind a feature flag or a new endpoint (`GET /api/institutions/:slug/stats/live`). Switch the public landing page to the live query only after verifying correctness against known seed values. Remove `statsJson` in v1.3 or later.

**Warning signs:**
- Migration file contains `ALTER TABLE contributors ADD COLUMN institution_id UUID REFERENCES institutions(id)` as a single statement (no `NOT VALID`)
- Migration script adds the FK column as `NOT NULL` without a `DEFAULT` or backfill step
- The `GET /api/institutions/:slug` route reads `institution.statsJson` after live aggregation has been deployed
- No integration test asserts that institution stats match the count of assigned contributors

**Phase to address:** Institution Management phase — FK migration must be the first task, reviewed as SQL before execution

---

### Pitfall 2: Webhook Receiver Built Before Institution FK Migration Lands

**What goes wrong:**
The iThink webhook handler verifies that the claimed contributor is enrolled at the claimed institution by querying `contributors.institution_id`. But that column does not exist until the Institution Management migration runs. If a developer implements the webhook receiver in a parallel phase or before the FK column is added, the relationship check query either fails at runtime with a Postgres column-not-found error or — if the check is skipped because the column is not yet present — the webhook handler stores `attention_flags` rows with no relationship validation at all.

This is a phase-ordering trap unique to this project: the webhook integration (iThink phase) has a hard schema dependency on the institution management phase (FK column on `contributors`). The two could be planned as separate phases, and if the ordering is wrong, one of two outcomes occurs — silent security regression (relationship check omitted) or runtime crashes.

**Why it happens:**
Phases are planned as logical features, not schema dependency graphs. The institution FK and the webhook receiver feel like separate concerns. The dependency only becomes visible when you trace the webhook handler's DB query to its column reference.

**How to avoid:**
Enforce this sequencing in the roadmap explicitly:

1. Phase A (Institution Management) must include and verify the `institution_id` FK column on `contributors` before Phase B (Webhook Receiver) begins.
2. The webhook receiver phase plan must include a prerequisite check: `\d contributors | grep institution_id` — if the column is absent, the phase cannot start.
3. The Drizzle schema must be updated to include `institutionId` on the `contributors` table as part of Phase A, not as part of the webhook phase.

Write the relationship check query in the webhook handler from day one, even if it initially cannot be fully tested until seed data exists.

**Warning signs:**
- Webhook receiver phase begins before Phase A (Institution Management) has been verified complete
- Webhook handler omits the contributor-institution relationship check "for now, to be added later"
- `packages/server/src/db/schema.ts` does not include `institutionId` on the `contributors` table when the webhook route file is created

**Phase to address:** Roadmap ordering — Institution Management phase must precede and gate Webhook Receiver phase

---

### Pitfall 3: iThink Webhook Receiver Using String `===` for Signature Comparison

**What goes wrong:**
The HMAC-SHA256 signature verification for incoming iThink webhooks compares the expected and received signatures using JavaScript string equality (`===`). This is vulnerable to a timing attack: an adversary who can send many requests can measure the microsecond difference between "first byte mismatch" (fast return) and "all bytes match" (slow return) to incrementally reconstruct the expected signature. The attack requires many thousands of requests but is feasible against a predictable endpoint.

The existing `api-key-auth.ts` middleware already uses `crypto.timingSafeEqual` correctly for API key validation. The webhook receiver must follow the same pattern — but it will likely be written as new code by a different developer without awareness of this pattern being established elsewhere.

**Why it happens:**
Developers write `if (computedSig === receivedSig) { ... }` because it reads naturally. The timing vulnerability is not visible in normal testing and does not appear in any TypeScript type error or runtime warning.

**How to avoid:**
Use `crypto.timingSafeEqual` from Node.js's built-in `crypto` module — the same approach already used in `api-key-auth.ts`:

```typescript
import { createHmac, timingSafeEqual } from "node:crypto";

function verifyWebhookSignature(
  payload: Buffer,      // raw request body as Buffer — do NOT use parsed JSON
  receivedSig: string,  // from X-IThink-Signature header
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(receivedSig, "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}
```

Critical: compute the HMAC over the **raw request body bytes**, not the JSON-parsed object. Use `express.raw({ type: 'application/json' })` on the webhook route — not `express.json()`. Parsing JSON before signature verification corrupts the byte sequence (key ordering, whitespace) and makes the signature check fail even for valid requests.

**Warning signs:**
- Webhook route uses `express.json()` middleware upstream of the signature check
- Signature comparison uses `===`, `.equals()`, or any string comparison method
- No test that intentionally sends a wrong-signature webhook and asserts 401

**Phase to address:** Webhook Receiver phase — signature verification written as first function, tested before any flag-processing logic is added

---

### Pitfall 4: Webhook Replay Attacks — No Timestamp Window or Idempotency Check

**What goes wrong:**
An attacker (or a misconfigured iThink retry mechanism) replays a previously captured valid webhook. If the IU server has no timestamp check and no idempotency check, the same "needs attention" flag fires repeatedly, creating duplicate entries in the `attention_flags` table, sending duplicate CM notifications, and — if the CM has already cleared the flag — re-surfacing it as unresolved.

This is distinct from signature verification: a replayed webhook has a valid signature because it was a real request. Signature verification alone does not prevent replay.

**Why it happens:**
Webhook replay protection is a second-order concern. Developers build the happy path (receive webhook, verify signature, store flag, notify CM), verify it works once, and move on. Replay protection requires an additional DB lookup or cache check that slows down the happy path.

**How to avoid:**
Implement both layers:

1. **Timestamp window:** Require a `X-IThink-Timestamp` header (Unix epoch seconds). Reject any request where `|server_time - webhook_timestamp| > 300` (5 minutes). This alone covers the vast majority of replay scenarios without any DB lookup.

2. **Idempotency key:** Require a `X-IThink-Delivery-Id` (UUID or opaque string) header. Store processed delivery IDs in the database with a `processed_at` timestamp. Before processing, check: `SELECT 1 FROM webhook_deliveries WHERE delivery_id = $1`. If found, return 200 immediately without side effects. This covers the edge case where iThink legitimately retries a delivery that timed out (the response never reached iThink, but IU processed it).

The `webhook_deliveries` table needs only: `delivery_id (varchar PK)`, `processed_at (timestamptz)`, `source (varchar)`. A scheduled cleanup job can delete rows older than 30 days.

**Warning signs:**
- Webhook handler has no timestamp header validation
- No `webhook_deliveries` or equivalent idempotency table in the migration plan
- Calling the same webhook endpoint twice with the same payload produces two rows in `attention_flags`

**Phase to address:** Webhook Receiver phase — idempotency table added in the same migration as the webhook handler is deployed

---

### Pitfall 5: Parsing iThink Webhook Payload Without Schema Validation

**What goes wrong:**
The IU server receives a JSON body from iThink, destructures it with `const { contributorId, institutionId, severity, screeningType } = req.body`, and stores the values directly in `attention_flags`. If iThink changes their payload shape (adds fields, renames a field, changes a type), the IU server silently stores `undefined` for required fields, or crashes on type errors, or — if `contributorId` is absent — creates an unlinked attention flag with a null FK that violates the constraint.

The same pattern caused problems with VANTAGE response parsing in v1.1 (flagged in v1.1 pitfalls). Cross-app integration is the highest-risk surface for contract drift because iThink and IU are maintained independently.

**Why it happens:**
Developers trust the sender — iThink is the same developer's own app. Because the contract is "known", no validation is added. When iThink evolves, the IU webhook handler breaks silently.

**How to avoid:**
Parse every incoming iThink webhook payload through a Zod schema before touching any field:

```typescript
import { z } from "zod";

const iThinkWebhookSchema = z.object({
  contributorId: z.string().uuid(),
  institutionId: z.string().uuid(),
  severity: z.enum(["low", "medium", "high"]),
  screeningType: z.string().min(1),
  triggeredAt: z.string().datetime(),
});

const parseResult = iThinkWebhookSchema.safeParse(req.body);
if (!parseResult.success) {
  // Log the parse error with full detail — this surfaces contract drift immediately
  console.error("[webhook] iThink payload schema mismatch:", parseResult.error);
  res.status(400).json({ error: "Invalid webhook payload" });
  return;
}
```

On parse failure, return 400 so iThink retries. Log the Zod error in full — schema mismatches caught early prevent silent data corruption.

**Warning signs:**
- Webhook handler destructures `req.body` without Zod validation
- No test sends a malformed/incomplete iThink payload and asserts 400
- `contributorId` or `institutionId` is written to the DB without being validated as a UUID

**Phase to address:** Webhook Receiver phase — Zod schema defined and tested before handler logic

---

### Pitfall 6: Contributor-Institution Matching in Webhook Handler Using Unverified Caller-Supplied IDs

**What goes wrong:**
The iThink webhook payload contains `contributorId` and `institutionId` as supplied by iThink. The IU webhook handler takes these at face value and creates an attention flag for that contributor at that institution. An adversary who can craft a valid webhook (by obtaining the shared secret, or before the secret is rotated after a breach) can flag any contributor at any institution — including contributors who have no relationship with that institution.

This creates false positives in the CM attention view and — more seriously — could expose a contributor's "needs attention" status to a CM at an institution they are not enrolled in.

**Why it happens:**
After signature verification passes, developers consider the payload trusted. But a signed payload only proves it came from a system that holds the secret — it does not prove the claimed IDs are valid or that the relationships are legitimate.

**How to avoid:**
After signature verification, verify the relationship before storing the flag:

```typescript
// Check that the contributor is actually enrolled at the claimed institution
const enrollment = await db
  .select({ id: contributors.id })
  .from(contributors)
  .where(
    and(
      eq(contributors.id, payload.contributorId),
      eq(contributors.institutionId, payload.institutionId),
    )
  )
  .limit(1);

if (!enrollment.length) {
  // Log as suspicious — signed but relationship invalid
  console.warn("[webhook] iThink: contributor-institution mismatch", payload);
  res.status(400).json({ error: "Contributor not enrolled at institution" });
  return;
}
```

This check costs one indexed DB lookup per webhook and prevents cross-institution data leakage even if the shared secret is compromised.

**Warning signs:**
- Webhook handler stores `attention_flags` rows without verifying the contributor-institution FK exists
- No test sends a valid-signature webhook with a mismatched contributor/institution pair

**Phase to address:** Webhook Receiver phase — relationship check added before any DB write in the handler

---

### Pitfall 7: PDF Generation Blocking the Express Event Loop

**What goes wrong:**
PDF generation for institution impact reports is synchronous-heavy work (data aggregation + layout computation + font rendering). Implementing it as a direct Express route handler (`res.json(await generatePdf(institutionId))`) blocks the Node.js event loop for the duration of generation. While PDF generation is in progress, every other request to the server queues. For a report covering 12 months of contributor activity across 50 contributors, generation may take 2–10 seconds. Server-observed latency for all other endpoints spikes during this window.

At pilot scale (1 CM, 3–5 institutions), this is infrequent but noticeable. The problem is architectural — fixing it after the fact requires extracting PDF generation into a worker or queue.

**Why it happens:**
PDFKit and pdfmake are synchronous/stream-based and do not yield to the event loop. Developers test with tiny datasets (1 contributor, 1 challenge) where generation takes <100ms, and the blocking behaviour is invisible. Production data volumes reveal it.

**How to avoid:**
Use Node.js `worker_threads` to offload PDF generation off the main event loop. The worker receives serialised report data (plain JSON), generates the PDF buffer, and posts it back. The Express handler awaits the worker result without blocking other requests. Alternatively, stream the PDF directly to the response using PDFKit's streaming API — this does not eliminate CPU blocking but reduces the time-to-first-byte and avoids holding large buffers in memory.

For v1.2 at pilot scale, streaming to response is acceptable. Do not use Puppeteer/headless Chrome for this use case — it adds 300–500MB memory per concurrent render, requires Chromium system dependencies, and inflates Docker image size by 1–1.5 GB for what is a simple structured data report. PDFKit is the correct tool.

Set an explicit timeout on the PDF route (`req.setTimeout(30_000)`) so a runaway generation does not hold the connection open indefinitely.

**Warning signs:**
- PDF route handler is `async (req, res) => { const buf = await generatePdf(...); res.send(buf); }` — no worker or streaming
- Puppeteer/Playwright is in `package.json` for PDF generation
- No timeout set on the PDF route
- Test uses a dataset of 1–2 contributors (masks the blocking problem)

**Phase to address:** PDF Reports phase — architecture decision (streaming vs worker) made before writing any PDF generation code

---

### Pitfall 8: CM Attention View Has No Access Scope — Any CM Sees All Flagged Contributors

**What goes wrong:**
The CM attention view lists contributors flagged as needing attention. If the query is `SELECT * FROM attention_flags WHERE cleared_at IS NULL ORDER BY flagged_at DESC`, any authenticated CM sees flags for all institutions. In a multi-institution deployment (even at pilot scale with 3–5 institutions), a CM at one institution should not see contributor attention flags for a different institution.

This is a repeat of the challenger PII boundary problem from v1.1 — the data exists, the query is easy to write, and the access boundary is easy to omit.

**Why it happens:**
Single-institution pilot testing means "all flags" is always "my institution's flags" during development. The boundary is not visible until a second institution is added.

**How to avoid:**
The CM's institution assignment must be resolved at authentication time and scoped in every attention-flag query:

```typescript
// Resolve CM's institution from the DB on every request (not from the JWT)
const cmInstitution = await db
  .select({ institutionId: contributors.institutionId })
  .from(contributors)
  .where(eq(contributors.id, req.contributor!.id))
  .limit(1);

if (!cmInstitution[0]?.institutionId) {
  res.status(403).json({ error: "CM is not assigned to an institution" });
  return;
}

const flags = await db
  .select()
  .from(attentionFlags)
  .where(
    and(
      eq(attentionFlags.institutionId, cmInstitution[0].institutionId),
      isNull(attentionFlags.clearedAt),
    )
  );
```

Do not store the institution ID in the JWT — it can become stale if the CM is reassigned. Always resolve from the database at request time.

**Warning signs:**
- Attention flag query has no `institutionId` filter
- CM's institution scope comes from a JWT claim rather than a live DB lookup
- No integration test that creates two institutions, assigns a CM to one, and asserts the CM cannot see flags from the other

**Phase to address:** CM Attention View phase — institution scope filter written as the first line of the query before any UI is built

---

### Pitfall 9: Shared iThink Webhook Secret Stored in Source Code or Committed to Git

**What goes wrong:**
The HMAC secret used to verify iThink webhook signatures is a symmetric pre-shared key. If it is stored in `packages/server/src/config/env.ts` as a fallback default, or checked into `.env` files committed to the repository, the secret is permanently exposed in git history. Rotating the key requires both sides (IU and iThink) to update simultaneously — if they drift, webhooks fail silently.

**Why it happens:**
Developers add `ITHINK_WEBHOOK_SECRET=dev-secret-here` to the `.env.example` and accidentally commit the actual `.env` file, or hard-code a fallback value for local development.

**How to avoid:**
- Add `ITHINK_WEBHOOK_SECRET` to `getEnv()` with no fallback — the server must not start if the variable is absent
- Verify `.gitignore` covers `.env` and `.env.local` before the webhook phase begins
- Store the production secret in the deployment environment variables only (not in any file that could be committed)
- Document the key rotation procedure: iThink updates their outbound signing secret, IU updates the environment variable and redeploys — both changes must be coordinated and deployed within the same maintenance window to avoid a gap where webhooks fail

**Warning signs:**
- `ITHINK_WEBHOOK_SECRET` has a fallback value in `getEnv()` (e.g., `process.env.ITHINK_WEBHOOK_SECRET || "dev-secret"`)
- `.env` file is not in `.gitignore` (run `git check-ignore -v .env` to verify)
- The secret appears in any script, seed file, or migration file

**Phase to address:** Webhook Receiver phase — environment variable added to `getEnv()` with no fallback before any webhook code is written

---

### Pitfall 10: Attention Flag Clearing Has No Audit Trail

**What goes wrong:**
A CM clears an attention flag ("mark as followed up") and the flag row is either deleted or has `cleared_at` set. If a follow-up question later arises ("Was this contributor's flag addressed?", "Which CM cleared this flag and when?"), there is no audit record. Worse, if the flag is physically deleted, any regulatory or safeguarding inquiry that references the flag will find no evidence it ever existed.

For a wellbeing-adjacent system used by a social enterprise, this is not just a UX issue — it is a governance and safeguarding concern. The Employment Agencies Act 1973 concern noted in the project context means IU is in a regulated space where audit trails for wellbeing-adjacent actions may become a compliance requirement.

**Why it happens:**
"Clear flag" is implemented as `DELETE FROM attention_flags WHERE id = $1` or `UPDATE attention_flags SET cleared_at = NOW()`. The second version preserves the timestamp but not which CM cleared it or any notes about the follow-up action. Soft delete alone is treated as sufficient.

**How to avoid:**
Design `attention_flags` with full audit columns from the start:

```sql
CREATE TABLE attention_flags (
  id UUID PRIMARY KEY,
  contributor_id UUID NOT NULL REFERENCES contributors(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  severity VARCHAR(20) NOT NULL,
  screening_type VARCHAR(100) NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Clearing / resolution
  cleared_at TIMESTAMPTZ,
  cleared_by UUID REFERENCES contributors(id),   -- which CM cleared it
  follow_up_notes TEXT,                          -- what the CM did
  -- Delivery tracking
  delivery_id VARCHAR(255) NOT NULL UNIQUE       -- idempotency key
);
```

Never DELETE attention flag rows. The `cleared_at` + `cleared_by` + `follow_up_notes` combination gives a full audit trail for every flag resolution.

**Warning signs:**
- `attention_flags` table has no `cleared_by` column
- The "clear flag" endpoint calls `DELETE` instead of `UPDATE ... SET cleared_at, cleared_by`
- No `follow_up_notes` field in the clear-flag request body

**Phase to address:** CM Attention View phase — `attention_flags` schema designed with audit columns before any API endpoint is written

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Add FK constraint without `NOT VALID` | Simpler migration file | Full table lock on `contributors` during migration; downtime if table is large | Never in production with live data |
| Keep `statsJson` JSONB after live aggregation is deployed | No backfill needed | Landing page and CM dashboard serve stale zeros for real institutions | Acceptable for one release cycle (v1.2); must be removed in v1.3 |
| PDF generation inline in route handler (no worker) | Simple code | Blocks event loop for all concurrent requests during generation; fixes require architectural refactor | Acceptable at pilot scale (1 CM, infrequent reports) if streaming is used; must be revisited at scale |
| Use Puppeteer for PDF reports | Pixel-perfect HTML rendering | 300–500MB per concurrent render, 1–1.5 GB Docker image bloat, orphaned Chrome processes under failure | Never — PDFKit or pdfmake is the correct choice for structured data reports |
| Store iThink webhook secret with a hardcoded fallback | Works in local dev without `.env` | Secret permanently in git history; cannot rotate without code change | Never |
| CM attention view with no institution scope filter | Works for single-institution pilot | Second institution added → all CMs see all flags; requires emergency hotfix | Never — scope filter costs one indexed DB lookup and must be there from day one |
| Webhook handler without idempotency check | Simpler handler | Duplicate flags on retry; CM sees resolved issues resurface | Never — `webhook_deliveries` table is small and the check is cheap |
| `attention_flags` with no `cleared_by` audit column | Simpler schema | Cannot answer "who cleared this flag or when?" for safeguarding inquiry | Never — add `cleared_by` and `follow_up_notes` from the start |
| Build webhook receiver before institution FK is in place | Faster parallel development | Relationship check query references non-existent column; silently omitted or crashes at runtime | Never — Institution Management phase must complete first |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| iThink webhook inbound | Parsing `req.body` as JSON before HMAC verification | Use `express.raw({ type: 'application/json' })` on the webhook route; pass raw Buffer to HMAC; parse JSON only after signature is verified |
| iThink webhook inbound | Computing HMAC over `JSON.stringify(req.body)` instead of raw bytes | The stringified JSON may differ in key order and whitespace from what iThink sent; always HMAC the raw request body Buffer |
| iThink webhook inbound | Using `===` for signature comparison | Use `crypto.timingSafeEqual` — the pattern is already established in `api-key-auth.ts`; copy it |
| iThink → IU contributor matching | Trusting `contributorId` in webhook payload without DB verification | After signature passes, verify `contributors.institution_id = payload.institutionId` before writing any flag |
| Institution stats migration | Switching `GET /api/institutions/:slug` to live aggregation in one deploy | Deploy live aggregation as a new field alongside `statsJson`; verify parity; then switch the field the response uses; never remove `statsJson` in the same deploy that adds live aggregation |
| PDF report streaming | Setting `Content-Type: application/pdf` without `Content-Disposition` | Without `Content-Disposition: attachment; filename="report.pdf"`, browsers render the PDF inline, which breaks on mobile; always set both headers |
| PDF report | Generating report with no data guard | An institution with zero contributors produces an empty PDF or a division-by-zero in percentage calculations; add explicit empty-state handling before PDF generation begins |
| iThink webhook phase ordering | Starting webhook receiver phase before institution FK migration | The relationship check query references `contributors.institution_id` — if that column does not exist, the handler crashes or the check is silently omitted |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Live institution stats aggregation runs on every `GET /api/institutions/:slug` request | Public landing page becomes slow when called from kiosk home screen on institution load | Compute stats with `COUNT(DISTINCT contributor_id)` + indexed `institution_id` column; add `institution_id` index before deploying live aggregation | At ~500 page loads/day per institution; not a pilot concern but index is cheap to add now |
| PDF generation blocks event loop (no worker/streaming) | All API calls to the server stall for 2–10 seconds when a CM generates a report | Stream PDF to response using PDFKit's `doc.pipe(res)` pattern; set `res.setTimeout(30_000)` | Every concurrent report generation; visible at single-CM pilot scale on slow report datasets |
| N+1 query in CM attention view (fetching contributor details per flag row) | CM attention view is slow with 10+ flagged contributors | JOIN `attention_flags` with `contributors` in a single query; do not loop over flags fetching contributor data individually | ~10 flagged contributors; visible in pilot |
| Attention flag cleared/uncleared polling on CM dashboard | CM dashboard refetches attention flags every 30 seconds (polling) and hits the server repeatedly | Acceptable at pilot scale; mark as known tech debt; add WebSocket or SSE in v1.3 if near-real-time is required | ~5 concurrent CMs polling; not a pilot concern |
| Missing index on `contributors.institution_id` | Institution management page and attention view queries do full table scans | Add `CREATE INDEX idx_contributors_institution_id ON contributors(institution_id)` in the same migration that adds the column | Noticeable from day one if contributor table has more than a few hundred rows |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| String `===` comparison for HMAC webhook signatures | Timing attack allows adversary to reconstruct signing secret incrementally | Always use `crypto.timingSafeEqual` with Buffer comparison; never compare HMAC strings with `===` |
| No timestamp window on incoming webhooks | Replayed webhooks fire flags indefinitely | Reject webhooks where `Math.abs(Date.now()/1000 - webhookTimestamp) > 300` |
| No idempotency check on webhook delivery | Duplicate flags on iThink retry; cleared flags resurface | Store processed `delivery_id` values in `webhook_deliveries` table; check before processing |
| CM sees attention flags outside their institution | Contributor "needs attention" status exposed to wrong organisation | Always filter `attention_flags` by CM's institution ID resolved from DB — never from JWT |
| `institution_id` stored in JWT claim | If CM is reassigned, stale JWT grants access to wrong institution's data until token expiry | Resolve CM's `institution_id` from DB on every request; do not embed in JWT |
| iThink webhook secret in `.env` committed to git | Secret permanently exposed; webhooks can be forged by anyone with repo access | Add `ITHINK_WEBHOOK_SECRET` to `getEnv()` with no fallback; verify `.gitignore` before writing webhook code |
| PDF report endpoint accessible to contributors | Contributors generate impact reports for institutions they are not assigned to | PDF report route must require `community_manager` role via `requireRole("community_manager")` |
| Attention flags physically deleted | No audit trail for safeguarding inquiries; potential regulatory exposure | Soft-delete only: `cleared_at` + `cleared_by` + `follow_up_notes`; never DELETE from `attention_flags` |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| CM attention view shows raw flag severity codes (`"high"`, `"medium"`) without explanation | CM does not know what action to take | Show human-readable flag descriptions: "Screening suggests this contributor may benefit from a wellbeing check-in" — not raw severity strings |
| CM "clear flag" action gives no confirmation | CM accidentally clears a flag that was not followed up | Require a confirmation step: "Mark as followed up — this cannot be undone without iThink raising a new flag" |
| CM dashboard shows "0 contributors" for an institution during the JSONB-to-live-aggregation transition | CM loses confidence in the data | Keep `statsJson` populated and readable until live aggregation is verified; show a "Live" badge only after parity is confirmed |
| PDF report takes 5–10 seconds with no progress indicator | CM thinks the button did nothing and clicks again (triggering duplicate generation) | Show a loading spinner with "Generating report..." immediately on click; disable the button while in progress |
| Institution management page allows CM to assign contributors without confirming | Accidental assignment of wrong contributor to institution | Require a review step: "Assign [Name] to [Institution]?" with confirm/cancel before writing to DB |
| "Clear flag" form has no follow-up notes field | CM cannot record what action was taken; audit trail is incomplete | Include a required or optional free-text "What was done?" field in the clear-flag modal |

---

## "Looks Done But Isn't" Checklist

- [ ] **FK migration:** Confirm the generated SQL contains `NOT VALID` — run `psql -c "\d contributors"` after migration and verify the FK constraint exists
- [ ] **FK validation step:** Confirm a separate `VALIDATE CONSTRAINT` migration exists and has been run — the constraint marked `NOT VALID` is not enforcing historical rows until this runs
- [ ] **institution_id index:** Confirm `idx_contributors_institution_id` index exists — run `\d contributors` and check the Indexes section
- [ ] **Webhook signature:** Send a test webhook with a wrong signature to the IU endpoint and assert HTTP 401 — a wrong-signature request must never reach the handler body
- [ ] **Webhook raw body:** Confirm the webhook route uses `express.raw()` not `express.json()` — send a webhook where JSON key order differs from the iThink canonical format and assert signature still passes
- [ ] **Replay protection:** Send the same webhook payload twice with the same `X-IThink-Delivery-Id` — assert the second call returns 200 but creates no new `attention_flags` row
- [ ] **Timestamp window:** Send a webhook with a timestamp 10 minutes in the past — assert HTTP 401
- [ ] **Contributor-institution relationship check:** Send a valid-signature webhook with a `contributorId` not enrolled at the claimed `institutionId` — assert HTTP 400
- [ ] **CM scope:** Log in as CM for Institution A; call `GET /api/cm/attention-flags`; assert no flags from Institution B appear in the response
- [ ] **PDF route auth:** Call `GET /api/institutions/:id/report` with a contributor (non-CM) JWT — assert HTTP 403
- [ ] **PDF empty state:** Generate a PDF report for an institution with zero contributors — assert no crash, a "No contributors assigned" empty state renders cleanly
- [ ] **iThink payload validation:** Send a webhook with a missing `contributorId` field — assert HTTP 400 with a Zod-derived error, not a 500 crash
- [ ] **Stats parity:** After deploying live aggregation, call both the old `statsJson` field and the new live query for a seeded institution — assert the counts match
- [ ] **Audit trail:** Clear an attention flag via the API; confirm `cleared_by` and `cleared_at` are populated; confirm the row still exists (not deleted)
- [ ] **Phase ordering gate:** Before starting Webhook Receiver phase, run `\d contributors | grep institution_id` — assert the column is present

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| FK added without `NOT VALID` — table lock caused downtime | MEDIUM | `ALTER TABLE contributors DROP CONSTRAINT ...`; re-add with `NOT VALID`; schedule `VALIDATE CONSTRAINT` in a low-traffic window; document the downtime in incident log |
| `statsJson` removed before live aggregation verified — landing pages return null stats | HIGH | Restore from backup or re-seed `statsJson` from a manual DB query; re-deploy the old code path while live aggregation is debugged; never remove a JSONB column in the same deploy as adding its live replacement |
| Webhook secret committed to git | HIGH | Rotate the secret immediately (coordinate with iThink); run `git filter-repo` to purge the secret from history; treat all webhooks received between commit and rotation as potentially forged; audit `attention_flags` for suspicious entries |
| Duplicate attention flags from webhook replay | LOW | Delete duplicates with `DELETE FROM attention_flags WHERE id NOT IN (SELECT MIN(id) FROM attention_flags GROUP BY contributor_id, institution_id, screening_type)`; add idempotency check before re-opening the endpoint |
| CM saw another institution's attention flags | HIGH | Assess GDPR breach notification obligation (contributor wellbeing-adjacent data shared without authorisation); fix scope filter; audit access logs to determine what data was visible and to whom; notify affected contributors if exposure was meaningful |
| PDF generation blocking the server — runaway report hold | MEDIUM | Add `req.setTimeout(30_000)` as immediate mitigation; restart server to clear held connections; refactor to streaming or worker in next sprint |
| Attention flags deleted instead of soft-deleted | HIGH | Restore from backup if available; implement audit log table going forward; assess safeguarding / regulatory notification obligation |
| Webhook receiver built before institution FK lands | MEDIUM | Add `institution_id` column to contributors immediately; update Drizzle schema; re-deploy webhook handler with relationship check restored; audit any flags stored without relationship verification |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| FK migration without `NOT VALID` — table lock | Institution Management — first migration task | Run migration on a copy of production data; confirm no downtime; verify constraint in `\d contributors` |
| institution_id index missing | Institution Management — same migration as FK | Check `\d contributors` Indexes section after migration |
| JSONB stats stale after live aggregation deployed | Institution Management — stats transition | Integration test: seeded institution stats match live aggregate count |
| Webhook receiver before institution FK exists | Roadmap phase ordering gate | Institution Management phase verified complete before Webhook Receiver phase begins |
| String `===` for webhook signature comparison | Webhook Receiver — first function written | Unit test: wrong signature returns 401; inspect code for absence of `===` on signature strings |
| No raw body on webhook route | Webhook Receiver | Send webhook with canonical vs. non-canonical JSON; both must pass |
| No timestamp window | Webhook Receiver | Send webhook with timestamp 10 min in past; assert 401 |
| No idempotency check | Webhook Receiver | Send same delivery ID twice; assert second creates no DB row |
| Caller-supplied IDs not verified against relationship | Webhook Receiver | Send valid-signature webhook with mismatched IDs; assert 400 |
| CM scope not filtered by institution | CM Attention View — first query written | Two-institution integration test; CM A cannot see CM B's flags |
| iThink payload schema drift — no Zod validation | Webhook Receiver | Send malformed payload; assert 400 not 500 |
| PDF blocking event loop | PDF Reports — architecture decision | Generate PDF while load test sends concurrent requests; assert median latency < 500ms for non-PDF endpoints |
| Webhook secret in git | Webhook Receiver — environment variable setup | `git log --all -p \| grep ITHINK_WEBHOOK_SECRET`; assert zero results |
| PDF endpoint missing role guard | PDF Reports | Call PDF endpoint with contributor JWT; assert 403 |
| Attention flags deleted — no audit trail | CM Attention View — schema design | After clear-flag API call, SELECT the row; assert it still exists with `cleared_at` and `cleared_by` populated |

---

## Sources

- Codebase direct inspection (v1.1): `packages/server/src/db/schema.ts`, `packages/server/src/middleware/api-key-auth.ts`, `packages/server/src/middleware/auth.ts`, `packages/server/src/routes/institutions.ts`, `packages/server/src/routes/impact.ts`, `packages/server/scripts/create-institutions-table.mjs`, `packages/server/scripts/extend-challenge-type.mjs`, `packages/server/scripts/mark-migration.mjs`
- PostgreSQL FK `NOT VALID`: [Migrating Foreign Keys in PostgreSQL — Thomas Skowron](https://thomas.skowron.eu/blog/migrating-foreign-keys-in-postgresql/); [Postgres: Adding Foreign Keys With Zero Downtime — Travis North](https://travisofthenorth.com/blog/2017/2/2/postgres-adding-foreign-keys-with-zero-downtime); [PostgreSQL ALTER TABLE official docs](https://www.postgresql.org/docs/current/sql-altertable.html)
- Drizzle ORM migration patterns: [8 Drizzle ORM Patterns for Clean, Fast Migrations — Medium](https://medium.com/@bhagyarana80/8-drizzle-orm-patterns-for-clean-fast-migrations-456c4c35b9d8)
- HMAC webhook security: [Webhook Signature Verification — Hookdeck](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification); [Validating Webhook Deliveries — GitHub Docs](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries); [Webhook Security Best Practices — Svix](https://www.svix.com/resources/webhook-best-practices/security/)
- Replay attack prevention: [Preventing Replay Attacks: Timestamps and Nonces — DoHost](https://dohost.us/index.php/2026/02/15/preventing-replay-attacks-implementing-timestamps-and-nonces-in-webhook-handlers/); [Replay Prevention — webhooks.fyi](https://webhooks.fyi/security/replay-prevention)
- Webhook idempotency: [Handling Payment Webhooks Reliably — Medium](https://medium.com/@sohail_saifii/handling-payment-webhooks-reliably-idempotency-retries-validation-69b762720bf5); [Webhook Reliability Tricks — Medium](https://medium.com/@kaushalsinh73/top-7-webhook-reliability-tricks-for-idempotency-a098f3ef5809)
- Node.js PDF generation: [Generating PDFs from HTML in Node.js — DEV Community](https://dev.to/digital_trubador/generating-pdfs-from-html-in-nodejs-and-why-i-stopped-using-puppeteer-4b3e); [The Hidden Cost of Headless Browsers — Medium](https://medium.com/@matveev.dina/the-hidden-cost-of-headless-browsers-a-puppeteer-memory-leak-journey-027e41291367); [Integrating PDF Generation into Node.js — Joyfill](https://joyfill.io/blog/integrating-pdf-generation-into-node-js-backends-tips-gotchas)
- Denormalization migration: [Denormalization: Solution or Long-Term Trap? — Medium](https://rafaelrampineli.medium.com/denormalization-a-solution-for-performance-or-a-long-term-trap-6b9af5b5b831)
- Soft delete / audit trail patterns: [Soft Delete in PostgreSQL — Onfido](https://onfido.com/blog/soft-deletes-vs-hard-deletes-in-postgres/); [Safeguarding audit log design — general GDPR data integrity guidance]

---
*Pitfalls research for: Indomitable Unity v1.2 — institution management, iThink webhook integration, PDF reports, CM attention view*
*Researched: 2026-03-21*
