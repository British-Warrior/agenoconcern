# Feature Research

**Domain:** CM-facing operational tooling — institution management, PDF impact reports, iThink webhook integration, CM attention dashboard
**Researched:** 2026-03-21
**Confidence:** HIGH (codebase verified, patterns grounded in existing architecture)

---

## Context: What Already Exists

The following are **already built** and must not be re-scoped into this milestone:

- `institutions` table: `id`, `slug`, `name`, `description`, `city`, `statsJson` (JSONB, seeded/static), `isActive`
- `GET /api/institutions/:slug` — public read endpoint
- `/i/:slug` — institution landing page (kiosk entry point)
- `KioskContext` — kiosk mode enforced via URL param, no session persistence
- `wellbeingCheckins` table with UCLA-3 and SWEMWBS-7 scores, linked to `consentRecords`
- `GET/POST /api/wellbeing/checkin`, `/due`, `/history` — contributor-facing
- `apiKeys` table and `apiKeyMiddleware` — HMAC-SHA256, scoped, expiry, rate-limited
- `vantage` routes — challenge read API for `X-API-Key` clients
- CM role enforced via `requireRole("community_manager")` middleware
- No CM-facing dashboard page exists yet — CM currently accesses challenge management via challenge feed

---

## Feature Landscape

### Table Stakes (CM Expects These)

Features a CM will assume exist once this milestone ships. Missing any of these makes the product feel like a prototype.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Institution list view (CM) | CM needs to see all institutions they manage, not just public slugs | LOW | Simple read off `institutions` table; no new schema |
| Institution create/edit form | Admin/CM must be able to add new venues and edit name/description/city | LOW | POST/PUT endpoints + form page; slug auto-generated from name at creation |
| Institution activate/deactivate toggle | CM must be able to disable a kiosk page without deleting it | LOW | `isActive` column already exists; PATCH endpoint |
| Institution-contributor link management | CM maps which contributors are associated with which institution; basis for live stats and iThink cohorts | MEDIUM | Requires new nullable `institution_id` FK on `contributors` table; CM assigns via PUT, removes via DELETE |
| Live stats on institution landing page | `statsJson` is currently seeded/static — landing page shows stale numbers | MEDIUM | Replace `statsJson` reads with live JOIN-based aggregates at query time; acceptable at pilot scale (tens of contributors per institution) |
| Contributor list per institution (CM view) | CM must see who belongs to each institution cohort | LOW | Query `contributors WHERE institution_id = $id`; name + status + last check-in date |
| PDF impact report (institution-level) | Institutions need a printable summary to share with funders or boards | HIGH | Use `pdfkit ^0.18.0` server-side streaming; data aggregated from contributor hours, challenges, wellbeing; do NOT use `@react-pdf/renderer` (active ESM breakage issues in ESM-first Node setup — see STACK.md) |
| iThink webhook receiver endpoint | iThink app must be able to push "attention flag" signals; no integration currently exists | MEDIUM | New `POST /api/webhooks/ithink` route; HMAC-SHA256 signature verification; idempotency via `webhook_deliveries` dedup table; raw body captured via `express.raw()` before `express.json()` (same pattern as existing Stripe webhook) |
| Webhook dedup / idempotency table | Replaying webhooks from iThink must not double-create flags | MEDIUM | `webhook_deliveries` table with `delivery_id` unique constraint; catch PG error 23505 and return 200 (idempotent acknowledgement) |
| CM attention view | CM needs a single view showing which contributors have been flagged by iThink, scoped to their institution | MEDIUM | Reads from `ithink_attention_flags` table populated by webhook receiver; filtered by institution; shows contributor name, signal type, received timestamp, "Clear" action |
| Attention flag storage | Webhook receiver writes per-contributor flags after verifying contributor-institution relationship | LOW | New `ithink_attention_flags` table: `id`, `contributorId` FK, `institutionId` FK, `signalType`, `rawPayload`, `receivedAt`, `resolvedAt`, `resolvedBy` |

### Differentiators (Competitive Advantage)

