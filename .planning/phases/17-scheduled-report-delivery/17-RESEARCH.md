# Phase 17: Scheduled Report Delivery - Research

**Researched:** 2026-03-30
**Domain:** Scheduled jobs (node-cron), email with attachment (Resend), PostgreSQL advisory locks, retry with exponential backoff, DrizzleORM migrations
**Confidence:** HIGH

---

## Summary

Phase 17 automates PDF impact report delivery to institution contacts on a CM-configured
schedule. There are two sub-plans: (17-01) the delivery schedule table, cron runner with
advisory lock, and CM toggle UI; (17-02) the delivery log table, retry queue, and exponential
backoff logic.

All three primary libraries are **already installed** in the server package:
- `node-cron` 4.2.1 — the project's existing job scheduler (used for wellbeing reminders)
- `resend` 4.8.0 — the project's existing email service (used in notification fallback)
- `drizzle-orm` 0.38.0 — all schema changes and queries

No new dependencies are required. The patterns established by `wellbeing-reminder.job.ts` and
`notification.service.ts` are the direct templates for this phase.

**Critical schema gap:** The `institutions` table does not have a `contactEmail` column. The
requirement says "emailed to the institution's contact email". Phase 17-01 must add this column
(nullable varchar, populated via the update institution UI and schema), since no contact email
currently exists to deliver reports to. A new `reportDeliverySchedules` table (or two columns
on `institutions`) and a `reportDeliveryLogs` table are also needed.

**Primary recommendation:** Model the cron job after `wellbeing-reminder.job.ts`, guard against
multi-instance duplicate execution using PostgreSQL `pg_try_advisory_lock`, capture the PDFKit
document as a Buffer and pass it directly to Resend's `attachments[].content`, store every
attempt in a log table, and implement exponential backoff by re-queuing failed rows with a
`nextRetryAt` timestamp checked on each cron tick.

---

## Standard Stack

### Core (all already installed — no new dependencies)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| node-cron | 4.2.1 | Cron-syntax scheduler | Already used for wellbeing-reminder.job.ts; project pattern |
| resend | 4.8.0 | Transactional email with attachments | Already used in notification.service.ts; supports `Buffer` directly in `attachments[].content` |
| drizzle-orm | 0.38.0 | Schema, migrations, queries | Project ORM; `sql` tag used for advisory lock raw SQL |
| postgres | 3.4.x | PostgreSQL driver | Already the DB driver; advisory lock queries run via `db.execute(sql\`...\`)` |

### No New Dependencies Needed
The entire feature is implementable with the existing stack. The advisory lock is raw SQL via
Drizzle's `sql` template tag. The exponential backoff is a hand-computed delay stored in a
`nextRetryAt` timestamp column — no external library needed for this scale.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-cron advisory lock pattern | BullMQ / Redis queue | BullMQ is the correct answer at scale, but introduces Redis dependency; advisory lock is sufficient for a single-institution cron job at this scale |
| node-cron advisory lock pattern | pg-boss (PostgreSQL job queue) | Better durability guarantees but adds significant complexity; overkill for two schedules (weekly/monthly) |
| Hand-rolled backoff | `exponential-backoff` npm package | Package adds zero over a simple formula: `baseDelayMs * 2^attempt + jitter`; no dependency warranted |

**Installation:** No new packages — all libraries already present.

---

## Architecture Patterns

### New Database Tables Required

Two new tables are needed, plus two new columns on `institutions`:

**1. `institutions` column additions (migration):**
- `contact_email varchar(255)` — nullable; where the report is sent
- (Schedule config can either be columns on institutions or a separate table — see Pattern 1)

**2. `report_delivery_schedules` table (or columns on `institutions`):**
The simpler approach is to add schedule columns directly to `institutions`:
- `report_delivery_enabled boolean NOT NULL DEFAULT false`
- `report_cadence varchar(10)` — `'weekly'` or `'monthly'`, nullable

**3. `report_delivery_logs` table:**
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `institution_id uuid NOT NULL REFERENCES institutions(id)`
- `attempted_at timestamp with time zone NOT NULL DEFAULT now()`
- `status varchar(20) NOT NULL` — `'sent'` | `'failed'`
- `recipient_email varchar(255) NOT NULL`
- `error_message text` — nullable, populated on failure
- `attempt_number integer NOT NULL DEFAULT 1`
- `next_retry_at timestamp with time zone` — nullable; set when status='failed' and retries remain

### Recommended File Layout

