# Domain Pitfalls

**Domain:** Enhanced Reporting & Institution Portal — v1.3 addition to Indomitable Unity
**Researched:** 2026-03-25
**Milestone context:** Adding wellbeing aggregation, attention trends, PDF auto-delivery, and
institution portal login to an existing Express + PostgreSQL + Drizzle + pdfkit + Resend stack.
Auth is JWT cookie-based. Existing roles: contributor, community_manager, admin, challenger.

---

## Critical Pitfalls

Mistakes that cause rewrites, legal exposure, or major security incidents.

---

### Pitfall 1: WEMWBS/SWEMWBS Commercial Licence Not Obtained Before Adding a Third-Party Portal

**What goes wrong:**
The existing system already stores and displays WEMWBS scores to the contributor who produced them.
That use falls within most non-commercial licence grants. However, as soon as aggregated or
individual WEMWBS scores are surfaced to an institution (a third-party organisation), Warwick
Innovations' rules change. From 1 December 2024, any third party — consultant or private
organisation — that is developing a system or application including WEMWBS must hold a full
**commercial licence** before including the scale. Surfacing even anonymous band breakdowns (e.g.
"40% of your cohort scores in the low wellbeing band") in an institution-facing PDF or portal
counts as including WEMWBS in a system delivered to that third party.

**Why it happens:**
Teams assume that because their own licence covers internal use, derived or aggregated outputs are
fine to share externally. The licence explicitly prohibits re-sharing under your own licence.

**Consequences:**
- Breach of Warwick Innovations licence terms — potential for injunction and back-billing at
  commercial rates.
- WEMWBS branding and item text cannot appear in institution-facing PDF reports without this
  licence.
- If the licence is later obtained the product may still need naming changes (the full scale name
  "WEMWBS" is trademarked).

**Prevention:**
- Obtain a commercial licence from Warwick Innovations before Phase 15 PDF report work begins.
  Licence page: warwick.ac.uk/services/innovations/wemwbs/using/
- If the licence is not yet in place: strip WEMWBS branding from institution-facing outputs
  entirely; report only generic "wellbeing score" ranges without identifying the instrument.
- Store a record of licence number and expiry — it is valid for 12 months and must be renewed.

**Detection:**
Any PDF section or portal widget that names "WEMWBS", "SWEMWBS", or "Warwick-Edinburgh" and is
visible to institution users without a current commercial licence is a violation.

**Phase relevance:** Phase 15 (PDF Impact Report) — must be confirmed before build starts.

---

### Pitfall 2: Re-identification of Wellbeing Bands Through Small-Cohort Aggregation

**What goes wrong:**
When an institution has a small cohort (e.g. 3-8 contributors), reporting a band breakdown like
"1 contributor in low wellbeing" effectively singles out an individual. Even without names, a
community centre contact who knows their regulars can re-identify. WEMWBS/UCLA scores are
**special category data** under UK GDPR Art. 9 (health data); inadequate anonymisation does not
lift this obligation.

The ICO's anonymisation guidance explicitly states that k-anonymity alone does not guarantee
anonymisation under UK GDPR — context (who the institution contact knows) must also be assessed.
A differencing attack is trivial: a report generated last month showed 5 contributors; this month
shows 6 with a new "low wellbeing" entry — the institution contact can infer the new member's
score.

**Why it happens:**
- Developers set a threshold (e.g. k=5) without accounting for differencing over time.
- Suppression only applies to the lowest band, leaving the remainder leakable by subtraction.
- Cohort size varies: an institution starts with 30 members, some leave, and over time the
  threshold is silently crossed.

**Consequences:**
- UK GDPR Art. 9 breach — ICO fine up to 17.5M GBP or 4% global turnover, plus mandatory
  reporting within 72 hours.
- Contributor trust damage — members consented for their own use, not disclosure to institutions.

**Prevention:**
- Enforce a hard minimum cohort size (recommend k=10 for health data given the ICO's conservative
  guidance) before any breakdown is shown; below this threshold suppress entirely and show
  "Cohort too small to report".
- Suppress any individual band cell that represents fewer than 5 contributors, even if the
  cohort total is above threshold.
- Do not report exact counts — report percentage bands only, rounded to the nearest 5%.
- Disable time-series breakdowns entirely until the cohort has been stable above threshold for at
  least two consecutive reporting periods.
- Conduct a Data Protection Impact Assessment (DPIA) before launch; the combination of
  health-adjacent data and third-party disclosure requires one under UK GDPR Art. 35.

