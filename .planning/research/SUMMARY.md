# Project Research Summary

**Project:** Indomitable Unity v1.3 — Enhanced Reporting & Institution Portal
**Domain:** Social enterprise platform — wellbeing aggregation, attention trends, PDF scheduling, institution portal
**Researched:** 2026-03-25
**Confidence:** HIGH (stack and architecture grounded in direct codebase inspection; pitfalls verified against official sources)

## Executive Summary

Indomitable Unity v1.3 extends an existing Express + PostgreSQL + Drizzle + pdfkit + Resend + node-cron stack with four additive features: anonymous wellbeing band aggregation in PDF reports, an attention signal trend chart for CMs, scheduled monthly PDF email delivery, and a read-only institution portal with its own auth role. The headline finding from stack research is that **no new runtime dependencies are required** — every capability needed is already installed. The build is additive, not architectural; the risk is in legal and privacy compliance, not in technology choices.

The recommended approach is a three-phase build ordered by dependency. Phase 15 (extending existing work) adds wellbeing aggregation to the PDF and a trend chart to the attention dashboard — both zero-schema-change features that verify end-to-end data quality before scheduling complexity is introduced. Phase 16a adds the PDF scheduling job and associated schema (two new columns on `institutions`, a `pdf_report_schedules` table). Phase 16b adds the institution portal, which carries the highest architectural risk: adding `institution_user` to the PostgreSQL role enum and creating a separate router with its own auth guard, distinct from the existing `adminRouter`.

The key risks are not technical. Three pre-build blockers must be resolved before code is written: (1) confirm a commercial WEMWBS licence with Warwick Innovations — sharing aggregated wellbeing data with institutions triggers the third-party licence requirement active since December 2024; (2) add an `institutional_reporting` consent purpose to the contributor consent flow — existing wellbeing check-in consent does not cover institutional disclosure under UK GDPR Art. 9; (3) decide the institution portal auth isolation strategy — whether to add `institution_user` to the existing role enum with a full route audit or to use a separate session namespace. These decisions gate the build; delaying them causes rewrites.

---

## Key Findings

### Recommended Stack

No new dependencies. Every feature maps cleanly to an already-installed library. The one housekeeping item is removing `@types/node-cron ^3.0.11` — node-cron v4 ships its own TypeScript types, and the DefinitelyTyped stub conflicts.

Three new DB tables are needed (schema-only, no library changes): `pdf_report_schedules` for tracking scheduled delivery configuration and `institution_user_assignments` for linking institution portal users to their institution. A `report_deliveries` audit log is deferred to v1.3.x.

**Core technologies:**
- **Drizzle ORM 0.38:** All aggregation queries — GROUP BY, HAVING, date_trunc — fully supported; PostgreSQL enum extension (ALTER TYPE) must run outside a transaction as a standalone script
- **pdfkit 0.18:** Existing `buildInstitutionReport` extended with optional wellbeing section; must remain stateless (no DB access inside PDF module)
- **node-cron 4.2.1:** Scheduled PDF delivery job mirrors existing `wellbeing-reminder.job.ts` pattern exactly; daily check at 06:00 UTC with `next_send_at` DB column deciding which institutions are due
- **Resend 4.1:** PDF attachment via Buffer — `content: Buffer` passed directly; 8 MB raw size cap before fallback to link delivery; do not use `.toString("base64")`
- **recharts 3.8:** Attention trend BarChart added as a new tab on `AttentionDashboard.tsx`; BarChart (not LineChart or AreaChart) because flag counts per week are categorical, not cumulative
- **jose 5.9 + argon2 0.41:** Institution portal reuses existing JWT cookie infrastructure with a new role; no second token-signing path

See `.planning/research/STACK.md` for full dependency analysis and cleanup requirements.

### Expected Features

