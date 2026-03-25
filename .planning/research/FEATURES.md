# Feature Landscape

**Domain:** Social enterprise platform — v1.3 Enhanced Reporting & Institution Portal additions
**Researched:** 2026-03-25
**Confidence:** HIGH for features building on existing patterns; MEDIUM for institution portal auth model; MEDIUM for scheduled delivery retry behaviour

> This document covers ONLY the NEW features for v1.3.
> The following are ALREADY BUILT and must not be re-scoped into this milestone:
>
> - Institution CRUD, contributor assignment, live stats
> - iThink webhook receiver, HMAC-SHA256 verification, dual-secret rotation
> - `ithink_attention_flags` table, `webhook_deliveries` dedup table
> - CM attention dashboard (active flags, resolve with notes, signal history)
> - PDF impact report via pdfkit, streaming to browser, date-range filtering
> - WEMWBS/UCLA check-ins stored in `wellbeing_checkins` per contributor
> - `contributorInstitutions` junction table (many-to-many)
> - `node-cron` scheduler in use for wellbeing reminders; Resend SDK in use for email

---

## Context: What the Four New Feature Areas Require

### 1. Anonymous Wellbeing Aggregate Bands in PDF Reports

**What it is:** Roll up SWEMWBS scores from all contributors linked to an institution and show a
band label ("Low / Typical / High wellbeing") in the PDF, without exposing per-contributor scores.

**Score scale and bands (MEDIUM confidence — verified against multiple academic sources):**

The existing codebase stores SWEMWBS 7-item scores in `wellbeing_checkins.wemwbs_score`.
SWEMWBS scores range from 7 to 35. Published band thresholds from Health Survey for England
population norms (Warwick Edinburgh Mental Wellbeing Scale) are:

| Band | Score range | Population prevalence |
|------|-------------|-----------------------|
| Low wellbeing | 7–19 | ~15% of population |
| Typical wellbeing | 20–27 | ~71% |
| High wellbeing | 28–35 | ~14% |

These thresholds are the same whether using the IU-published ranges or the cut-point system
(≤19.5 = low, ≥27.5 = high). The simpler rounded version (7–19 / 20–27 / 28–35) is appropriate
for funder reports — it does not require decimal precision.

**Privacy threshold logic:**

UK ICO anonymisation guidance (updated March 2025) does not mandate a fixed k-anonymity number.
However, ICO requires that identification risk is "sufficiently remote." For a health-adjacent
aggregate involving special-category data (wellbeing scores), using fewer than 5 contributors
makes re-identification feasible (outlier contributors could be inferred from scores). The prior
v1.2 FEATURES.md established a minimum of 5 contributors with check-ins in the report period.
This is consistent with standard statistical disclosure control practice for small cohort reporting
in NHS-adjacent and third-sector contexts. Treat 5 as the mandatory floor.

**Aggregate computation:**

- Take the most recent check-in per contributor within the date range
- Compute mean SWEMWBS score across qualifying contributors
- Map mean to band label
- If fewer than 5 contributors have check-ins in range: omit the section entirely; include
  the note: "Wellbeing data is not displayed: fewer than 5 contributors completed a check-in
  during this period."
- Do NOT show the numeric mean — display band label only (reduces re-identification risk)
- Consider showing the count: "Based on N check-ins" — acceptable if N >= 5