Features that distinguish this platform's operational tooling from generic admin panels.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Privacy-preserving flag matching | iThink sends contributor email and institution slug — IU resolves to internal IDs server-side; no iThink-internal IDs are stored in IU, and no IU data is sent to iThink | LOW (design constraint, not code) | Must be enforced at the webhook payload schema level; document the agreed payload contract explicitly before implementing |
| PDF report styled to platform brand | Funders expect professional output, not a data dump; report includes institution name, date range, challenge count, hours, wellbeing trajectory summary | MEDIUM | Use `pdfkit ^0.18.0` with programmatic layout; stream via `doc.pipe(res)` to `GET /api/institutions/:slug/report.pdf`; never buffer or store in S3 |
| Attention signal history (not just latest) | CM wants to see if flagging frequency is increasing or decreasing over time, not just the current open count | LOW | Store all flags with timestamps; order by `receivedAt DESC`; CM view shows last 30 signals per institution as an ordered list |
| Institution-scoped wellbeing aggregate in PDF | Wellbeing data from contributors linked to an institution can be rolled up anonymously for institution-level trend reporting | HIGH | Privacy threshold required: minimum 5 contributors with check-ins in the report period to display aggregate band; if threshold not met, omit with a note; flag as needing phase-specific implementation research |
| Webhook secret rotation (admin) | Allow admin to rotate the shared HMAC secret used for iThink verification without downtime | LOW | Store current + previous secret; accept signatures matching either for a transition window; admin PATCH endpoint; document rotation procedure for iThink side |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-contributor iThink detail visible in CM view beyond what IU itself stores | Seems like useful context for intervention planning | iThink is privacy-first local processing; the webhook payload contains only what IU needs to create a flag (email, institution, signal type). Logging additional iThink-internal screening details in IU would expand the data surface, create GDPR special-category risk, and undermine contributor trust | Store only `signalType` and `rawPayload` for audit; CM sees contributor name (already in IU), institution, signal type, and timestamp |
| Real-time webhook-to-CM dashboard push (WebSockets) | Seems snappy and responsive | iThink signals are low-frequency (weekly or less); complexity of WebSockets far exceeds value; CM checks the dashboard on their own schedule | Poll on page load; "last updated X min ago" timestamp is sufficient; no badge needs server push |
| Automated CM email alert on each webhook receipt | Proactive intervention feels better | Alert fatigue; CM must interpret signal in context; automated emails on each individual flag would be noisy and lose meaning quickly | Badge/count in nav or on institution list showing unresolved flags; CM pulls detail on demand |
| Live stats recomputed on every public page load for institution landing page | Always-fresh numbers feel right | At scale, per-request aggregate queries on `contributor_hours` + `circles` for a public unauthenticated endpoint create unnecessary load | Recompute via live aggregates in the handler at pilot scale (tens of contributors, infrequent page loads — this is a kiosk page, not a consumer homepage); add caching or refresh-on-write if load becomes an issue |
| Full circle resolution text in PDF | "Include everything" request | PDFs with full resolution bodies become unwieldy for funder reports; defeats the purpose of a summary | Include challenge count, completed count, total hours, wellbeing score band; exclude free-text resolution content |
| Institution hierarchy / sub-institutions | Some venues have branches | Scope creep; adds tree traversal logic, complicates stats roll-up, and no current use case justifies it | Flat model with `city` field is sufficient; named slugs distinguish branches (e.g., `leeds-central`, `leeds-north`) |
| Storing generated PDFs in S3 | Feels like the right infrastructure pattern | Reports must reflect current data; cached PDFs go stale the moment a contributor is added or an hour is logged; at pilot scale (one CM, a handful of institutions), on-demand generation is negligible cost | Generate on request, stream to response, discard. If email attachment is needed later, generate at send time |

---

## Feature Dependencies