**Must have (table stakes for v1.3 launch):**
- Wellbeing aggregate band in PDF — Low/Typical/High label + N count; suppress entirely if N below privacy threshold; use Rasch-transformed score, not raw integer, for band classification
- Attention trend chart on `AttentionDashboard` — weekly buckets, 12-week window, directional badge (Increasing/Stable/Decreasing); no new page or route
- `report_contact_email` + `report_schedule_enabled` columns on `institutions`; CM form to configure per institution
- Scheduled PDF email delivery job — monthly cron, Resend PDF attachment, batch error isolation per institution
- `institution_contact` (or `institution_user`) value added to `contributor_role` PostgreSQL enum via standalone migration
- `institutionRouter` with role guard, separate from `adminRouter`
- Institution portal overview stats (`GET /api/institution-portal/overview`)
- Institution portal PDF download (`GET /api/institution-portal/report.pdf`)
- Institution portal React page at `/institution-portal` or `/portal/dashboard`
- CM workflow to create institution portal accounts via existing admin UI

**Should have (differentiators):**
- Explicit privacy floor note in PDF ("Wellbeing data not shown: fewer than N contributors completed a check-in") — builds contributor trust, not just compliance
- Attention trend direction badge with colour (Increasing = amber, Stable/Decreasing = green — decreasing flags is positive)
- Per-institution scheduled delivery toggle enabling opt-in without removing the contact email
- `report_deliveries` audit log table — P2, add after initial validation

**Defer to v1.3.x / v2+:**
- Per-institution custom schedule cadence (beyond monthly)
- Trend chart hover tooltips with per-week flag details
- Wellbeing aggregate trend line across multiple periods in PDF
- Multi-institution portal accounts (one contact, multiple institutions)
- Institution contacts self-configuring report preferences

**Anti-features — do not build:**
- Per-contributor wellbeing data visible to institution contacts (GDPR Art. 9 — no individual consent for third-party disclosure)
- Exact WEMWBS mean score in PDF or portal (re-identification risk in small cohorts)
- Weekly/daily scheduled delivery (noise at pilot scale; monthly is the correct cadence)
- Real-time activity feed for institution portal (requires significant access expansion)
- Self-service institution portal account creation (breaks controlled CM onboarding model)

See `.planning/research/FEATURES.md` for full feature dependency graph, implementation notes, and prioritisation matrix.

### Architecture Approach

All four v1.3 features slot into the existing monorepo without new packages or services. The critical architectural constraint is keeping `buildInstitutionReport` stateless — a pure function that accepts `ReportData` and returns a pdfkit `PDFDocument`. All DB queries and privacy threshold decisions live in the route handler or job dispatcher; the PDF module never decides what the threshold is. The institution portal router must be separate from `adminRouter` (which globally blocks non-CM roles) and must resolve the actor's institution from the DB on every request, never from the JWT payload.

**Major components:**
1. **`pdf/institution-report.ts`** — Stateless PDF builder; extended with optional `wellbeing` field in `ReportData`; called by both streaming browser download and buffered email attachment paths
2. **`services/pdf-report.job.ts`** (new) — Daily cron at 06:00 UTC; queries `pdf_report_schedules WHERE is_active AND next_send_at <= now`; dispatches per institution with individual try/catch; updates timestamps after send
3. **`services/pdf-email.service.ts`** (new) — Buffers pdfkit stream for Resend attachment; the only place in the codebase where PDF output is buffered rather than streamed
4. **`routes/institution-portal.ts`** (new) — Separate router at `/api/institution-portal`; own role guard; resolves institution from `institution_user_assignments` on every request
5. **`pages/institution-portal/PortalDashboard.tsx`** (new) — Read-only; no resolve buttons, no contributor names, no attention flag details; shows institution stats, wellbeing band, PDF download

**Patterns to follow on every new route:**
- Resolve actor's institution from DB on every request — never from JWT (stale after reassignment, GDPR-adjacent leakage risk)
- Stream PDF to browser (`doc.pipe(res); doc.end()`); buffer for email (`doc.on("data")` → `Buffer.concat`)
- Register specific string paths before parameterised paths (`/attention/trends` before `/attention/:flagId/resolve`)
- Privacy threshold decision lives in route handler; PDF module receives `wellbeing: data | null`

See `.planning/research/ARCHITECTURE.md` for complete data flow diagrams, file inventory (new and modified), and anti-patterns.

### Critical Pitfalls