**Detection:**
Automated pre-render check: if cohortSize < 10, replace all band data with a suppression message
before passing to pdfkit or the portal API response. Enforce at the data layer, not the
display layer, so PDF and portal paths are both protected.

**Phase relevance:** Phase 15 (PDF report), Phase 16 (institution portal).

---

### Pitfall 3: Institution Portal Users Accidentally Gaining Contributor-Role Access

**What goes wrong:**
The system currently uses a single `contributors` table and a JWT carrying `{ sub, role }`. If
institution portal users are added to the same table (even with a distinct role like
`institution_viewer`), any bug in `requireRole` or a missed guard on a new route could allow
an institution contact to reach contributor-facing endpoints. The current `requireRole` guard
does not distinguish between "I am an institution user" and "I am a contributor with elevated
role" — it only checks `role !== target && role !== 'admin'`.

The multi-tenant security literature consistently identifies insufficient logical separation and
session/role confusion as the leading cause of cross-tenant data leakage.

**Why it happens:**
- Convenience: reusing the existing auth system is faster.
- The new role is added to the enum without auditing every existing route guard.
- JWT payload contains no tenant scope, so the same token can be used on any route that passes
  `authMiddleware`.

**Consequences:**
- Institution contact reads individual contributor profiles, wellbeing history, or attention flags.
- A UK data breach notifiable to the ICO.

**Prevention:**
- Either (a) use a separate session namespace with a dedicated `institution_sessions` table and
  a separate login endpoint (`/api/institution/auth/login`) that never mixes cookies with
  contributor sessions, or (b) add an explicit `userType: 'contributor' | 'institution'` claim
  to the JWT and enforce it in every guard.
- Audit every existing route: any route written before institution users existed implicitly
  assumed `req.contributor` refers to a real contributor. Add a `requireContributorUser()`
  middleware that asserts `userType !== 'institution'` and apply it to all existing routes.
- Do not add `institution_viewer` to the existing `contributorRoleEnum` pg enum if possible —
  use a separate table and separate token-signing path to make mixing structurally impossible
  at the DB and type level.

**Detection:**
Integration test: log in as an institution user and assert that GET /api/wellbeing/history,
GET /api/impact/contributor, and GET /api/admin/institutions all return 403.

**Phase relevance:** Phase 16 (institution portal) — auth architecture must be settled before
any portal endpoint is built.

---

### Pitfall 4: node-cron Duplicate Email Delivery on Horizontal Scaling

**What goes wrong:**
The existing `wellbeing-reminder.job.ts` uses `node-cron` scheduled inside the Express process.
The new PDF auto-delivery job will follow the same pattern. When the application is deployed
with more than one process (PM2 cluster mode, Docker replicas, or any multi-instance hosting),
every instance registers and fires the same cron independently — this is a documented, open
GitHub issue in `node-cron` and `node-schedule` with no built-in de-duplication. An institution
that should receive one monthly PDF report instead receives N reports (one per instance).

**Why it happens:**
`node-cron` is purely in-process; it has no awareness of other instances. The existing reminder
job has the same problem but is lower-stakes (duplicate push notification) compared to duplicate
email with PDF attachment.

**Consequences:**
- Institutions receive multiple copies of the same report email.
- Email volume multiplies, increasing Resend cost and risking rate limits.
- If the job also writes a `report_sent_at` timestamp, race conditions between instances can
  corrupt the delivery log.

**Prevention:**
- Add a PostgreSQL advisory lock (or a `scheduled_jobs` table with a unique constraint on
  `(job_name, scheduled_for)`) that the job acquires before executing. Only the instance that
  wins the lock sends the email; all others skip.
- Alternatively, run the scheduler only on the primary instance using a `NODE_APP_INSTANCE=0`
  guard (PM2 sets this env var automatically).
- Retrofit the same fix to `wellbeing-reminder.job.ts` as part of this milestone.

**Detection:**
Deploy two instances in staging and observe whether two emails arrive for one scheduled trigger.

**Phase relevance:** Phase 15 (PDF scheduling job) — design locking before writing the scheduler.

---

## Moderate Pitfalls

---

### Pitfall 5: pdfkit Buffer Accumulation in Memory Under Concurrent Report Requests