```
[institution_id FK on contributors]
    └──enables──> [Live stats on landing page]
    └──enables──> [Contributor list per institution (CM)]
    └──enables──> [Institution-scoped wellbeing aggregate in PDF]
    └──enables──> [ithink_attention_flags — institution FK resolution]
    └──required-before──> all other institution features

[Institution CRUD (create/edit/toggle)]
    └──builds-on──> existing institutions table (no schema changes for CRUD itself)
    └──required-before──> institution-contributor assignment UI

[iThink webhook receiver]
    └──requires──> [webhook_deliveries dedup table]
    └──requires──> [ithink_attention_flags table]
    └──requires──> [institution_id FK] (to verify contributor-institution relationship)
    └──enables──> [CM attention view — flag data]

[ithink_attention_flags table]
    └──requires──> [institution_id FK on contributors]
    └──enables──> [CM attention view]
    └──enables──> [Attention signal history]

[PDF impact report]
    └──requires──> [institution_id FK on contributors] (for contributor count and hours)
    └──requires──> [pdfkit added to server deps]
    └──enhanced-by──> [Institution-scoped wellbeing aggregate]
    └──independent-of──> webhook integration and attention view

[Live stats on landing page]
    └──requires──> [institution_id FK on contributors]
    └──conflicts-with──> [caching generated stats in statsJson on every public load] — use live aggregates at pilot scale
```

### Dependency Notes

- **`institution_id` FK is the central dependency.** Every downstream feature (stats, wellbeing aggregate, attention cohort, PDF headcount) depends on knowing which contributors belong to which institution. This must be the first migration to run.
- **Webhook receiver requires the flag table and the FK.** The receiver has nowhere to write without `ithink_attention_flags`, and cannot verify contributor-institution relationships without the FK.
- **PDF report can ship without wellbeing aggregate.** The basic version (hours, challenges, headcount) is independent; wellbeing aggregate is an enhancement deferred to v1.2.x.
- **Institution CRUD does not require new schema.** `institutions` table already has all needed columns for create/edit/toggle; only the FK column is new schema.
- **Attention view cannot be meaningfully built before the webhook receiver exists.** The UI has no test data until at least a test webhook has been received.

---

## MVP Definition for v1.2

### Launch With (v1.2 core)

Minimum viable set to deliver the milestone's stated value.

- [ ] `institution_id` FK on `contributors` + Drizzle schema update — without this, everything else is blocked
- [ ] Live stats aggregates replacing static `statsJson` in `GET /api/institutions/:slug` — fixes stale kiosk landing page
- [ ] Institution list + create/edit/activate/deactivate endpoints and CM page — CM operational control
- [ ] Contributor assignment and removal endpoints and CM UI (assign/remove contributors from institutions)
- [ ] iThink webhook receiver with HMAC-SHA256 verification, timestamp window, idempotency, Zod payload validation, contributor-institution relationship check
- [ ] `ithink_attention_flags` table and `webhook_deliveries` dedup table
- [ ] CM attention view with institution filter and "Clear after follow-up" action
- [ ] PDF impact report (basic: headcount, challenges, hours, date range) — funder-facing deliverable

### Add After Validation (v1.2.x)

- [ ] Wellbeing aggregate in PDF — requires privacy threshold logic (min 5 contributors with check-ins); add once basic PDF is shipping and used
- [ ] Attention signal history view — add once CM is using the attention view and confirms value
- [ ] Webhook secret rotation UI — add before handing credentials to iThink team for production

### Future Consideration (v2+)

- [ ] Contributor-level wellbeing data visible to CM (GDPR impact assessment required first — this is special category data)
- [ ] PDF scheduling / auto-delivery to institution contact email
- [ ] Institution portal login (institutions access their own data without CM mediation)

---

## Feature Prioritization Matrix

