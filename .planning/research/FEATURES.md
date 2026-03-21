# Feature Research

**Domain:** CM-facing operational tooling — institution management, PDF impact reports, webhook wellbeing integration, attention dashboards
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
| Institution-contributor link management | CM maps which contributors are associated with which institution; basis for live stats and iThink cohorts | MEDIUM | Requires new `institution_contributors` join table; FK to both tables |
| Live stats on institution landing page | `statsJson` is currently seeded/static — landing page shows stale numbers | MEDIUM | Derive counts from `institution_contributors` + `circles`/`contributorHours` at query time, or keep a refresh mechanism; static JSONB is not acceptable post-v1.2 |
| Contributor list per institution (CM view) | CM must see who belongs to each institution cohort | LOW | Join query on `institution_contributors`; name + status + last check-in date |
| PDF impact report (institution-level) | Institutions need a printable summary to share with funders or boards | HIGH | Requires `@react-pdf/renderer` server-side; data aggregated from contributor hours, challenges, wellbeing trends |
| iThink webhook receiver endpoint | iThink app must be able to push "needs attention" signals; no integration currently exists | MEDIUM | New `POST /api/webhooks/ithink` route; HMAC-SHA256 signature verification; idempotency via event log table |
| Webhook event log / dedup table | Replaying webhooks from iThink must not double-count signals | MEDIUM | `webhook_events` table with `event_id` unique constraint; catch PG error 23505 |
| CM attention view | CM needs a single view showing which institution cohort members have been flagged by iThink | MEDIUM | Reads from `institution_attention_signals` table populated by webhook receiver; filters by institution |
| Wellbeing signal storage | iThink pushes institution-level cohort signals, not per-contributor; must store signal metadata with institution FK | LOW | New `institution_attention_signals` table: `id`, `institutionId`, `eventId`, `signalType`, `cohortSize`, `flaggedCount`, `receivedAt`, `rawPayload` |

### Differentiators (Competitive Advantage)

Features that distinguish this platform's operational tooling from generic admin panels.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Privacy-preserving attention signals | iThink does NOT send individual contributor IDs — only institution-level cohort aggregates; CM sees "6 of 18 flagged" not who | LOW (design constraint, not code) | Must be enforced at the webhook schema level; document this contract explicitly; do not add per-contributor FK to `institution_attention_signals` |
| PDF report styled to platform brand | Funders expect professional output, not a data dump; report includes institution name, date range, challenge count, hours, wellbeing trajectory summary | MEDIUM | Use `@react-pdf/renderer` server-side with consistent Indomitable Unity styling; render via Express route `GET /api/institutions/:id/report.pdf` |
| Attention signal trend (not just latest) | CM wants to see if the cohort is improving or worsening over time, not just the current snapshot | LOW | Store all signals with timestamps; CM view shows last N signals as a simple list or mini-chart |
| Institution-scoped wellbeing aggregate | Wellbeing data from contributors linked to an institution can be rolled up anonymously (min 5 contributors to display) for institution-level trend in the PDF | HIGH | Privacy threshold required; must aggregate without revealing individual scores; flag as requires phase-specific research |
| Webhook secret rotation UI | Allow admin to rotate the shared secret used for iThink HMAC verification without downtime | LOW | Store `webhookSecrets` per institution or globally; admin PATCH endpoint; iThink side supports transition window |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-contributor iThink flags in CM view | Seems like useful detail for intervention | Destroys the privacy-first contract with contributors; iThink is explicitly privacy-first local processing; exposing individual flags creates GDPR special-category risk and would make contributors distrust the platform | Store only cohort-level signals; CM intervention is at institution cohort level, not individual |
| Real-time webhook-to-CM dashboard push (WebSockets) | Seems snappy | Complexity far exceeds value; iThink signals are low-frequency (weekly/bi-weekly); CM checks the dashboard on their own schedule; adding WebSockets for this would be premature | Poll on page load; CM refreshes or sees "last updated X min ago" |
| Automated CM alerts on iThink signal receipt | Proactive feels better | Creates alert fatigue; CM must interpret signal in context; automated emails on each webhook would be noisy | CM sees badge/count in nav or on institution list; pulls detail on demand |
| Live stats recomputed on every page load for landing page | Always fresh feels right | At scale, per-request aggregate queries on `contributor_hours` + `circles` are expensive and visible to public (unauthenticated); caching or refresh-on-write is the right answer | Recompute `statsJson` on institution update or on a nightly cron; acceptable staleness for a public kiosk page |
| Full circle resolution text in PDF | "Include everything" request | PDFs with hundreds of resolution bodies become unwieldy for funder reports; defeats the purpose of a summary | Include challenge count, completed count, total hours, wellbeing score band; exclude free-text resolution content |
| Institution hierarchy / sub-institutions | Some venues have branches | Scope creep; adds tree traversal logic, complicates stats roll-up, and no current use case justifies it | Flat model with `city` field is sufficient; named slugs distinguish branches (e.g., `leeds-central`, `leeds-north`) |