1. **WEMWBS commercial licence not obtained before institution-facing outputs** — Surfacing any aggregated wellbeing data (even band labels) to a third-party institution triggers Warwick Innovations' commercial licence requirement active since December 2024. Obtain licence before Phase 15 build starts, or strip all WEMWBS/SWEMWBS branding from institution-facing outputs and use generic "wellbeing score" language. Licence valid 12 months; must be renewed.

2. **Existing check-in consent does not cover institutional reporting** — UK GDPR Art. 9(2)(a) requires explicit consent specifying each purpose. Add `purpose: 'institutional_reporting'` to the consent flow. Only opted-in contributors' data feeds institution aggregations; the privacy threshold applies to the opted-in count, not total enrolled count.

3. **Institution portal role collision enabling cross-tenant data access** — Adding `institution_user` to the existing `contributors` table risks any missed auth guard exposing contributor-facing endpoints. Prevention: add explicit `userType` JWT claim and audit all existing routes, or use a fully separate session namespace. Integration-test by asserting 403 on all contributor routes when authenticated as institution_user.

4. **node-cron duplicate email delivery in multi-instance deployment** — node-cron fires independently per process; PM2 cluster mode causes N emails per trigger. Prevention: PostgreSQL advisory lock or `NODE_APP_INSTANCE=0` guard before each job run. Retrofit fix to existing `wellbeing-reminder.job.ts` in the same milestone.

5. **SWEMWBS Rasch transformation required before band classification** — `wemwbs_score` stores raw 7–35 integer sums. Bands must be derived from Rasch-transformed metric scores using the official 35-row lookup table from WEMWBS User Guide v2. Applying raw-integer thresholds directly produces clinically inaccurate bands.

See `.planning/research/PITFALLS.md` for full prevention patterns, detection strategies, and phase-specific warnings.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 15 (extend existing): Wellbeing Aggregation + Attention Trends

**Rationale:** Zero schema changes. Both features are additive modifications to existing files — the PDF route handler and the attention dashboard page. Build first to validate data quality and SWEMWBS Rasch logic before introducing scheduling complexity. If the WEMWBS licence is unresolved, this phase can still proceed using generic "wellbeing score" branding — a design decision, not a code blocker.

**Delivers:** CM sees attention trend direction at a glance via a new Trends tab; institution PDF reports include a wellbeing band section (or suppression note when cohort is below threshold).

**Addresses features:** Wellbeing aggregate band in PDF; attention trend BarChart with directional badge.

**Avoids:**
- Raw-score banding — apply Rasch transform before classifying (Pitfall 12)
- Small-cohort re-identification — enforce privacy threshold at DB layer, not display layer (Pitfall 2)
- Stale `stats_json` cache — never read in reporting path (Pitfall 10)
- False continuity in chart — use BarChart, one bar per week (Pitfall 7)

**Research flag:** Standard patterns — direct codebase extension, no unknown integrations. Skip research phase.

---

### Phase 16a: PDF Scheduled Delivery

**Rationale:** Depends on the complete PDF report (including wellbeing section) being stable. Introduces the first new schema (two columns on `institutions`, `pdf_report_schedules` table) and the first scheduled email with attachment. Keep separate from institution portal to isolate auth complexity.

**Delivers:** CM configures monthly report delivery per institution via a settings form; institution contacts receive PDF automatically on the 1st of each month; `pdf-report.job.ts` and `pdf-email.service.ts` in production.

**Uses:** node-cron (existing), Resend (existing), pdfkit Buffer path (new `bufferPdfDocument` helper), Drizzle for schedule queries.

**Avoids:**
- Duplicate delivery — PostgreSQL advisory lock or `NODE_APP_INSTANCE=0` guard (Pitfall 4); retrofit to `wellbeing-reminder.job.ts` simultaneously
- Resend size limit — 8 MB raw size gate before attaching, `application/pdf` MIME type (Pitfall 6)
- pdfkit memory accumulation — stream-to-buffer helper using `doc.on("data")` event, not array push-and-concat (Pitfall 5)
- Base64 overhead — pass raw `Buffer` to Resend `content` field, not `.toString("base64")` (Architecture Anti-Pattern 5)

**Research flag:** Well-documented patterns with direct codebase analogues. Skip research phase — but **require a pre-sprint decision on duplicate-execution guard strategy** before writing the job.