**What goes wrong:**
`buildInstitutionReport` (already implemented in `packages/server/src/pdf/institution-report.ts`)
returns a `PDFDocument` that the route must collect into a `Buffer` before attaching to an email
or streaming to the browser. If multiple reports are generated concurrently — or if the PDF is
expanded with charts or images — the entire PDF is held in memory simultaneously. The
foliojs/pdfkit issue tracker documents OOM crashes with large page counts and heap exhaustion
when images are embedded via data URIs.

**Prevention:**
- Always use `doc.pipe()` to a writable stream and collect with a stream-to-buffer helper rather
  than pushing into an array and concatenating. Never call `doc.end()` and then concatenate
  chunks in a `data` event handler — this pattern accumulates the full content twice.
- For reports that include embedded images (logos, charts), use file paths rather than inline
  data URIs; pdfkit's `_imageRegistry` double-stores data URI content.
- Set a per-request timeout and limit concurrent PDF generation. A simple `activeGenerations`
  counter with a 503 fallback is sufficient for this platform's scale.
- The existing `buildInstitutionReport` function returns `doc` without calling `doc.end()` —
  callers must end and collect correctly. Document this contract explicitly in JSDoc.

**Phase relevance:** Phase 15 (PDF report route and email attachment).

---

### Pitfall 6: Resend Attachment Size Limit and Spam Risk

**What goes wrong:**
Base64 encoding adds approximately 33% overhead to PDF size. Most receiving mail servers (Gmail,
Outlook, NHS mail) enforce a 25 MB combined message limit. Exceeding this causes silent rejection
at the SMTP relay — Resend may return a 202 success response, but the receiving server bounces.
Rich PDF reports with embedded charts can grow quickly.

**Prevention:**
- Cap PDF report size at 8 MB (raw) before attaching — 8 MB x 1.33 is approximately 10.6 MB
  encoded, well within the 25 MB limit and the conservative 10 MB safe zone.
- If a report exceeds 8 MB, log a warning and upload to S3; send an email with a pre-signed
  download link instead of an attachment.
- Assert the content-type as `application/pdf`. Resend requires the correct MIME type.
- Monitor Resend delivery webhook events (`delivery.failed`) — do not assume a 202 from the
  send API means the recipient received the email.

**Phase relevance:** Phase 15 (PDF email delivery).

---

### Pitfall 7: Trend Visualization of Sparse 56-Day Check-in Data Implying False Continuity

**What goes wrong:**
Contributors complete WEMWBS check-ins at most every 56 days. An institution cohort of 20 people
with irregular completion means any given month might have 2-3 data points. Connecting these
points with a line chart implies a continuous trend that does not exist. Institutions may make
programmatic decisions (e.g. "wellbeing has been declining for 3 months") based on 3 dots joined
by linear interpolation.

**Why it happens:**
Default chart libraries (Recharts, Chart.js) draw straight lines between points. The gap between
two readings is invisible unless explicitly rendered.

**Prevention:**
- Use a scatter plot with an optional trend line rather than a line chart for cohort aggregate
  scores. The trend line should be a linear regression fit, clearly labelled "trend", not an
  interpolation.
- Show explicit gap markers or dashed lines for periods where cohort check-in count is below
  threshold (fewer than 3 responses in a reporting window).
- Display an "n = X" annotation on each data point so institution users understand the sample
  size behind each reading.
- Label the x-axis with actual check-in dates, not evenly spaced months.
- Add a disclaimer to the PDF and portal: "Wellbeing data points represent completed check-ins,
  not continuous monitoring."

**Phase relevance:** Phase 15 (PDF trend section), Phase 16 (portal chart).

---

### Pitfall 8: Attention Flag Aggregation Exposing Individual Identities to Institution Contacts

**What goes wrong:**
`ithink_attention_flags` stores `contributor_id` and `institution_id`. If the institution portal
surfaces "X members flagged this month" and the institution has a small cohort, the contact can
identify individuals — especially because attention flags are event-driven (one per iThink signal)
rather than periodic. A single flag in a 5-person cohort is a near-certain re-identification.

**Prevention:**
- Apply the same k=10 cohort threshold used for wellbeing bands.
- Report only the ratio of flagged vs. cleared flags per period, never raw counts if cohort < 10.
- Do not expose `clearedBy`, `followUpNotes`, or `contributorId` to institution-facing endpoints
  under any circumstances — these are internal admin fields on the `ithink_attention_flags` table.
- The institution portal API serialisation must explicitly exclude these columns; do not rely on
  the ORM not selecting them by default.

**Phase relevance:** Phase 16 (institution portal attention section).