| Feature | CM Value | Implementation Cost | Priority |
|---------|----------|---------------------|----------|
| `institution_id` FK on contributors | HIGH | MEDIUM | P1 |
| Live stats aggregation | HIGH | LOW | P1 |
| Institution CRUD + CM list page | HIGH | LOW | P1 |
| Contributor assignment UI | HIGH | LOW | P1 |
| iThink webhook receiver | HIGH | MEDIUM | P1 |
| `ithink_attention_flags` + `webhook_deliveries` tables | HIGH | LOW | P1 |
| CM attention view | HIGH | MEDIUM | P1 |
| PDF impact report (basic) | HIGH | HIGH | P1 |
| Attention signal history | MEDIUM | LOW | P2 |
| Wellbeing aggregate in PDF | MEDIUM | HIGH | P2 |
| Webhook secret rotation UI | LOW | LOW | P2 |
| Per-contributor iThink details beyond signal type | HIGH (perceived) | LOW (build cost) | DO NOT BUILD |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add when P1 is stable
- DO NOT BUILD: Anti-feature — conflicts with platform values or creates GDPR risk

---

## Implementation Notes by Feature Area

### Institution CRUD

- Slug: auto-generate from `name` on creation (`slugify(name)`); treat as immutable after first set — changing slug breaks existing kiosk QR codes. Admin can override at creation if auto-generate conflicts.
- Live stats: replace `statsJson` reads in `GET /api/institutions/:slug` handler with three Drizzle queries (contributor count, challenge count via circle_members JOIN, hours SUM). At pilot scale, live queries are always correct and cheap.
- CM role can manage institutions. Admin can manage all. Contributors cannot see this UI.
- Route pattern: `GET /api/institutions` (CM list), `PUT /api/institutions/:slug/contributors/:id` (assign), `DELETE /api/institutions/:slug/contributors/:id` (remove)

### institution_id FK Migration

Use the two-step PostgreSQL pattern to avoid a write-blocking table scan on a live `contributors` table:

```sql
-- Step 1: add column NOT VALID (no backfill scan, no write lock)
ALTER TABLE contributors ADD COLUMN institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL NOT VALID;
CREATE INDEX CONCURRENTLY idx_contributors_institution_id ON contributors(institution_id);

-- Step 2: validate existing rows (read lock only, non-blocking for writes)
ALTER TABLE contributors VALIDATE CONSTRAINT contributors_institution_id_fkey;
```

Do NOT use drizzle-kit generated migration output for this — write the SQL manually as a script in `packages/server/scripts/`, following the established manual migration pattern from Phase 9 and Phase 10.

### iThink Webhook Receiver

- Endpoint: `POST /api/webhooks/ithink`
- Auth: HMAC-SHA256 on raw request body; shared secret stored in env var `ITHINK_WEBHOOK_SECRET` (no fallback — server must not start without it)
- Raw body: `express.raw({ type: 'application/json' })` registered before `app.use(express.json())` in `express-app.ts` — exact same pattern as existing Stripe route
- Timestamp header required (`X-Webhook-Timestamp`); reject if `|server_time - timestamp| > 300s` (replay protection)
- Signature comparison: `crypto.timingSafeEqual` — never `===` on HMAC hex strings (timing attack vector)
- Dedup: INSERT into `webhook_deliveries(delivery_id, source, received_at)` with unique constraint on `delivery_id`; catch PG 23505 unique violation and return HTTP 200 (idempotent acknowledgement); do not process further
- Payload shape (agreed iThink-IU contract):
  ```typescript
  {
    deliveryId: string;         // UUID, unique per webhook delivery
    event: "attention_flag";
    institutionSlug: string;    // matches IU institutions.slug
    contributorEmail: string;   // used by IU to look up contributor
    signalType: string;         // e.g. "high_concern", "needs_checkin"
    screeningCompletedAt: string; // ISO 8601
  }
  ```
- Validate with Zod; any schema mismatch → 400 (not 200) — this signals iThink to fix the payload, not retry
- After dedup check: query `contributors` by email to resolve `contributor_id`; query `institutions` by slug to resolve `institution_id`; verify `contributors.institution_id = institution.id` (relationship check — prevents spoofed payloads inserting flags for contributors not at the claimed institution)
- If contributor not found: return 200 `{ received: true, matched: false }`; log `rawPayload` for manual investigation; do not insert flag
- Return 200 immediately after successful flag insert; do not block on downstream processing

### PDF Impact Report