**Sources:**
- [Frontiers Psychiatry 2025: SWEMWBS categorisation thresholds](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1674009/full)
- [PMC: Evaluating SWEMWBS national norms — Health Survey for England](https://pmc.ncbi.nlm.nih.gov/articles/PMC5376387/)
- [ICO: Anonymisation guidance (updated March 2025)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/)

---

### 2. Attention Signal Trend Visualization

**What it is:** Show the CM whether iThink attention flag frequency is increasing, stable, or
decreasing over time, rather than just showing the current open count.

**Time bucket approach:**

The `ithink_attention_flags` table stores `created_at` per flag. The most practical bucketing
for the pilot scale (tens of contributors, weekly or bi-weekly iThink sessions) is **weekly
buckets** — count flags per ISO week for the last 8–12 weeks. At monthly cadence, monthly
buckets also work but provide fewer data points.

Standard implementation using Drizzle + PostgreSQL:

```sql
SELECT date_trunc('week', created_at) AS week, COUNT(*) AS flag_count
FROM ithink_attention_flags
WHERE institution_id = $1
  AND created_at >= NOW() - INTERVAL '12 weeks'
GROUP BY date_trunc('week', created_at)
ORDER BY week ASC
```

Empty weeks (zero flags) must be filled in by the server before returning — the frontend
chart needs a continuous x-axis. Compute expected week buckets in JavaScript and left-join
the DB results.

**Direction / trend signal:**

Compare the average flag count of the first half of the window (weeks 1–6) to the second
half (weeks 7–12). A simple directional label suffices:
- Increasing: second-half mean > first-half mean by >10%
- Decreasing: second-half mean < first-half mean by >10%
- Stable: within 10% of each other

Do NOT attempt regression or statistical significance testing — the volumes are too small and
the audience is a CM, not a data analyst. A directional label + bar chart is the appropriate
output.

**Chart type:** Use the existing `recharts` BarChart (already in the stack from v1.1). Bars
per week, x-axis = week label (e.g., "10 Mar"), y-axis = flag count. Add a trend badge
("Increasing / Stable / Decreasing") above the chart derived from the directional comparison.

**Where it lives:** A new section on the existing `AttentionDashboard.tsx` page — not a
separate page. No new route is needed for the chart data; it can reuse
`GET /api/admin/attention/history` which already returns all flags with timestamps.

---

### 3. Scheduled PDF Email Delivery

**What it is:** Send the institution PDF impact report to a configured contact email address
on a recurring schedule (e.g., monthly), rather than requiring CM to manually generate and
download each time.

**Cron patterns in this codebase:**

The server already uses `node-cron` for the wellbeing reminder job
(`packages/server/src/services/wellbeing-reminder.job.ts`). The same library handles
scheduled PDF email delivery. Do not add a second scheduler library.

Standard cron expression for monthly (first of month at 08:00 UTC): `0 8 1 * *`

The job pattern to follow:
1. Query all active institutions that have a `reportContactEmail` configured
2. For each institution, query report stats (reuse the logic from
   `GET /api/admin/institutions/:slug/report.pdf`)
3. Buffer the PDF in memory (generate with pdfkit, collect stream into a Buffer)
4. Send via Resend with the PDF as an attachment
5. Log success/failure per institution; swallow individual institution errors so one
   failure does not abort the batch

**Attachment vs link:**

Resend supports PDF buffer attachments with a 40MB limit post-Base64 encoding. Institution
impact report PDFs are data tables — at pilot scale (tens of contributors, 1–3 pages), a
generated PDF will be well under 1MB. Attachment is appropriate: it delivers the content
without requiring the recipient to log in or click through to a portal.

A link approach requires generating a signed URL or storing the PDF — both add complexity
with no user benefit at pilot scale. Use attachment.

**Resend attachment pattern (HIGH confidence — consistent with existing notification.service.ts):**

```typescript
const resend = new Resend(env.RESEND_API_KEY);
const pdfBuffer = await streamToBuffer(buildInstitutionReport(data));

await resend.emails.send({
  from: "Indomitable Unity <noreply@indomitableunity.org>",
  to: institution.reportContactEmail,
  subject: `Impact Report — ${institution.name} — ${monthLabel}`,
  html: `<p>Please find your monthly impact report attached.</p>`,
  attachments: [
    {
      filename: `impact-report-${institution.slug}-${monthLabel}.pdf`,
      content: pdfBuffer,
    },
  ],
});
```

**Retry behaviour:**

`node-cron` has no built-in retry. For pilot scale (one CM, handful of institutions), a
try/catch per institution with error logging is sufficient. If a send fails, the next
scheduled run retries implicitly. Do NOT add BullMQ or Agenda — they require Redis or
MongoDB persistence and are disproportionate for monthly report delivery to ~5 institutions.

**Schema addition required:**

The `institutions` table needs a new nullable column: `report_contact_email varchar(255)`.
This is set by the CM in institution settings. If null, the institution is excluded from
scheduled delivery.

A `report_schedule_enabled boolean default false` column allows per-institution opt-in
without the CM having to remember to remove the email address.

**Sources:**
- [Resend: Sending email with attachments in Node.js](https://nesin.io/blog/send-email-attachment-resend)
- [Better Stack: node-cron scheduled tasks](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/)
- Existing codebase: `packages/server/src/services/wellbeing-reminder.job.ts` — node-cron pattern
- Existing codebase: `packages/server/src/services/notification.service.ts` — Resend SDK usage

---

### 4. Institution Self-Service Portal

**What it is:** An institution contact (e.g., the library manager) can log in to a portal to
view their own institution's data — contributor counts, challenge participation, PDF reports —
without needing CM mediation.

**Auth model:**

The existing app has a single `contributors` table with `role` enum
(`contributor | community_manager | admin | challenger`). Adding an `institution_contact`
role to this enum is the cleanest approach for a pilot — it reuses the existing JWT auth
system (`jose`), existing `authMiddleware`, and existing `requireRole` middleware. No separate
auth table or separate login flow is needed.

An institution contact is a row in `contributors` with `role = 'institution_contact'` and an
entry in `contributorInstitutions` linking them to their institution. The CM creates this
account.

A fully separate auth system (separate tokens, separate login URL, magic link only) would be
appropriate if institution contacts must never be contributors, or if there are hundreds of
institution contacts. At pilot scale (one institution contact per institution, handful of
institutions), reusing the contributor auth table with a new role is the right call.

**Data scoping:**

Institution contacts must only ever see data for their own institution. The scoping rule is
identical to the CM attention view: resolve the institution from the logged-in user's
`contributorInstitutions` row on every request — never trust a JWT claim for the institution
ID. The existing `GET /api/admin/attention` handler demonstrates this pattern.

A dedicated `institutionRouter` (parallel to `adminRouter`) with
`requireRole("institution_contact")` middleware handles institution portal routes. Do NOT
add institution contact routes to the `adminRouter` — CM and institution contact have
different data access rights.

**What institution contacts typically see:**

Derived from standard funder/partner reporting expectations for third-sector platforms:

1. Institution overview stats (contributor count, challenge count, hours) — what the CM sees
   on the institution detail page, scoped to their institution only
2. PDF download button — generate the same report the CM can download
3. Wellbeing aggregate (with privacy threshold) — same band label as appears in the PDF

What institution contacts do NOT see:
- Individual contributor names or profiles (privacy — contributors enrolled via CM, not via
  institution consent)
- iThink attention flags (operational, CM-only)
- Other institutions' data
- Any CM-only settings (assign contributors, manage institutions list)

**Routes pattern:**

```
GET /api/institution-portal/overview
GET /api/institution-portal/report.pdf
```

Both behind `requireRole("institution_contact")` middleware. Both scope to the logged-in
user's institution via `contributorInstitutions` lookup.

**Sources:**
- [JWT best practices — audience / scope](https://curity.io/resources/learn/jwt-best-practices/)
- [Row-level security for multi-tenant apps](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)
- Existing codebase: `packages/server/src/middleware/auth.ts` — `requireRole` middleware pattern
- Existing codebase: `packages/server/src/routes/admin.ts` — institution-scope-from-DB pattern

---

## Table Stakes

Features a CM or institution contact expects once v1.3 ships. Missing any makes the release feel incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Wellbeing aggregate band in PDF (with privacy threshold) | PDF report promised "wellbeing summary" in v1.2.x deferred list; funders expect it | MEDIUM | Query most-recent WEMWBS per contributor in date range; map mean to Low/Typical/High band; suppress if N<5; display band label + "Based on N check-ins" |
| Attention trend chart (weekly buckets, 12 weeks) | CM needs to see direction of change, not just current count — flat list gives no trend context | MEDIUM | New query aggregating flags by ISO week; recharts BarChart; directional badge (Increasing/Stable/Decreasing); no new page, add to AttentionDashboard.tsx |
| Scheduled PDF email delivery (monthly) | CM has been asked by institutions "can we get this automatically?"; doing it manually each month is a CM burden | MEDIUM | node-cron monthly job; Resend PDF attachment; per-institution opt-in flag; schema: add `report_contact_email` and `report_schedule_enabled` to `institutions` |
| Institution portal login (institution_contact role) | Institutions want to check their own data without phoning the CM | HIGH | New `institution_contact` role added to `contributor_role` enum; new `institutionRouter`; CM creates portal accounts; data scoped to institution via contributorInstitutions lookup |
| Institution portal: overview stats | First thing a portal user looks for | LOW | Same live stats already computed in `GET /api/admin/institutions`; scope to institution from JWT principal |
| Institution portal: PDF report download | Portal user's primary deliverable | LOW | Reuse `buildInstitutionReport` and streaming pattern; same endpoint logic, different auth guard |

---

## Differentiators

Features that distinguish this platform from generic institution reporting portals.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Wellbeing band with explicit privacy floor | Not just "here's a number" — the report explains why data is or isn't shown, building contributor trust | LOW (design constraint, not code) | The "fewer than 5 contributors" note in the PDF is as important as the band itself; don't omit the explanation |
| Attention trend direction badge (Increasing/Stable/Decreasing) | Gives CM a 2-second summary before digging into the chart bars | LOW | Simple comparison of first-half vs. second-half mean of 12-week window; add amber/green/red colour to badge |
| Monthly PDF auto-delivery configured per institution | Institution contacts receive reports without any CM action after initial setup | MEDIUM | Per-institution `report_schedule_enabled` toggle in institution settings form; CM enables it once |
| CM-created institution portal accounts | CM retains control of who at the institution gets portal access | LOW | CM uses existing contributor management UI to create `institution_contact` accounts; no separate account creation flow needed |

---

## Anti-Features

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Per-contributor wellbeing data visible to institution contacts | "We want to see how our people are doing individually" | GDPR special category data — institution did not obtain individual consent; contributor consent covers IU processing, not institution visibility | Show aggregate band only (band label + N count); institution must rely on CM for individual follow-up |
| Exact mean WEMWBS score in PDF or portal | "Just show us the number" | Even a mean can be re-identifying in a small cohort — e.g., if 5 contributors and score is 12.4, anyone who knows one contributor's score can narrow others | Band label ("Typical wellbeing") + N count; removes precise numerical re-identification risk |
| Weekly or daily scheduled delivery | "Can we get it every week?" | At pilot scale, weekly reports with mostly-unchanged data are noise; monthly is the correct cadence for funder/board reporting cycles | Monthly cron; if a specific institution needs a different cadence, CM generates on demand |
| Real-time attendance or activity feed for institution contacts | "We want a live dashboard" | iThink attention data is CM-operational, not institution-facing; contributor activity data (hours, circles) is private to contributors; a live feed would require significant access expansion | Institution portal shows aggregate stats updated on page load — no stream, no polling |
| Institution portal with self-service account creation | "Let us sign ourselves up" | Institution must be enrolled by CM first; self-service signup breaks the controlled onboarding model and creates risk of institutions accessing wrong data | CM-created accounts only; CM sends credentials or invite link to institution contact |
| Storing scheduled PDFs in S3 for audit trail | "We need records of what we sent" | PDFs must reflect current data; stored PDFs go stale; S3 adds operational complexity; for audit purposes, the DB-backed stats are the source of truth | Log send events (institution slug, send timestamp, success/failure) in a `report_deliveries` table; report content is always regenerable on demand |
| Trend visualization using recharts AreaChart with gradient fill | Makes the chart "look better" | Area chart implies cumulative data; flag counts per week are categorical, not cumulative; an area chart misleads the CM about the nature of the data | BarChart — one bar per week is unambiguous and maps directly to "how many flags this week?" |
| Predictive / ML-based trend forecasting | "Can it predict next month?" | Sample sizes at pilot scale are far too small for meaningful forecasting; would produce random-looking output that might alarm CMs | Directional badge only (based on first-half vs second-half mean comparison); label it "Recent trend" not "Forecast" |

---

## Feature Dependencies

```
[report_contact_email + report_schedule_enabled columns on institutions]
    └──required-for──> [Scheduled PDF email delivery job]
    └──required-for──> [Institution portal: report delivery settings form]

[institution_contact role added to contributor_role enum]
    └──required-for──> [Institution portal login]
    └──required-for──> [institutionRouter with requireRole guard]
    └──required-for──> [Institution portal: overview stats endpoint]
    └──required-for──> [Institution portal: PDF report download endpoint]
    └──NOTE: Requires PostgreSQL enum extension (ALTER TYPE) — see pitfalls

[wellbeingCheckins table + contributorInstitutions junction]
    └──required-for──> [Wellbeing aggregate band in PDF]
    └──already-exist──> both tables built in v1.2

[ithinkAttentionFlags table + createdAt timestamps]
    └──required-for──> [Attention trend chart]
    └──already-exists──> built in v1.2; GET /api/admin/attention/history already returns full history

[buildInstitutionReport function + PDF streaming]
    └──required-for──> [Scheduled PDF email delivery] (buffer variant, not stream)
    └──required-for──> [Institution portal: PDF download]
    └──already-exists──> built in Phase 15; needs a streamToBuffer wrapper for email attachment

[Resend SDK]
    └──required-for──> [Scheduled PDF email delivery]
    └──already-in-use──> notification.service.ts; no new dependency

[node-cron]
    └──required-for──> [Scheduled PDF email delivery]
    └──already-in-use──> wellbeing-reminder.job.ts; no new dependency
```

### Dependency Notes

- **`institution_contact` enum value is the central blocker for the portal.** Adding to a
  PostgreSQL enum requires `ALTER TYPE ... ADD VALUE` — cannot be done inside a transaction.
  Write as a standalone migration script outside Drizzle's transaction wrapper (same approach
  used for other enum extensions in this codebase).

- **Wellbeing aggregate has no new dependencies.** Both required tables exist. This can be
  built entirely within the PDF route handler — it is a query + computation addition, not a
  schema change.

- **Attention trend chart has no new dependencies.** The existing
  `GET /api/admin/attention/history` returns all flags with timestamps. The chart is a
  frontend-only transformation of that data, computable client-side using the TanStack Query
  cache. A dedicated trend endpoint is optional (and not recommended for the first version).

- **Scheduled delivery requires schema change AND a `streamToBuffer` helper.** The current
  `buildInstitutionReport` returns a pdfkit `PDFDocument` which is a Node.js stream — you
  pipe it to `res`. For email attachment, you need a `Buffer`. Write a thin
  `streamToBuffer(stream)` utility that collects a stream into a `Buffer` (standard Node.js
  `Readable` to Buffer pattern via `events` + promises).

- **Institution portal PDF endpoint reuses `buildInstitutionReport` identically.** The only
  difference from the admin PDF endpoint is the auth guard (`requireRole("institution_contact")`
  instead of `requireRole("community_manager")`) and the institution resolution (from JWT
  principal, not from URL slug param).

---

## MVP Definition for v1.3

### Launch With (v1.3 core)

Minimum viable set to deliver the milestone's stated value.

- [ ] Wellbeing aggregate band section added to `buildInstitutionReport` — SWEMWBS mean → band
      label; N≥5 required; suppress with note if below threshold
- [ ] Attention trend chart added to `AttentionDashboard.tsx` — recharts BarChart; weekly
      buckets; directional badge; no new route, uses existing history endpoint
- [ ] `report_contact_email` + `report_schedule_enabled` columns on `institutions` table
      (migration)
- [ ] CM form to set contact email and enable scheduled delivery (institution settings form)
- [ ] Scheduled PDF email delivery job (`report-delivery.job.ts`), monthly cron, Resend
      attachment, per-institution opt-in, batch error isolation
- [ ] `institution_contact` value added to `contributor_role` PostgreSQL enum (migration)
- [ ] `institutionRouter` with `requireRole("institution_contact")` guard
- [ ] Institution portal overview stats endpoint
      (`GET /api/institution-portal/overview`)
- [ ] Institution portal PDF report download endpoint
      (`GET /api/institution-portal/report.pdf`)
- [ ] Institution portal React page (`/institution-portal`) with stats and PDF button
- [ ] CM workflow to create institution contact accounts (reuse existing contributor creation
      in admin UI with role = institution_contact)

### Add After Validation (v1.3.x)

- [ ] `report_deliveries` audit log table — log every scheduled send event (institution, sent
      at, success, error message)
- [ ] Per-institution custom schedule cadence (if monthly proves too infrequent for some
      institutions)
- [ ] Trend chart: tooltip showing flag details on hover (contributor names, signal types per
      week bar)

### Future Consideration (v2+)

- [ ] Institution contacts configuring their own report preferences (beyond what CM sets)
- [ ] Wellbeing aggregate trend line across multiple periods in the PDF (not just current
      period band)
- [ ] Multi-institution portal accounts (one contact viewing multiple institutions)

---

## Implementation Notes by Feature Area

### Wellbeing Aggregate Band

Query pattern (add to the PDF route handler, after existing stats queries):

```typescript
// Get most-recent WEMWBS per contributor in date range
const wellbeingRows = await db
  .select({
    wemwbsScore: wellbeingCheckins.wemwbsScore,
    contributorId: wellbeingCheckins.contributorId,
  })
  .from(wellbeingCheckins)
  .innerJoin(contributorInstitutions,
    eq(contributorInstitutions.contributorId, wellbeingCheckins.contributorId))
  .where(
    and(
      eq(contributorInstitutions.institutionId, institution.id),
      startDate ? gte(wellbeingCheckins.completedAt, startDate) : undefined,
      endDate ? lte(wellbeingCheckins.completedAt, endDate) : undefined,
    )
  )
  .orderBy(wellbeingCheckins.contributorId, desc(wellbeingCheckins.completedAt));

// Take the most recent per contributor (dedup)
const latestPerContributor = new Map<string, number>();
for (const row of wellbeingRows) {
  if (!latestPerContributor.has(row.contributorId)) {
    latestPerContributor.set(row.contributorId, row.wemwbsScore);
  }
}

const scores = [...latestPerContributor.values()];
const wellbeingAggregate = scores.length >= 5
  ? { eligible: true, count: scores.length, mean: scores.reduce((a, b) => a + b) / scores.length }
  : { eligible: false, count: scores.length };

// Band thresholds
function scoreToBand(mean: number): "Low" | "Typical" | "High" {
  if (mean <= 19) return "Low";
  if (mean <= 27) return "Typical";
  return "High";
}
```

Add a wellbeing section to `buildInstitutionReport` that accepts
`wellbeingAggregate: { eligible: boolean; count: number; mean?: number }`. If
`eligible: false`, render the suppression note. If `eligible: true`, render the band label
and count. Do NOT render the numeric mean.

### Attention Trend Chart

Client-side computation from existing data (no new endpoint):

```typescript
// In AttentionDashboard.tsx, using existing useAttentionHistory() data
function buildWeeklyBuckets(flags: AttentionHistoryEntry[], weeks: number = 12) {
  const now = new Date();
  const buckets: { week: string; count: number }[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = startOfWeek(subWeeks(now, i)); // date-fns
    const weekEnd = endOfWeek(weekStart);
    const label = format(weekStart, "d MMM");
    const count = flags.filter(f =>
      new Date(f.createdAt) >= weekStart && new Date(f.createdAt) <= weekEnd
    ).length;
    buckets.push({ week: label, count });
  }
  return buckets;
}
```

`date-fns` is already in the web package (confirmed via `recharts` patterns and common
usage). If not installed, add it — it is the standard date utility for React projects using
recharts.

Trend direction computation:

```typescript
function trendDirection(buckets: { count: number }[]) {
  const half = Math.floor(buckets.length / 2);
  const first = buckets.slice(0, half).reduce((a, b) => a + b.count, 0) / half;
  const second = buckets.slice(half).reduce((a, b) => a + b.count, 0) / (buckets.length - half);
  if (first === 0 && second === 0) return "Stable";
  const ratio = first === 0 ? Infinity : second / first;
  if (ratio > 1.1) return "Increasing";
  if (ratio < 0.9) return "Decreasing";
  return "Stable";
}
```

Badge colour: Increasing = amber, Stable = green, Decreasing = green (decreasing flags is
positive). Label it "Recent trend (12 weeks)" to set correct expectations.

### Scheduled PDF Email Delivery

New file: `packages/server/src/services/report-delivery.job.ts`

Pattern mirrors `wellbeing-reminder.job.ts`:

```typescript
import cron from "node-cron";
import { Resend } from "resend";
import { getDb } from "../db/index.js";
import { institutions } from "../db/schema.js";
import { buildInstitutionReport } from "../pdf/institution-report.js";
import { getEnv } from "../config/env.js";

export function startReportDeliveryJob(): void {
  // Monthly: 1st of month at 08:00 UTC
  cron.schedule("0 8 1 * *", async () => {
    try {
      await runReportDeliveryJob();
    } catch (err) {
      console.error("[report-delivery] Job error:", err);
    }
  });
  console.log("[report-delivery] Scheduled monthly on 1st at 08:00 UTC");
}
```

The `streamToBuffer` helper:

```typescript
import { Readable } from "node:stream";

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
```

Register `startReportDeliveryJob()` in `index.ts` alongside `startWellbeingReminderJob()`.

### Institution Portal

Route registration in `express-app.ts`:

```typescript
import { institutionPortalRouter } from "./routes/institution-portal.js";
app.use("/api/institution-portal", institutionPortalRouter);
```

New file: `packages/server/src/routes/institution-portal.ts`

```typescript
const router = Router();
router.use(authMiddleware, requireRole("institution_contact"));

router.get("/overview", async (req, res) => {
  const userId = req.contributor!.id;
  // Always resolve institution from DB — never trust URL param
  const [assignment] = await db.select({ institutionId: contributorInstitutions.institutionId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.contributorId, userId))
    .limit(1);
  if (!assignment) {
    res.status(403).json({ error: "No institution assigned" });
    return;
  }
  // ... compute stats, return overview
});
```

Adding `institution_contact` to the `contributor_role` enum requires a standalone migration
(outside a transaction):

```sql
-- packages/server/scripts/add-institution-contact-role.mjs
ALTER TYPE contributor_role ADD VALUE 'institution_contact';
```

This cannot be wrapped in `BEGIN/COMMIT` — PostgreSQL enum additions are DDL and cannot be
transactional. Match the pattern of existing enum extension scripts in
`packages/server/scripts/`.

React page: `packages/web/src/pages/institution/Portal.tsx`
Route: `/institution-portal` — protected by role guard in the router (same pattern as
`/attention` which is CM-only).

---

## Feature Prioritization Matrix

| Feature | Recipient Value | Implementation Cost | Priority |
|---------|-----------------|---------------------|----------|
| Wellbeing aggregate band in PDF | HIGH — fills the main gap in the v1.2 report | MEDIUM | P1 |
| Attention trend chart (weekly buckets) | HIGH — CM currently has no direction context | MEDIUM | P1 |
| `report_contact_email` schema + CM settings form | HIGH — enables scheduled delivery | LOW | P1 |
| Scheduled PDF email delivery job | HIGH — removes monthly manual burden for CM | MEDIUM | P1 |
| `institution_contact` enum value (migration) | HIGH — required before portal can exist | LOW (migration only) | P1 |
| Institution portal overview stats | HIGH — institution contacts' primary need | LOW | P1 |
| Institution portal PDF download | HIGH — institution contacts' primary deliverable | LOW | P1 |
| Institution portal React page | HIGH | LOW | P1 |
| CM workflow to create institution contact accounts | MEDIUM — CM must be able to do this | LOW (reuse existing admin UI) | P1 |
| `report_deliveries` audit log | LOW — operational hygiene | LOW | P2 |
| Trend chart hover tooltips | LOW — nice to have | LOW | P2 |
| Per-contributor wellbeing visible to institution | HIGH (perceived) | MEDIUM (build cost) | DO NOT BUILD |
| Exact WEMWBS mean in PDF | HIGH (perceived) | LOW | DO NOT BUILD |

---

## Sources

- Codebase audit: `packages/server/src/services/wellbeing-reminder.job.ts`,
  `packages/server/src/services/notification.service.ts`,
  `packages/server/src/routes/admin.ts`,
  `packages/server/src/routes/webhooks.ts`,
  `packages/server/src/pdf/institution-report.ts`,
  `packages/server/src/db/schema.ts`
- [Frontiers Psychiatry 2025: SWEMWBS categorisation — Low/Typical/High bands](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2025.1674009/full)
- [PMC: SWEMWBS national norms — Health Survey for England](https://pmc.ncbi.nlm.nih.gov/articles/PMC5376387/)
- [CORC: SWEMWBS scoring guide](https://www.corc.uk.net/outcome-measures-guidance/directory-of-outcome-measures/short-warwick-edinburgh-mental-wellbeing-scale-swemwbs/)
- [ICO: Anonymisation guidance (March 2025 update)](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-sharing/anonymisation/)
- [Better Stack: node-cron scheduled tasks in Node.js](https://betterstack.com/community/guides/scaling-nodejs/node-cron-scheduled-tasks/)
- [Resend: Sending email with attachments (Node.js)](https://nesin.io/blog/send-email-attachment-resend)
- [Curity: JWT best practices — scoping and audience](https://curity.io/resources/learn/jwt-best-practices/)
- [Crunchy Data: Row-level security for multi-tenant applications](https://www.crunchydata.com/blog/row-level-security-for-tenants-in-postgres)

---
*Feature research for: Indomitable Unity v1.3 — Enhanced Reporting & Institution Portal*
*Researched: 2026-03-25*