---

### Pitfall 9: Wellbeing Consent Scope Creep — Check-in Consent Does Not Cover Third-Party Disclosure

**What goes wrong:**
The existing `consent_records` table captures consent for `purpose: 'wellbeing_checkin'` with
`policyVersion: '1.0'`. That consent covers storing and displaying the score to the contributor.
It does not cover transmitting aggregated data derived from those scores to an institution third
party. Under UK GDPR Art. 9(2)(a) (explicit consent for special category data), the consent must
specify each purpose — aggregation for institutional reporting is a new purpose.

**Why it happens:**
Teams assume consent obtained for data collection implicitly covers derived analytics. The ICO
has explicitly rejected this: purpose limitation is strictly interpreted for special category data.

**Consequences:**
Including data from contributors who have not specifically consented to institutional reporting
constitutes unlawful processing of special category data under UK GDPR.

**Prevention:**
- Update the consent flow to include a clear, separate consent purpose before institution
  reporting is enabled: e.g. `purpose: 'institutional_reporting'`.
- Only contributors who have granted `institutional_reporting` consent should have their data
  included in institution aggregations.
- The cohort size for reporting may therefore be smaller than total institution membership — the
  suppression threshold (k=10) applies to the opted-in count, not the enrolled count.
- Document this constraint in the DPIA.

**Phase relevance:** Phase 15/16 — consent must be updated before aggregation queries are written.

---

## Minor Pitfalls

---

### Pitfall 10: statsJson Cache in institutions Table Becoming Stale

**What goes wrong:**
The `institutions` table has a `stats_json` column as a fallback cache. The live stats route in
`routes/institutions.ts` recomputes stats on every request and ignores `stats_json`. If the PDF
report or a scheduled job reads `stats_json` as a fast path instead of querying live, it will
report stale figures — potentially showing numbers from before a member left or before new
challenges were completed.

**Prevention:**
- Never read `stats_json` in any reporting code path; treat it as write-only.
- If performance requires a cache, introduce an explicit `refreshed_at` timestamp alongside the
  cached value and reject reads older than N hours.
- Add a code comment to the `statsJson` field in schema.ts flagging it as a legacy cache.

**Phase relevance:** Phase 15 (PDF report data collection).

---

### Pitfall 11: Admin Router requireRole Allows community_manager on Admin-Only Operations

**What goes wrong:**
`router.use(authMiddleware, requireRole("community_manager"))` is applied to the entire
`adminRouter`. The current guard passes if `role === target || role === 'admin'` — a CM can
invoke any admin endpoint. Operations that should be admin-only (creating institution portal
accounts, configuring report delivery schedules across multiple institutions) are reachable by
CMs under the current design.

**Prevention:**
- Introduce a `requireAdmin()` middleware for high-privilege operations and apply it to individual
  routes that create institution accounts or manage delivery schedules.
- Review all new Phase 15/16 admin routes against the CM vs. admin permission model before
  implementation.

**Phase relevance:** Phase 16 (institution user management endpoints).

---

### Pitfall 12: SWEMWBS Raw Score vs. Rasch-Transformed Score in Band Calculations

**What goes wrong:**
The `wemwbs_score` column stores the raw 7-item sum (range 7-35). SWEMWBS scoring guidelines
require Rasch transformation for accurate band classification. If bands are derived by
partitioning the raw score directly (e.g. 7-17 = low, 18-26 = medium, 27-35 = high), they will
not match the validated cut-points in the published literature, and any interpretation made by
institutions will be clinically inaccurate.

**Why it happens:**
The Rasch lookup table is not widely known; developers apply equal-interval banding by default.

**Prevention:**
- Apply the official Rasch transformation lookup table before computing bands. The transformation
  converts the raw integer sum to a decimal metric score using a 35-row lookup.
  Source: WEMWBS User Guide v2 and the 2025 Frontiers in Psychiatry paper on SWEMWBS
  categorisation.
- Store the transformed score in a separate column (`wemwbs_rasch_score`) or compute it at query
  time from the lookup table; never derive bands from the raw integer directly.