```
packages/server/
├── drizzle/
│   └── 0005_scheduled_report_delivery.sql   # New migration
├── src/
│   ├── db/
│   │   └── schema.ts                         # Add new columns + reportDeliveryLogs table
│   ├── services/
│   │   └── report-delivery.job.ts            # Cron job (mirrors wellbeing-reminder.job.ts)
│   └── routes/
│       └── admin.ts                          # New PATCH endpoints for schedule toggle
packages/web/src/
├── pages/admin/
│   └── InstitutionManagement.tsx             # Add schedule toggle UI
packages/shared/src/
└── schemas/
    └── institution.ts                        # Add updateScheduleSchema
```

### Pattern 1: Cron Job with Advisory Lock (mirrors wellbeing-reminder.job.ts)

**What:** A single `cron.schedule` call in `report-delivery.job.ts`, registered in `index.ts`.
On each tick, try to acquire a session-level advisory lock (fixed integer key) before doing any
work — prevents duplicate execution if the server is ever horizontally scaled.

**When to use:** Any cron job that runs per-instance in a shared-DB environment.

**Advisory lock key:** Pick any stable integer, e.g. `7171` (phase 17, report 1). Hard-code it
as a named constant.

```typescript
// Source: Drizzle ORM sql tag + PostgreSQL advisory lock docs
import cron from "node-cron";
import { sql } from "drizzle-orm";
import { getDb } from "../db/index.js";

const ADVISORY_LOCK_KEY = 7171;

export function startReportDeliveryJob(): void {
  // Run hourly — actual schedule gate is per-institution nextRunAt logic
  cron.schedule("0 * * * *", async () => {
    try {
      await runReportDeliveryJob();
    } catch (err) {
      console.error("[report-delivery] Job error:", err);
    }
  });
  console.log("[report-delivery] Scheduled hourly");
}

async function runReportDeliveryJob(): Promise<void> {
  const db = getDb();

  // Try to acquire advisory lock — returns false if another instance holds it
  const [row] = await db.execute<{ pg_try_advisory_lock: boolean }>(
    sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY})`
  );
  if (!row.pg_try_advisory_lock) {
    console.log("[report-delivery] Another instance is running — skipping");
    return;
  }

  try {
    // ... delivery logic
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`);
  }
}
```

### Pattern 2: Capture PDFKit Document as Buffer for Email Attachment

**What:** `buildInstitutionReport()` returns a `PDFKit.PDFDocument` (a Node readable stream).
For email delivery, capture it as a Buffer before passing to Resend. Do NOT `.pipe(res)` — that
only works for HTTP responses.

```typescript
// Source: PDFKit docs (stream events) + Resend type: Attachment.content = string | Buffer
function pdfDocToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
```

Then pass the buffer to Resend:

```typescript
// Source: resend 4.8.0 Attachment interface — content: string | Buffer
const resend = new Resend(env.RESEND_API_KEY);
await resend.emails.send({
  from: "Indomitable Unity <noreply@indomitableunity.org>",
  to: recipientEmail,
  subject: `Impact Report — ${institutionName}`,
  html: `<p>Please find your Impact Report for ${institutionName} attached.</p>`,
  attachments: [
    {
      content: pdfBuffer,           // Buffer directly accepted
      filename: `impact-report-${slug}.pdf`,
      contentType: "application/pdf",
    },
  ],
});
```

### Pattern 3: Exponential Backoff via nextRetryAt Column

**What:** No external queue library. On failure, compute the next retry time and write it to the
log row. On each cron tick, also query for failed rows where `next_retry_at <= now()`.

**Max retries:** 5 attempts is a reasonable default (covers ~4 hours of spread with 15-min base).
After attempt 5, mark as permanently failed (no `next_retry_at`).

**Formula:** `delay = min(baseMs * 2^(attempt-1) + jitter, maxMs)`
With `baseMs = 15 * 60 * 1000` (15 minutes), max 4 hours:
- Attempt 1 fails → retry in ~15 min
- Attempt 2 fails → retry in ~30 min
- Attempt 3 fails → retry in ~60 min
- Attempt 4 fails → retry in ~120 min
- Attempt 5 fails → permanently failed (no retry)

```typescript
// Compute nextRetryAt — call when an attempt fails
function computeNextRetryAt(attemptNumber: number): Date | null {
  const MAX_ATTEMPTS = 5;
  if (attemptNumber >= MAX_ATTEMPTS) return null; // exhausted

  const BASE_MS = 15 * 60 * 1000;
  const MAX_MS = 4 * 60 * 60 * 1000;
  const jitter = Math.random() * 60 * 1000; // up to 1 min jitter
  const delay = Math.min(BASE_MS * Math.pow(2, attemptNumber - 1) + jitter, MAX_MS);
  return new Date(Date.now() + delay);
}
```

### Pattern 4: Schedule Gate Logic

**What:** The cron runs hourly. Each institution with `report_delivery_enabled = true` has
a `next_run_at timestamp` column (computed and stored when the schedule is enabled or after a
successful send). The job queries `WHERE report_delivery_enabled = true AND next_run_at <= now()`.

**Cadence computation:**
- `'weekly'`: next Monday at 08:00 UTC from current date
- `'monthly'`: first day of next month at 08:00 UTC

This is simpler and more reliable than computing cron offsets per institution; the hourly job
just checks the gate column.

### Anti-Patterns to Avoid

- **Don't pipe PDFKit doc to res and also email it:** `doc.pipe(res)` exhausts the stream. Capture as Buffer first, then either send to HTTP or email — not both from the same doc instance.
- **Don't use `pg_advisory_xact_lock` for job-level locking:** Transaction-scoped locks release on commit/rollback, which happens within the job body. Use session-level `pg_try_advisory_lock` + explicit `pg_advisory_unlock` in a `finally` block.
- **Don't skip logging failed attempts:** SCHED-03 requires every attempt logged. Log the row before calling Resend, then update with the outcome.
- **Don't regenerate PDF on retry without re-querying data:** The PDF should be regenerated fresh on each attempt so it reflects current data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery with PDF attachment | Custom SMTP client | Resend (already installed) | Handles auth, retry at SMTP layer, deliverability, base64 encoding |
| Cron scheduling | `setInterval` / `setTimeout` chains | node-cron (already installed) | Handles cron syntax, timezone support, missed-tick recovery |
| Distributed lock | In-memory flags or Redis | PostgreSQL advisory locks via `pg_try_advisory_lock` | Already have PostgreSQL; no new infra; works correctly across restarts |
| Exponential delay calculation | External backoff library | Inline `baseMs * 2^attempt + jitter` formula | Only 3 lines; no library warranted for this use case |

**Key insight:** The entire feature stack is already present. The main work is schema + wiring existing pieces together in a new pattern.

---

## Common Pitfalls

### Pitfall 1: Stream Already Consumed
**What goes wrong:** Calling `buildInstitutionReport(data)` once and then trying to both pipe to HTTP response and email. A Node stream can only be consumed once.
**Why it happens:** The existing admin route calls `doc.pipe(res)` — reusing that pattern in the job will exhaust the stream.
**How to avoid:** In the job, always call `pdfDocToBuffer(doc)` first. The HTTP stream route and the email job are entirely separate code paths using separate `buildInstitutionReport()` invocations.
**Warning signs:** `Error: write after end` or empty PDF attachment.

### Pitfall 2: Advisory Lock Not Released on Error
**What goes wrong:** Job throws before reaching `pg_advisory_unlock` — lock held for the lifetime of the DB session (until server restarts), blocking all other instances.
**Why it happens:** Missing `try/finally` around the advisory unlock call.
**How to avoid:** Always wrap the job body in `try { ... } finally { await db.execute(sql\`SELECT pg_advisory_unlock(${KEY})\`) }`.
**Warning signs:** Job stops running after one error until server restart.

### Pitfall 3: Missing contactEmail on Institution
**What goes wrong:** Delivery job finds an institution with `report_delivery_enabled = true` but no `contact_email` — cannot send.
**Why it happens:** The `institutions` table currently has no `contactEmail` column. If the schema addition is skipped, the feature cannot function.
**How to avoid:** Phase 17-01 must add `contact_email` to `institutions` schema and migration. The CM toggle UI should validate that `contactEmail` is populated before allowing schedule enable.
**Warning signs:** Attempting delivery with no recipient email — must be caught and logged as a configuration error, not a delivery failure.

### Pitfall 4: nextRunAt Not Updated After Successful Send
**What goes wrong:** Report is sent every hour instead of weekly/monthly because `next_run_at` is not advanced after a successful delivery.
**Why it happens:** Forgetting to UPDATE `institutions.next_run_at` after inserting a 'sent' log row.
**How to avoid:** Always update `next_run_at` immediately after logging a successful send.
**Warning signs:** Duplicate reports arriving each hour.

### Pitfall 5: Report Period Unclear in Automated Email
**What goes wrong:** Institution contact receives a PDF with no indication of what time period it covers.
**Why it happens:** The existing `buildInstitutionReport` accepts `dateRange.startDate/endDate`. The automated job must compute and pass a meaningful date range (e.g., past week or past calendar month) rather than leaving it null (which renders "All time").
**How to avoid:** Compute a concrete `startDate`/`endDate` in the job based on cadence and `previous_run_at`.

### Pitfall 6: Resend 40 MB Attachment Limit
**What goes wrong:** Very large institutions could theoretically produce PDFs over 40 MB (unlikely in practice, but possible if charts/images are added later).
**Why it happens:** Resend hard-limits emails including attachments to 40 MB.
**How to avoid:** For now, log and fail if `pdfBuffer.length > 35_000_000` (35 MB safety margin). Current reports are text+tables only, so this limit will not be hit in practice.

---

## Code Examples

### Collect PDFKit Document as Buffer
```typescript
// Source: PDFKit stream events (pdfkit.org docs) + Node.js streams API
function pdfDocToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
```

### Send PDF via Resend with Buffer Attachment
```typescript
// Source: resend 4.8.0 Attachment type (content: string | Buffer), verified from dist/index.d.ts
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);
const { error } = await resend.emails.send({
  from: "Indomitable Unity <noreply@indomitableunity.org>",
  to: contactEmail,
  subject: `Your Impact Report — ${institutionName}`,
  html: `<p>Please find the Impact Report for <strong>${institutionName}</strong> attached.</p>`,
  attachments: [
    {
      content: pdfBuffer,
      filename: `impact-report-${slug}.pdf`,
      contentType: "application/pdf",
    },
  ],
});
if (error) throw new Error(error.message);
```

### PostgreSQL Advisory Lock with Drizzle
```typescript
// Source: PostgreSQL docs (pg_try_advisory_lock) + Drizzle sql tag
import { sql } from "drizzle-orm";

const LOCK_KEY = 7171;

const [{ pg_try_advisory_lock: acquired }] = await db.execute<{
  pg_try_advisory_lock: boolean;
}>(sql`SELECT pg_try_advisory_lock(${LOCK_KEY})`);

if (!acquired) return; // another instance running

try {
  // ... job logic
} finally {
  await db.execute(sql`SELECT pg_advisory_unlock(${LOCK_KEY})`);
}
```

### Exponential Backoff Delay Computation
```typescript
// No external library — inline formula
function computeNextRetryAt(attemptNumber: number): Date | null {
  const MAX_ATTEMPTS = 5;
  if (attemptNumber >= MAX_ATTEMPTS) return null;
  const BASE_MS = 15 * 60 * 1000;          // 15 minutes
  const MAX_DELAY_MS = 4 * 60 * 60 * 1000; // 4 hours cap
  const jitter = Math.floor(Math.random() * 60_000); // 0–60 s
  const delay = Math.min(BASE_MS * Math.pow(2, attemptNumber - 1) + jitter, MAX_DELAY_MS);
  return new Date(Date.now() + delay);
}
```

### node-cron Hourly Job Registration (mirrors existing pattern)
```typescript
// Source: wellbeing-reminder.job.ts project pattern + node-cron 4.2.1 README
import cron from "node-cron";

export function startReportDeliveryJob(): void {
  cron.schedule("0 * * * *", async () => {
    try {
      await runReportDeliveryJob();
    } catch (err) {
      console.error("[report-delivery] Job error:", err);
    }
  });
  console.log("[report-delivery] Scheduled hourly");
}
```

### Register in index.ts (project pattern)
```typescript
// mirrors: startWellbeingReminderJob() registration in src/index.ts
app.listen(PORT, () => {
  console.log(`[server] ...`);
  startWellbeingReminderJob();
  startReportDeliveryJob(); // ADD
});
```

---

## Schema Changes Required

### New columns on `institutions`
```sql
ALTER TABLE "institutions"
  ADD COLUMN "contact_email" varchar(255),
  ADD COLUMN "report_delivery_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN "report_cadence" varchar(10),        -- 'weekly' | 'monthly' | NULL
  ADD COLUMN "report_next_run_at" timestamp with time zone;
```

### New `report_delivery_logs` table
```sql
CREATE TABLE "report_delivery_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "institution_id" uuid NOT NULL REFERENCES "institutions"("id") ON DELETE CASCADE,
  "attempted_at" timestamp with time zone NOT NULL DEFAULT now(),
  "status" varchar(20) NOT NULL,           -- 'sent' | 'failed'
  "recipient_email" varchar(255) NOT NULL,
  "error_message" text,
  "attempt_number" integer NOT NULL DEFAULT 1,
  "next_retry_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
```

### Drizzle schema additions (TypeScript)
Add to `schema.ts`:
```typescript
export const reportDeliveryLogs = pgTable("report_delivery_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  institutionId: uuid("institution_id").notNull().references(() => institutions.id, { onDelete: "cascade" }),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }).defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull(),  // 'sent' | 'failed'
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  errorMessage: text("error_message"),
  attemptNumber: integer("attempt_number").notNull().default(1),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

And extend `institutions` in schema.ts with the four new columns.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cron-as-queue with setInterval | node-cron with advisory lock | Established pattern in this codebase | Reliable, no external queue |
| Nodemailer for email | Resend SDK | Already project standard | Simpler API, built-in deliverability |
| Base64-encode buffer for attachments | Pass Buffer directly to Resend content | Resend 4.x+ | No encode/decode step needed |

**Deprecated/outdated:**
- `nodemailer`: Not used in this project; Resend is already the standard.
- External Redis queue for retry logic: Overkill at this scale; advisory lock + `nextRetryAt` column is sufficient.

---

## Open Questions

1. **Where does `contact_email` come from?**
   - What we know: The `institutions` table has no email field today.
   - What's unclear: Should the CM enter the contact email when creating/updating the institution, or is it a separate "report settings" form?
   - Recommendation: Add `contactEmail` to `updateInstitutionSchema` in shared, and surface it in the existing Edit Institution form in `InstitutionManagement.tsx`. The delivery toggle UI in 17-01 should show a warning if `contactEmail` is null when attempting to enable delivery.

2. **Should the report cover "since last delivery" or a fixed calendar period?**
   - What we know: The existing report endpoint accepts optional `from`/`to` date params; passing `null/null` returns all-time data.
   - What's unclear: For weekly cadence, should it cover the past 7 days, or always Mon–Sun? For monthly, past 30 days or calendar month?
   - Recommendation: Use calendar-aligned periods (Mon–Sun for weekly; 1st–last of month for monthly) so the report is meaningful and comparable period-over-period. Compute `startDate` = first day of previous period, `endDate` = last day of previous period.

3. **Does the CM delivery log need to be visible in the UI?**
   - What we know: SCHED-03 requires logs with timestamp/status/recipient; no UI spec is given.
   - What's unclear: Whether the admin UI for 17-02 needs a log viewer, or if console/DB is sufficient for MVP.
   - Recommendation: Include a minimal log list in the Institution detail panel (last 10 attempts). This is straightforward given the `report_delivery_logs` table and aligns with what CMs would need to diagnose delivery failures.

---

## Sources

### Primary (HIGH confidence)
- Resend 4.8.0 type definitions (`packages/server/node_modules/resend/dist/index.d.ts`) — `Attachment.content: string | Buffer` confirmed
- node-cron 4.2.1 README (`packages/server/node_modules/node-cron/README.md`) — cron syntax, schedule API
- Project codebase: `src/services/wellbeing-reminder.job.ts` — direct template for job structure
- Project codebase: `src/services/notification.service.ts` — direct template for Resend usage
- Project codebase: `src/pdf/institution-report.ts` — `buildInstitutionReport()` returns `PDFKit.PDFDocument`
- Project codebase: `src/db/schema.ts` — confirmed `institutions` has no `contactEmail`
- Project codebase: `src/index.ts` — job registration pattern

### Secondary (MEDIUM confidence)
- [Resend Attachments docs](https://resend.com/docs/dashboard/emails/attachments) — confirmed `content` accepts base64 or path; docs don't explicitly show Buffer but type definition confirms it
- [PostgreSQL advisory locks — OneUptime 2026](https://oneuptime.com/blog/post/2026-01-25-use-advisory-locks-postgresql/view) — `pg_try_advisory_lock` / `pg_advisory_unlock` pattern with Drizzle
- [PDFKit getting started](https://pdfkit.org/docs/getting_started.html) — stream/pipe pattern; Buffer collection via data/end events is standard Node.js streams

### Tertiary (LOW confidence)
- WebSearch results on exponential backoff patterns — formula and jitter approach widely confirmed across multiple sources but no single authoritative Node.js spec

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in codebase
- Architecture: HIGH — direct templates exist in wellbeing-reminder.job.ts and notification.service.ts
- Schema design: HIGH — follows existing DrizzleORM patterns
- Advisory lock: MEDIUM — pattern is sound, verified via PostgreSQL docs and Drizzle sql tag; project has not used it before but it is well-understood
- Pitfalls: HIGH — derived from direct code inspection of existing stream/PDF patterns

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (stable libraries; no fast-moving components)
