# Project Research Summary

**Project:** Indomitable Unity v1.2
**Domain:** Social enterprise platform — CM-facing operational tooling (institution management, PDF impact reports, iThink webhook integration, CM attention dashboard)
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

Indomitable Unity v1.2 adds a CM operational layer on top of a mature v1.1 platform. The core work is four interconnected feature clusters: institution management (CRUD and contributor-institution linkage), an iThink webhook integration (signed inbound webhooks that surface cohort-level wellbeing attention signals), a CM attention dashboard (actionable view of those signals), and an on-demand PDF impact report for funders. The codebase already has the institutions table, HMAC-SHA256 API key infrastructure, a Stripe webhook receiver pattern, and CM role middleware — v1.2 builds on all of these rather than introducing new architectural patterns.

The recommended approach is to add a single nullable FK (`institution_id`) on the `contributors` table and build upward from there. All other v1.2 features depend on knowing which contributor belongs to which institution: the live stats replace static seeded JSONB, the webhook receiver resolves contributors by email against their institution, the attention dashboard scopes flags by the CM's institution, and the PDF report aggregates contributors linked to a given institution. Stack additions are minimal: `pdfkit ^0.18.0` for server-side PDF streaming, and `react-native-quick-crypto ^1.0.17` in iThink for HMAC signing of outbound webhooks. No new architectural patterns are required.

The key risks are concentrated in the webhook integration and the FK migration. The FK must use PostgreSQL's `NOT VALID` / `VALIDATE CONSTRAINT` two-step pattern to avoid a write-blocking table scan on a live `contributors` table. The webhook receiver must use `crypto.timingSafeEqual` (not `===`) for HMAC comparison, verify timestamps to prevent replay, store idempotency keys, validate all payloads with Zod, and confirm the contributor-institution relationship before writing any flag — skipping any of these is either exploitable or causes silent data corruption. The CM attention view must always filter flags by the CM's institution ID resolved from the database at request time, never from a JWT claim, to prevent cross-institution data leakage.

---

## Key Findings

### Recommended Stack

The v1.0/v1.1 stack (Node.js/TypeScript, Express 4, React 19/Vite 6, PostgreSQL/Drizzle ORM, Tailwind v4, TanStack Query, React Router 7, jose) is validated and unchanged. v1.2 adds two packages and leverages existing built-ins.

**Core additions:**