---

### Phase 16b: Institution Portal

**Rationale:** Highest architectural risk in v1.3. The auth isolation decision (separate namespace vs. enum extension + route audit) must be made before any code is written. Can run in parallel with Phase 16a since they share no direct dependencies, but the auth architecture decision gates both the schema migration and the router implementation.

**Delivers:** Institution contacts log in to a read-only portal; CM creates portal accounts in existing admin UI; institution contacts download their own PDF; wellbeing band visible with the same privacy threshold as the PDF.

**Addresses features:** `institution_user` role, `institutionRouter`, portal overview stats, portal PDF download, portal React page, CM account creation workflow.

**Avoids:**
- Role collision / cross-tenant leakage — separate router, DB-resolved institution on every request, integration test asserting 403 on all contributor routes (Pitfall 3)
- Institution portal routes on `adminRouter` — separate mount, separate guard (Architecture Anti-Pattern 3)
- PostgreSQL enum extension inside a transaction — standalone migration script outside BEGIN/COMMIT (Architecture Anti-Pattern 4)
- Attention flag re-identification — exclude `clearedBy`, `followUpNotes`, `contributorId` from portal serialisation (Pitfall 8)
- CM over-permission on institution account management — `requireAdmin()` on create/delete routes (Pitfall 11)
- JWT-based institution scoping — always resolve from `institution_user_assignments`, never from token payload (Architecture Anti-Pattern 1)

**Research flag:** Needs pre-sprint decision on auth isolation strategy. If team chooses a separate session namespace, that adds new files not fully covered in current architecture research — flag for a targeted planning review before sprint begins.

---

### Phase Ordering Rationale

- Phase 15 first because it has zero schema changes and validates the SWEMWBS data pipeline before anything depends on it
- Phase 16a before institution portal because scheduled delivery depends on a stable PDF with wellbeing; institution portal PDF download reuses the same function
- Phase 16b last because it carries the most legal pre-conditions (consent scope, WEMWBS licence) and the highest auth architecture risk — both must be resolved before code starts
- Phases 16a and 16b can run in parallel after Phase 15 completes if two developers are available, since they share no code dependencies

### Research Flags

**Needs pre-sprint decision (not a full research phase — stakeholder/architect resolution):**
- **Phase 16b (Institution Portal):** Auth isolation strategy — enum extension + `userType` JWT claim + full route audit vs. separate `institution_sessions` table + dedicated login endpoint. Option A is faster; option B is structurally safer. Decide before sprint planning.
- **Phase 16b (Institution Portal):** WEMWBS commercial licence status must be confirmed with Warwick Innovations before any institution-facing wellbeing content ships.
- **Phase 16a/16b:** `institutional_reporting` consent purpose must be added to the consent flow. Product must decide: block aggregation until contributors re-consent, or grandfather existing contributors (legally riskier). This affects the go-live timeline for both phases.

**Standard patterns — skip research phase:**
- **Phase 15 (Wellbeing + Trends):** Direct extension of existing files; all patterns present in codebase; no new integrations
- **Phase 16a (PDF Scheduling):** node-cron pattern mirrors existing job; Resend attachment is standard SDK usage; only open question is duplicate-execution guard (well-documented)

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All conclusions from direct codebase inspection and installed package audit; no new dependencies to evaluate; one known cleanup (`@types/node-cron` removal) |
| Features | HIGH (table stakes) / MEDIUM (portal auth model) | Table stakes have code-level implementation guidance; institution portal auth model has two valid approaches with different tradeoffs — stakeholder decision required |
| Architecture | HIGH | All patterns grounded in direct codebase inspection of v1.2 completed state; file map and route mount order verified; component boundaries are explicit |
| Pitfalls | HIGH | Critical pitfalls sourced from ICO guidance, Warwick Innovations official licence pages, PostgreSQL docs, pdfkit issue tracker, and node-cron issue tracker |

**Overall confidence:** HIGH for implementation approach. MEDIUM for institution portal auth choice and WEMWBS licence status — these are external dependencies, not technical uncertainties.

### Gaps to Address