**Phase relevance:** Phase 15 (wellbeing aggregation query).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Wellbeing band aggregation query | Raw score banding (Pitfall 12), small-cohort re-identification (Pitfall 2) | Apply Rasch transform; enforce k=10 suppression at DB layer |
| Institution-facing PDF content | WEMWBS licence (Pitfall 1), consent scope (Pitfall 9) | Confirm commercial licence before build; add institutional_reporting consent purpose |
| PDF generation and email send | pdfkit memory (Pitfall 5), Resend size limits (Pitfall 6) | Stream to buffer; size-gate at 8 MB before attaching |
| PDF scheduled delivery job | Duplicate execution (Pitfall 4) | PostgreSQL advisory lock or NODE_APP_INSTANCE guard |
| Attention trend chart | Sparse data false continuity (Pitfall 7), small-cohort re-identification (Pitfall 8) | Scatter + regression line; suppress below k=10; exclude admin-only columns |
| Institution portal auth | Role collision and cross-tenant access (Pitfall 3) | Separate login endpoint; explicit userType JWT claim; audit existing routes |
| Institution portal admin endpoints | CM over-permission (Pitfall 11) | requireAdmin() for create/manage operations |
| Stats cache in PDF data pipeline | Stale stats_json (Pitfall 10) | Never read cache in reporting path |

---

## Sources

- [ICO: How do we ensure anonymisation is effective?](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/how-do-we-ensure-anonymisation-is-effective/)
  ICO guidance on k-anonymity limitations and UK GDPR anonymisation requirements. HIGH confidence.
- [WEMWBS Licences & Pricing — Warwick Innovations](https://warwick.ac.uk/services/innovations/wemwbs/licenses/)
  Third-party commercial licence requirement from Dec 2024. HIGH confidence via search verification.
- [WEMWBS FAQ — Warwick Innovations](https://warwick.ac.uk/services/innovations/wemwbs/faq/)
  Non-commercial licence cannot be used to provide WEMWBS to other parties. HIGH confidence.
- [OWASP Multi-Tenant Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html)
  Tenant isolation, role collision, session contamination. HIGH confidence.
- [Tenant Infrastructure Risks — FusionAuth](https://fusionauth.io/blog/multi-tenant-hijack-2)
  JWT tenant scope and cross-tenant access patterns. MEDIUM confidence.
- [Multi-Tenant Leakage: Row-Level Security Failures](https://medium.com/@instatunnel/multi-tenant-leakage-when-row-level-security-fails-in-saas-da25f40c788c)
  Insufficient logical separation leading to data leakage. MEDIUM confidence.
- [pdfkit memory leak issue #258](https://github.com/foliojs/pdfkit/issues/258)
  Memory leak on repeat PDF render requests. HIGH confidence (official issue tracker).
- [pdfkit memory and performance issue #728](https://github.com/foliojs/pdfkit/issues/728)
  Performance and memory issues with large documents. HIGH confidence (official issue tracker).
- [pdfkit OOM issue #1289](https://github.com/foliojs/pdfkit/issues/1289)
  Heap exhaustion on large page counts. HIGH confidence (official issue tracker).
- [node-cron duplicate execution in cluster — issue #393](https://github.com/node-cron/node-cron/issues/393)
  Duplicate job firing in PM2 cluster mode. HIGH confidence (official issue tracker).
- [Preventing Duplicate Cron Job Execution in Scaled Environments](https://medium.com/@WMRayan/preventing-duplicate-cron-job-execution-in-scaled-environments-52ab0a13f258)
  Advisory lock and instance-guard patterns. MEDIUM confidence.
- [Email size limits and attachment restrictions — GlockApps](https://glockapps.com/blog/email-file-size-limits-and-attachment-restrictions/)
  25 MB SMTP limit, base64 33% overhead. MEDIUM confidence.
- [How file size and MIME types affect deliverability — Suped](https://www.suped.com/knowledge/email-deliverability/technical/how-does-email-file-size-and-mime-types-affect-email-deliverability)
  Deliverability impact of large attachments. MEDIUM confidence.
- [Time series visualisation best practices — Metabase](https://www.metabase.com/blog/how-to-visualize-time-series-data)
  Handling missing data, avoiding false continuity in sparse series. MEDIUM confidence.
- [SWEMWBS categorisation — Frontiers in Psychiatry 2025](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1674009/full)
  Band cut-points and Rasch transformation requirements. HIGH confidence (peer-reviewed).
- [WEMWBS User Guide v2 — official PDF](https://s3.amazonaws.com/helpscout.net/docs/assets/5f97128852faff0016af3a34/attachments/5fe10a9eb624c71b7985b8f3/WEMWBS-Scale.pdf)
  Official scoring and Rasch transformation lookup. HIGH confidence (official documentation).