- **pdfkit ^0.18.0** — server-side PDF generation — pure Node.js, ships ESM entry point (`js/pdfkit.es.js`), streams directly to Express response via `doc.pipe(res)`, no headless browser required. Recommended over `@react-pdf/renderer` (active ESM/`__dirname` breakage in ESM-first Node setups: open issues #2624, #2907, #3017 as of March 2026) and Puppeteer (300MB Chromium binary, 2–5s cold start per render, unacceptable for synchronous downloads).
- **@types/pdfkit ^0.13.x** — TypeScript definitions for pdfkit (not bundled with the main package).
- **react-native-quick-crypto ^1.0.17** (iThink only) — HMAC-SHA256 signing for outbound iThink webhooks — Margelo's JSI-based `node:crypto` drop-in; required because `expo-crypto` does not expose `createHmac`. Requires bare Expo workflow (`expo prebuild`), does not work in Expo Go.
- **Node.js built-in `crypto`** — HMAC verification for incoming webhooks — already used for API key hashing; no new dependency.
- **`express.raw()`** — already in `express-app.ts` for Stripe; the exact same pattern applies to the iThink webhook route.

No new frontend libraries are needed in `packages/web`. The CM attention view and institution management UI use existing recharts, TanStack Query, and Tailwind v4.

See `.planning/research/STACK.md` for full alternatives analysis and version compatibility matrix.

### Expected Features

**Must have (table stakes for v1.2 launch):**

- Institution-contributor link table (`institution_id` FK on `contributors`) — central dependency; every other feature is blocked without it
- Institution list + create/edit/activate/deactivate (CM page and API endpoints) — CM operational control
- Live stats on institution landing page (replace static `statsJson` JSONB with aggregated live queries) — stale zeros are unacceptable once real contributors are assigned
- iThink webhook receiver with HMAC-SHA256 verification, timestamp window (5 min), idempotency dedup, Zod payload validation, and contributor-institution relationship check
- `ithink_attention_flags` table and `webhook_deliveries` idempotency table — schema must exist before webhook receiver is deployed
- CM attention view filtered to the CM's institution — actionable dashboard showing cohort-level signals from iThink
- PDF impact report (headcount, challenges, hours, date range) — funder-facing deliverable, generated on demand and streamed, never stored in S3

**Should have (v1.2.x after initial validation):**

- Wellbeing aggregate in PDF (privacy threshold: min 5 contributors with check-ins in period; omit band otherwise)
- Attention signal trend view (last N signals as list or mini-chart per institution)
- Webhook secret rotation UI (allow admin to rotate `ITHINK_WEBHOOK_SECRET` without downtime via a transition window)

**Defer (v2+):**

- Contributor-level wellbeing data visible to CM (GDPR impact assessment required first)
- PDF scheduling and auto-delivery to institution contact email
- Institution portal login (institutions access their own data without CM mediation)
- Institution hierarchy / sub-institutions (scope creep; flat model with `city` field is sufficient)

**Anti-features (do not build):**

- Per-contributor iThink flags in the CM view — destroys the privacy-first contract; iThink sends cohort aggregates only; exposing individual flags creates GDPR special-category risk
- Real-time webhook-to-CM dashboard push via WebSockets — signals are low-frequency; polling on page load is correct; WebSockets are premature optimisation here
- Automated CM alerts on each webhook receipt — alert fatigue; CM should pull on demand with a badge count in nav

See `.planning/research/FEATURES.md` for full feature dependency graph and prioritisation matrix.

### Architecture Approach

v1.2 follows the established server/web monorepo architecture with targeted, additive changes. The Express middleware chain already handles the critical webhook pattern: routes registered with `express.raw()` before `app.use(express.json())`, following the existing Stripe webhook mount. All new CM routes use `authMiddleware + requireRole("community_manager")` — no new middleware needed. The PDF component lives in `packages/server/src/pdf/` as a server-only concern, never imported into the web bundle. iThink remains a separate system that gains outbound webhook capability via a new `webhook.service.ts` with fire-and-forget dispatch semantics.

**Major components:**

1. **DB migrations** — `institution_id` FK on `contributors` (NOT VALID / VALIDATE pattern); `ithink_attention_flags` table with partial index on unresolved rows; `webhook_deliveries` idempotency table
2. **Institution management** (`routes/institutions.ts` extended) — CM CRUD, contributor assignment, live stats aggregation replacing `statsJson` reads in `GET /api/institutions/:slug`
3. **Webhook receiver** (`routes/webhooks.ts` new) — HMAC verification, timestamp window, idempotency check, Zod validation, relationship verification, flag insertion; mounted before `express.json()` in `express-app.ts`
4. **PDF report route** (`routes/institutions.ts` extended) — aggregates 4 Drizzle queries, renders via pdfkit `doc.pipe(res)`, both `Content-Type` and `Content-Disposition` headers set
5. **Attention routes** (`routes/attention.ts` new) — lists unresolved flags scoped to the CM's institution (DB-resolved, not JWT); marks flags resolved
6. **CM attention dashboard** (`pages/attention/AttentionDashboard.tsx` new) — TanStack Query hooks, institution filter, confirm-before-resolve action
7. **iThink webhook dispatch** (`src/services/webhook.service.ts` in iThink repo) — HMAC signing via react-native-quick-crypto, fire-and-forget from screening handler

**Recommended build order:** DB migrations → live stats aggregation → CM institution management → webhook receiver (IU) → webhook dispatch (iThink) → CM attention view → PDF report.

See `.planning/research/ARCHITECTURE.md` for complete data flow diagrams, file-level change inventory, SQL schemas, and code patterns.

### Critical Pitfalls

1. **FK migration without `NOT VALID`** — plain `ALTER TABLE contributors ADD COLUMN institution_id UUID REFERENCES institutions(id)` performs a full table scan with write-blocking lock on a live table. Use the two-step `ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT` pattern. Write the migration as a named manual SQL script; do not rely on drizzle-kit generated output.

2. **String `===` for HMAC webhook signature comparison** — timing attack allows incremental secret reconstruction. Use `crypto.timingSafeEqual` with Buffer comparison — the pattern is already in `api-key-auth.ts`; copy it exactly. Never compare HMAC hex strings with `===`.

3. **No timestamp window or idempotency check on webhook receiver** — a valid replayed webhook creates duplicate attention flags or resurfaces resolved ones. Reject requests where `|server_time - webhook_timestamp| > 300s`; store processed `delivery_id` values in `webhook_deliveries` with a unique constraint before inserting any flag.

4. **CM attention view without institution scope filter** — a query without `WHERE institution_id = cmInstitution` exposes contributor attention status to CMs at unrelated institutions. Resolve the CM's institution from the DB on every request (not from JWT). This is a GDPR-adjacent data leakage risk — recovery cost is HIGH (breach assessment, contributor notification).

5. **PDF generation blocking the Express event loop** — synchronous pdfkit layout blocks all concurrent requests for 2–10s on realistic datasets. Stream to response via `doc.pipe(res)` rather than buffering. Set `req.setTimeout(30_000)`. Test with a realistic dataset (50+ contributors), not a toy fixture of 1–2 records.

6. **iThink webhook secret in git** — add `ITHINK_WEBHOOK_SECRET` to `getEnv()` with no fallback; server must not start without it. Verify `.gitignore` before writing any webhook code.

7. **Caller-supplied contributor/institution IDs not verified** — a signed payload only proves it came from a system holding the secret; it does not prove the claimed IDs represent a real relationship. After signature passes, query the DB to confirm `contributors.institution_id = payload.institutionId` before writing any flag.

See `.planning/research/PITFALLS.md` for full prevention patterns, warning signs, the "Looks Done But Isn't" test checklist, and recovery strategies.

---

## Implications for Roadmap

The feature dependency graph is unambiguous: the `institution_id` FK is the anchor for everything. The webhook integration has four distinct security layers that must all be present before go-live. The PDF report is self-contained and can be last. This suggests four phases with a clear build order.

### Phase 1: Institution Data Foundation

**Rationale:** Every v1.2 feature depends on knowing which contributor belongs to which institution. This is a hard data dependency, not a preferred ordering. The FK migration must run and be verified before any route, UI, or downstream feature touches institution-contributor relationships. Live stats migration is included here because it uses the same FK column and must be deployed before the institution landing page can serve accurate data.

**Delivers:** `institution_id` FK on `contributors` (NOT VALID + VALIDATE migrations); Drizzle schema updated; live aggregate stats replacing `statsJson` reads in `GET /api/institutions/:slug`; CM institution list, create, edit, activate/deactivate endpoints; institution-contributor assignment and removal endpoints and UI; CM institution management page.

**Addresses:** Institution list view, create/edit form, activate/deactivate toggle, contributor-institution link management, live stats (all P1 table-stakes features from FEATURES.md).

**Avoids:** FK table lock pitfall (NOT VALID migration reviewed as SQL before execution); stale JSONB stats pitfall (deploy live aggregation alongside `statsJson` field, verify parity against known seed values, cut over, never remove `statsJson` in the same deploy).

**Research flag:** Standard patterns — no phase-specific research needed. Migration pattern, route structure, and TanStack Query hooks all follow established v1.1 conventions.

---

### Phase 2: iThink Webhook Integration

**Rationale:** The webhook receiver has five distinct security requirements that must all be in place before the endpoint is exposed. Making this a dedicated phase keeps the security checklist reviewable independently and allows the IU receiver to be tested with curl before iThink is modified. iThink dispatch changes are included here because they are useless without an IU receiver to accept them — the two sides must be co-developed and integration-tested together.

**Delivers:** `ithink_attention_flags` table; `webhook_deliveries` idempotency table; `ITHINK_WEBHOOK_SECRET` in `getEnv()` with no fallback; `POST /api/webhooks/ithink` receiver with full security stack (raw body, timingSafeEqual, timestamp window, idempotency, Zod, relationship check); iThink-side `webhook_configs` SQLite table; CM config routes in iThink; `webhook.service.ts` with HMAC signing via react-native-quick-crypto; fire-and-forget dispatch from iThink screening handler.

**Addresses:** iThink webhook receiver endpoint, webhook event log/dedup, wellbeing signal storage (all P1 features from FEATURES.md).

**Avoids:** Timing attack (timingSafeEqual), replay attack (timestamp window + idempotency), schema drift (Zod validation on every payload), cross-institution spoofing (relationship check before any DB write), secret in git (no-fallback env var, gitignore verified before coding), raw-body mis-ordering (register before `express.json()`).

**Research flag:** Patterns are well-documented (Stripe, GitHub, Svix all use HMAC-SHA256 + timestamp). The implementation has multiple layers that are individually simple and collectively easy to get partially wrong. The "Looks Done But Isn't" checklist from PITFALLS.md should be explicit acceptance criteria for phase sign-off — all 12 checklist items must pass before this phase closes.

---

### Phase 3: CM Attention Dashboard

**Rationale:** This phase consumes flags written by Phase 2. It cannot be built meaningfully before the webhook receiver exists and has written test data. It is also the phase with the highest data-privacy risk (cross-institution leakage) — placing it in its own phase keeps the institution-scope filter review focused and independent.

**Delivers:** `GET /api/attention` and `POST /api/attention/:flagId/resolve` routes; `AttentionDashboard.tsx` React page; `useAttention.ts` TanStack Query hooks; `/attention` protected route in `App.tsx`; institution filter UI; confirm-before-resolve action with human-readable flag descriptions; badge count on institution list showing signals in last 30 days.

**Addresses:** CM attention view (P1), attention signal trend as a list of last 30 signals ordered by recency (P2 from FEATURES.md).

**Avoids:** Cross-institution data leakage (DB-resolved institution scope on every query, never from JWT); N+1 query (single JOIN across `attention_flags`, `contributors`, `institutions`); raw severity codes in UI (human-readable labels); no-confirmation clear action (confirm step required).

**Research flag:** Standard patterns — no additional research needed. TanStack Query invalidation on resolve, institution filter as a query param, and protected route with `requireRole("community_manager")` all follow existing v1.1 conventions exactly.

---

### Phase 4: PDF Impact Report

**Rationale:** The PDF report depends on Phase 1 institution-contributor data but is independent of the webhook integration and attention dashboard. Placing it last keeps it self-contained, avoids coupling its scope to the more complex webhook work, and lets the Phase 1 aggregate queries be proven correct before the PDF reuses them. It is also the highest implementation-effort single feature and benefits from the rest of the platform being stable.

**Delivers:** `pdfkit ^0.18.0` and `@types/pdfkit` added to server dependencies; `packages/server/src/pdf/institution-report.ts` pdfkit document component (server-only isolation); `GET /api/institutions/:slug/report.pdf` route (CM auth, streaming via `doc.pipe(res)`, both `Content-Type: application/pdf` and `Content-Disposition: attachment` headers); empty-state handling for zero-contributor institutions; `req.setTimeout(30_000)` on the route; "Generating report..." loading state and disabled button in the CM UI.

**Addresses:** PDF impact report — basic version (headcount, challenges, hours, date range) as P1. Wellbeing aggregate in PDF deferred to v1.2.x — privacy threshold logic adds scope; basic report ships first.

**Avoids:** PDF blocking event loop (streaming, not buffering; tested with realistic dataset); PDF component in wrong package (server-only in `packages/server/src/pdf/`, never imported by web bundle); missing `Content-Disposition` header (set alongside `Content-Type`; without it, mobile browsers render inline and break); PDF endpoint accessible to contributors (`requireRole("community_manager")` guard verified with a 403 integration test); PDF for zero-contributor institution crashing (explicit empty-state guard before generation begins).

**Research flag:** The `@react-pdf/renderer` vs `pdfkit` decision is resolved — use pdfkit. FEATURES.md references `@react-pdf/renderer` but STACK.md explicitly rejects it for this ESM-first monorepo due to active open issues. If the roadmapper or implementer sees `@react-pdf/renderer` in FEATURES.md, defer to STACK.md. No additional research needed.

---

### Phase Ordering Rationale

- **Phase 1 before all others** — the `institution_id` FK is a hard data dependency; all downstream features require it.
- **Phase 2 before Phase 3** — the attention dashboard is useless without flags to display; building the receiver first allows end-to-end testing with curl before the UI exists.
- **Phase 4 last** — PDF depends only on Phase 1 data; deferring it keeps each phase scope clean and allows Phase 1 aggregate queries to be proven before reuse.
- **iThink work co-located in Phase 2** — both sides of the integration must be coordinated for end-to-end testing; placing them in the same phase makes the integration test the phase gate.
- **No phase restructuring** — this is an additive milestone; none of the four phases touch each other's code surfaces, making parallel sub-tracks possible within a phase but not required.

### Research Flags

Phases needing careful review during planning (not additional research, but explicit acceptance criteria):

- **Phase 2 (Webhook Integration):** Security-critical implementation. The "Looks Done But Isn't" checklist from PITFALLS.md (12 items covering signature, raw body, replay, idempotency, relationship check, CM scope, PDF auth, PDF empty state, payload validation, stats parity) should be copied verbatim into the phase plan as acceptance criteria. All 12 must pass before phase closes.

Phases with standard patterns (skip `/gsd:research-phase`):

- **Phase 1 (Institution Foundation):** Migration pattern (NOT VALID), route extension, TanStack Query hooks — all established v1.1 conventions.
- **Phase 3 (CM Attention Dashboard):** Protected route, TanStack Query invalidation on mutation, institution-scoped query — identical to existing CM route patterns.
- **Phase 4 (PDF Report):** pdfkit streaming pattern is well-documented; stack decision is already made in STACK.md.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | v1.0/v1.1 stack validated. pdfkit v0.18.0 verified against official GitHub release (March 15, 2026). react-native-quick-crypto v1.0.17 verified against margelo GitHub release (March 17, 2026) and implementation coverage doc. @react-pdf/renderer rejection backed by 3 open GitHub issues confirmed open March 2026. |
| Features | HIGH | Grounded in direct codebase audit of `packages/server/src/db/schema.ts`, all existing route files, and `.planning/PROJECT.md`. Feature dependencies derived from actual schema relationships, not inference. |
| Architecture | HIGH (IU), MEDIUM (iThink) | IU architecture: direct codebase inspection of all server and web source files. Build order and file-change inventory are concrete. iThink architecture: described from project context, not directly inspectable — exact file paths in iThink repo are estimates. |
| Pitfalls | HIGH | All 8 critical pitfalls grounded in the actual codebase (existing `api-key-auth.ts` timingSafeEqual pattern, Stripe webhook mount in `express-app.ts`, `statsJson` JSONB in institutions table). PostgreSQL FK NOT VALID pattern backed by official docs and multiple independent sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **iThink exact file paths:** ARCHITECTURE.md specifies iThink file changes from project description, not direct inspection. Confirm actual file structure in the iThink repo before Phase 2 planning begins.
- **iThink webhook payload contract:** The payload shape (`contributorEmail`, `institutionSlug`, `signalType`, `cohortSize`, `flaggedCount`) is defined in FEATURES.md based on the privacy-first design constraint (cohort-level only, no per-contributor IDs). This must be agreed and documented as a formal contract with the iThink side before Phase 2 begins. Any deviation in field names or types will cause the Zod schema to reject valid webhooks.
- **Wellbeing aggregate privacy threshold:** FEATURES.md specifies "min 5 contributors with check-ins in period" as the display threshold for the PDF wellbeing band. This is a design decision, not a researched standard — validate with stakeholders before implementing in Phase 4 or v1.2.x.
- **`@types/pdfkit` version alignment:** At install time, confirm `@types/pdfkit` version tracks pdfkit 0.18.0 API surface. DefinitelyTyped may lag slightly behind the latest pdfkit release for newer features.

---

## Sources

### Primary (HIGH confidence)

- Codebase direct inspection — `packages/server/src/db/schema.ts`, `routes/institutions.ts`, `routes/payments.ts`, `middleware/api-key-auth.ts`, `config/env.ts`, `express-app.ts`, `scripts/`
- [foliojs/pdfkit releases](https://github.com/foliojs/pdfkit/releases) — v0.18.0 published March 15, 2026; ESM entry point confirmed
- [margelo/react-native-quick-crypto](https://github.com/margelo/react-native-quick-crypto) — v1.0.17 published March 17, 2026; `createHmac` + `Hmac.digest()` confirmed in implementation coverage doc
- [expo-crypto docs](https://docs.expo.dev/versions/latest/sdk/crypto/) — no HMAC support confirmed
- [react-pdf issue #2624](https://github.com/diegomura/react-pdf/issues/2624), [#2907](https://github.com/diegomura/react-pdf/issues/2907), [#3017](https://github.com/diegomura/react-pdf/issues/3017) — ESM breakage in modern Node.js confirmed open March 2026
- [PostgreSQL ALTER TABLE docs](https://www.postgresql.org/docs/current/sql-altertable.html) — NOT VALID / VALIDATE CONSTRAINT pattern
- [standard-webhooks spec](https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md) — HMAC-SHA256 + timestamp replay prevention standard
- [GitHub: Validating Webhook Deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries) — timingSafeEqual pattern
- [Hookdeck: Webhook Idempotency](https://hookdeck.com/docs/guides/deduplication-guide) — dedup table pattern
- [stripe-node issue #734](https://github.com/stripe/stripe-node/issues/734) — express.raw() before express.json() pattern (already in IU codebase for Stripe)

### Secondary (MEDIUM confidence)

- WebSearch: pdfkit vs @react-pdf/renderer vs puppeteer comparison 2025/2026 — multiple sources confirm pdfkit for programmatic data reports, puppeteer for HTML-to-PDF, react-pdf for React component layouts
- WebSearch: multi-tenant Drizzle ORM patterns — row-based `institution_id` approach confirmed for small tenant counts
- [Hookdeck HMAC SHA256 guide](https://hookdeck.com/webhooks/guides/how-to-implement-sha256-webhook-signature-verification) — Express raw body pattern
- [Webhook Signature Verification patterns — Svix](https://www.svix.com/resources/webhook-best-practices/security/)

### Tertiary (LOW confidence)

- iThink architecture file paths — specced from project description; not directly inspectable. Validate against actual iThink repo before Phase 2 planning.

---

*Research completed: 2026-03-21*
*Ready for roadmap: yes*