- Library: `pdfkit ^0.18.0` (pure Node.js, no headless browser, ESM-compatible, streams to Express response via `doc.pipe(res)`)
- Do NOT use `@react-pdf/renderer` — active open GitHub issues #2624, #2907, #3017 report ESM packaging failures in `"type": "module"` Node.js setups; this project's server package is ESM-first with `tsx`. See STACK.md for full comparison.
- Route: `GET /api/institutions/:slug/report.pdf` — CM/admin JWT auth required
- Query params: `from` and `to` date range (default: past 90 days)
- Content: institution name, city, date range, total linked contributors, active contributors (logged hours in period), total hours, total challenges participated in, wellbeing band (if >= 5 contributors have check-ins in period; otherwise omit with note)
- Streaming: `res.setHeader('Content-Type', 'application/pdf')`, `res.setHeader('Content-Disposition', 'attachment; filename="[slug]-impact-report-[date].pdf"')`, then `doc.pipe(res)` — do not buffer the full PDF in memory
- Set `req.setTimeout(30_000)` on the route — protect against slow generation on large datasets
- Do not store generated PDFs — generate on demand; no S3 needed for this feature
- Empty-state guard: if institution has zero linked contributors, return a minimal "No activity in this period" PDF rather than crashing on null/undefined aggregates
- PDF component lives in `packages/server/src/pdf/institution-report.ts` — server-only; never imported by the web bundle

### CM Attention View

- Route: `/attention` (new protected React route, CM role only)
- API: `GET /api/attention?institutionSlug=...` + `POST /api/attention/:flagId/resolve`
- Institution scope: ALWAYS resolve the CM's institution from the DB on every request — never trust a JWT claim for the scope filter. Cross-institution data leakage is a GDPR-adjacent breach risk.
- Data source: `ithink_attention_flags` JOIN `contributors` JOIN `institutions` WHERE `resolved_at IS NULL`; ordered by `received_at DESC`; limited to last 30 unresolved flags per institution
- Display per flag: contributor name, institution name, signal type (human-readable label), age ("3 days ago"), "Clear after follow-up" action button
- Confirm step required before clearing — prevent accidental flag dismissal
- On resolve: `UPDATE ithink_attention_flags SET resolved_at = NOW(), resolved_by = $cmContributorId`; TanStack Query invalidation on success removes the row from the list
- Badge count: show unresolved flag count on institution list page (count of `ithink_attention_flags WHERE resolved_at IS NULL` per institution)

---

## Sources

- Codebase audit: `packages/server/src/db/schema.ts`, `routes/institutions.ts`, `routes/wellbeing.ts`, `routes/vantage.ts`, `middleware/api-key-auth.ts`, `express-app.ts`
- [pdfkit GitHub releases](https://github.com/foliojs/pdfkit/releases) — v0.18.0 published March 15, 2026; ESM entry point confirmed (HIGH)
- [react-pdf GitHub issue #2624](https://github.com/diegomura/react-pdf/issues/2624), [#2907](https://github.com/diegomura/react-pdf/issues/2907), [#3017](https://github.com/diegomura/react-pdf/issues/3017) — ESM breakage confirmed open March 2026 (HIGH — reasons to avoid @react-pdf/renderer)
- [Hookdeck: Implement Webhook Idempotency](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency) — dedup table pattern
- [standard-webhooks specification](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) — HMAC-SHA256 + timestamp replay prevention
- [GitHub: Validating Webhook Deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) — `timingSafeEqual` pattern
- [PostgreSQL ALTER TABLE docs](https://www.postgresql.org/docs/current/sql-altertable.html) — NOT VALID / VALIDATE CONSTRAINT two-step pattern for live tables
- [Webhook Signature Verification patterns](https://apidog.com/blog/webhook-signature-verification/) — raw body verification requirement
- [PDF generation libraries comparison 2025/2026](https://www.nutrient.io/blog/top-js-pdf-libraries/) — pdfkit for programmatic data reports vs puppeteer vs react-pdf

---
*Feature research for: Indomitable Unity v1.2 — Institution Management & iThink Integration*
*Researched: 2026-03-21*