- **WEMWBS commercial licence:** Confirm with Warwick Innovations before institution-facing wellbeing content ships. If delayed, proceed with generic "wellbeing score" language (no instrument naming) and retrofit branding when licence arrives.
- **Rasch transformation lookup table:** Must be sourced from WEMWBS User Guide v2 or the 2025 Frontiers in Psychiatry paper before the wellbeing aggregation query is written. The 35-row table converts raw integer sum to metric score used for band classification.
- **k-anonymity threshold decision:** Stack research suggests k=5 (consistent with v1.2); pitfalls research recommends k=10 for health data (ICO conservative guidance). Implement as a named constant `WELLBEING_MIN_THRESHOLD` so the value can be changed without a code search. Stakeholder decision required.
- **Institution portal auth isolation strategy:** Decide between enum extension + `userType` JWT claim + route audit (faster) vs. separate session namespace (structurally safer) before Phase 16b sprint.
- **`institutional_reporting` consent rollout:** Existing contributors have not consented to institutional reporting. Product must decide whether to block aggregation until re-consent is obtained or to proceed with a grandfather approach. This decision gates the effective go-live date for wellbeing data in institution-facing outputs.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `packages/server/src/routes/admin.ts`, `routes/wellbeing.ts`, `express-app.ts`, `middleware/auth.ts`, `db/schema.ts`, `pdf/institution-report.ts`, `services/wellbeing-reminder.job.ts`, `services/notification.service.ts`
- Direct codebase inspection — `packages/web/src/pages/admin/AttentionDashboard.tsx`, `InstitutionManagement.tsx`, `api/admin.ts`, `api/attention.ts`
- [ICO: Anonymisation guidance (March 2025)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/) — k-anonymity limitations, UK GDPR anonymisation requirements, purpose limitation for special category data
- [WEMWBS Licences & Pricing — Warwick Innovations](https://warwick.ac.uk/services/innovations/wemwbs/licenses/) — third-party commercial licence requirement active from December 2024
- [SWEMWBS categorisation — Frontiers in Psychiatry 2025](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1674009/full) — band cut-points and Rasch transformation requirements
- [PMC: SWEMWBS national norms — Health Survey for England](https://pmc.ncbi.nlm.nih.gov/articles/PMC5376387/) — population prevalence of Low/Typical/High bands
- [node-cron duplicate execution in cluster — issue #393](https://github.com/node-cron/node-cron/issues/393) — duplicate job firing in PM2 cluster mode
- [pdfkit memory issues — issues #258, #728, #1289](https://github.com/foliojs/pdfkit/issues/258) — heap exhaustion on large or repeated PDF generation
- PostgreSQL official docs — `ALTER TYPE ADD VALUE` is non-transactional (DDL; cannot be wrapped in BEGIN/COMMIT)
- Resend Node.js SDK — attachment `content` accepts `Buffer` directly; no base64 encoding step needed

### Secondary (MEDIUM confidence)
- [Curity: JWT best practices — scoping and audience](https://curity.io/resources/learn/jwt-best-practices/) — institution scoping in JWT vs. DB resolution
- [Crunchy Data: Row-level security for multi-tenant applications](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres) — data scoping patterns
- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html) — tenant isolation, role collision patterns
- [Better Stack: node-cron scheduled tasks in Node.js](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/) — job structure patterns
- [Resend: Sending email with attachments (Node.js)](https://nesin.io/blog/send-email-attachment-resend) — attachment API usage
- [GlockApps: Email size limits and attachment restrictions](https://glockapps.com/blog/email-file-size-limits-and-attachment-restrictions/) — 25 MB SMTP limit, base64 overhead
- [Metabase: Time series visualisation best practices](https://www.metabase.com/blog/how-to-visualize-time-series-data) — sparse data, false continuity avoidance

### Tertiary (LOW confidence — requires stakeholder validation)
- k-anonymity threshold of k=10 for health data: ICO does not mandate a specific number; k=10 is a conservative interpretation of "sufficiently remote" identification risk for health-adjacent contexts. Confirm with DPO or legal review.
- `institutional_reporting` consent purpose: Change required before aggregation queries can use production data. Legal review recommended to confirm scope of existing consent and whether a grandfather approach is permissible.

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