---

## Feature Dependencies

```
[Institution-contributor link table]
    └──enables──> [Live stats on landing page]
    └──enables──> [Contributor list per institution (CM)]
    └──enables──> [Institution-scoped wellbeing aggregate in PDF]
    └──enables──> [CM attention view — cohort membership]

[iThink webhook receiver]
    └──requires──> [Webhook event log / dedup table]
    └──requires──> [institution_attention_signals table]
    └──enables──> [CM attention view — signal data]

[institution_attention_signals table]
    └──requires──> [Institution-contributor link table] (to know which institution the signal belongs to)
    └──enables──> [CM attention view]
    └──enables──> [Attention signal trend]

[PDF impact report]
    └──requires──> [Institution-contributor link table] (for contributor count)
    └──requires──> [@react-pdf/renderer added to server deps]
    └──enhanced-by──> [Institution-scoped wellbeing aggregate]

[Live stats on landing page]
    └──requires──> [Institution-contributor link table]
    └──conflicts-with──> [Real-time recompute on every public page load] — use refresh-on-write instead

[Institution CRUD (create/edit/toggle)]
    └──required-before──> all other institution features
    └──builds-on──> existing institutions table (no schema changes needed for CRUD itself)
```

### Dependency Notes

- **Institution-contributor link table is the central dependency.** Every downstream feature (stats, wellbeing aggregate, attention cohort) depends on knowing which contributors belong to which institution. This must ship first.
- **Webhook receiver requires the signal table.** The receiver has nowhere to write without `institution_attention_signals`. Schema migration precedes the route.
- **PDF report can ship without wellbeing aggregate.** The basic version (hours, challenges, headcount) is independent; wellbeing aggregate is an enhancement that can follow.
- **Institution CRUD does not require new schema.** `institutions` table already has all needed columns for create/edit/toggle; only the link table is new schema.

---

## MVP Definition for v1.2

### Launch With (v1.2 core)

Minimum viable set to deliver the milestone's stated value.

- [ ] Institution-contributor link table + CM management UI — without this, everything else is blocked
- [ ] Institution list + create/edit/toggle endpoints and CM page — CM operational control
- [ ] Live stats refresh (compute on link add/remove, store to statsJson) — fixes the stale kiosk landing page
- [ ] iThink webhook receiver with HMAC-SHA256 verification + dedup — the iThink integration
- [ ] `institution_attention_signals` table and CM attention view — the CM operational benefit of the iThink integration
- [ ] PDF impact report (basic: headcount, challenges, hours, date range) — funder-facing deliverable

### Add After Validation (v1.2.x)

- [ ] Wellbeing aggregate in PDF — requires privacy threshold logic; add once basic PDF is shipping
- [ ] Attention signal trend view — add once CM is using the attention view and confirms value
- [ ] Webhook secret rotation UI — add before handing credentials to iThink team for production

### Future Consideration (v2+)

- [ ] Contributor-level wellbeing aggregate visible to CM (opt-in, GDPR impact assessment required first)
- [ ] PDF scheduling / auto-delivery to institution contact email
- [ ] Institution portal login (institutions access their own data without CM mediation)

---

## Feature Prioritization Matrix

| Feature | CM Value | Implementation Cost | Priority |
|---------|----------|---------------------|----------|
| Institution-contributor link table | HIGH | MEDIUM | P1 |
| Institution CRUD + CM list page | HIGH | LOW | P1 |
| Live stats refresh | HIGH | LOW | P1 |
| iThink webhook receiver | HIGH | MEDIUM | P1 |
| institution_attention_signals table | HIGH | LOW | P1 |
| CM attention view | HIGH | MEDIUM | P1 |
| PDF impact report (basic) | HIGH | HIGH | P1 |
| Attention signal trend | MEDIUM | LOW | P2 |
| Wellbeing aggregate in PDF | MEDIUM | HIGH | P2 |
| Webhook secret rotation UI | LOW | LOW | P2 |
| Per-contributor iThink flags | HIGH (perceived) | LOW (build cost) | DO NOT BUILD |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add when P1 is stable
- DO NOT BUILD: Anti-feature — conflicts with platform values

---

## Implementation Notes by Feature Area

### Institution CRUD

- Slug: auto-generate from `name` on creation (`slugify(name)`); treat as immutable after first set (changing slug breaks existing kiosk QR codes). Admin can override if auto-generate conflicts.
- `statsJson` refresh: trigger recompute on institution-contributor link add/remove via a small SQL aggregation, write back to `statsJson`. Not a live query on the public endpoint.
- CM role can manage institutions. Admin can manage all. Contributors cannot see this UI.
- Route pattern: `GET/POST /api/admin/institutions`, `PUT /api/admin/institutions/:id`, `PATCH /api/admin/institutions/:id/status`

### Institution-Contributor Link Table

```sql
institution_contributors (
  id              uuid primary key,
  institution_id  uuid FK institutions.id ON DELETE CASCADE,
  contributor_id  uuid FK contributors.id ON DELETE CASCADE,
  linked_at       timestamptz DEFAULT now(),
  UNIQUE (institution_id, contributor_id)
)
```

No extra fields needed at this stage. A contributor can belong to multiple institutions (e.g., referred by two different libraries). CM adds/removes links via UI.

### iThink Webhook Receiver

- Endpoint: `POST /api/webhooks/ithink`
- Auth: HMAC-SHA256 on raw request body; shared secret stored in env var `ITHINK_WEBHOOK_SECRET`
- Timestamp header required; reject if > 5 minutes old (replay protection)
- Dedup: INSERT into `webhook_events(event_id, source, received_at, payload)` with unique constraint on `event_id`; catch PG 23505 unique violation and return HTTP 200 (idempotent acknowledgement)
- Payload shape (iThink contract): `{ event_id, institution_id, signal_type, cohort_size, flagged_count, timestamp }` — validated with Zod; any per-contributor field causes schema rejection
- After successful dedup check: INSERT into `institution_attention_signals`
- Return 200 immediately after dedup insert; process signal write asynchronously if needed

### PDF Impact Report

- Library: `@react-pdf/renderer` v4 server-side (supports Node.js 18+; fits existing stack; lighter than Puppeteer/headless Chrome; no extra infra needed)
- Route: `GET /api/admin/institutions/:id/report.pdf` — CM/admin JWT auth required
- Query params: `from` and `to` date range (default: past 90 days)
- Content: institution name, city, date range, total linked contributors, active contributors (logged hours in period), total hours, total challenges participated in, wellbeing band (if >= 5 contributors have check-ins in period, show aggregate band; otherwise omit with note)
- Streaming response: `res.setHeader('Content-Type', 'application/pdf')`, pipe `renderToStream(doc)` directly — do not buffer in memory
- Do not store PDFs — generate on demand; no S3 needed for this feature

### CM Attention View

- Route: `/cm/institutions/:id/attention` (new protected React route, CM role only)
- Data source: `institution_attention_signals` ordered by `receivedAt DESC`, limited to last 30 signals
- Display per signal: timestamp, `flaggedCount / cohortSize`, `signalType` label, age ("3 days ago")
- No individual contributor names anywhere in this view — cohort aggregate only
- Badge count on institution list: count of signals received in last 30 days per institution

---

## Sources

- Codebase audit: `packages/server/src/db/schema.ts`, `routes/institutions.ts`, `routes/wellbeing.ts`, `routes/vantage.ts`, `middleware/api-key-auth.ts`
- [@react-pdf/renderer npm](https://www.npmjs.com/package/@react-pdf/renderer) — v4.3.2, 860k weekly downloads, Node 18/20/21 tested (HIGH confidence)
- [react-pdf.org compatibility](https://react-pdf.org/compatibility) — server-side confirmed (HIGH confidence)
- [Prototyp Digital: Generating PDFs with React on the server](https://prototyp.digital/blog/generating-pdfs-with-react-on-the-server)
- [Hookdeck: Implement Webhook Idempotency](https://hookdeck.com/webhooks/guides/implement-webhook-idempotency)
- [Hookdeck: Deduplication Guide](https://hookdeck.com/docs/guides/deduplication-guide)
- [Webhook Signature Verification patterns](https://apidog.com/blog/webhook-signature-verification/)
- [Authgear: HMAC Signatures in Node.js](https://www.authgear.com/post/generate-verify-hmac-signatures)
- [PDF generation libraries comparison 2025](https://www.nutrient.io/blog/javascript-pdf-libraries/)

---
*Feature research for: Indomitable Unity v1.2 — Institution Management & iThink Integration*
*Researched: 2026-03-21*
