# Architecture Patterns

**Project:** Indomitable Unity v1.3 — Enhanced Reporting & Institution Portal
**Researched:** 2026-03-25
**Confidence:** HIGH (all patterns grounded in direct codebase inspection of v1.2 completed state)

---

## Existing Architecture Baseline (v1.2 Completed)

### Server File Map

```
packages/server/src/
├── config/env.ts                        # getEnv() — validated env vars
├── db/
│   ├── index.ts                         # getDb() — singleton Drizzle instance
│   └── schema.ts                        # All Drizzle table definitions
├── middleware/
│   ├── auth.ts                          # authMiddleware + requireRole(role)
│   ├── api-key-auth.ts                  # VANTAGE X-Api-Key auth
│   └── error-handler.ts
├── pdf/
│   ├── fonts/Inter-Regular.ttf          # Committed fonts (~96KB each)
│   ├── fonts/Inter-Bold.ttf
│   └── institution-report.ts            # buildInstitutionReport(ReportData) → PDFDocument
├── routes/
│   ├── admin.ts                         # adminRouter — community_manager + admin only
│   │                                    # Mounts: institution CRUD, contributor mgmt,
│   │                                    #         attention flags, PDF report endpoint
│   ├── institutions.ts                  # Public GET /api/institutions/:slug (no auth)
│   ├── wellbeing.ts                     # /checkin, /due, /history (contributor auth)
│   ├── webhooks.ts                      # ithinkWebhookHandler (raw body, HMAC-SHA256)
│   └── [auth, challenges, circles, payments, impact, notifications, vantage, challenger]
├── services/
│   ├── notification.service.ts          # notifyBatch(ids, payload)
│   ├── wellbeing-reminder.job.ts        # node-cron daily at 09:00 UTC
│   └── [auth, cv, llm, matching, s3, stripe]
└── express-app.ts                       # Route assembly — raw body before express.json()
```

### Web File Map (relevant subset)

```
packages/web/src/
├── api/
│   ├── admin.ts          # CM API functions + downloadInstitutionReport (raw fetch/blob)
│   ├── attention.ts      # getAttentionFlags, getAttentionHistory, resolveFlag
│   ├── client.ts         # apiClient — JSON responses only, not usable for binary
│   └── wellbeing.ts
├── hooks/
│   ├── useAttention.ts   # useAttentionFlags, useAttentionHistory, useResolveFlag
│   └── useInstitutions.ts
└── pages/admin/
    ├── AttentionDashboard.tsx    # Active flags + history tabs
    └── InstitutionManagement.tsx # Institution CRUD + PDF download button + date range
```

### Auth Surfaces

| Route Scope | Guard Applied | Roles Allowed |
|-------------|--------------|---------------|
| `adminRouter` (all routes) | `authMiddleware` + `requireRole("community_manager")` | community_manager, admin |
| Contributor routes | `authMiddleware` | contributor, community_manager, admin |
| Public institution page | None | Anyone |
| VANTAGE routes | `apiKeyMiddleware` | External systems with valid key |
| iThink webhook | HMAC-SHA256 + timestamp window | iThink system only |

Note: `requireRole("community_manager")` passes `admin` through (see `middleware/auth.ts` line 62: checks `role !== role && role !== "admin"`).

### Existing Key Schema Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `contributors` | id, role, status | Role enum: contributor, community_manager, admin, challenger |
| `institutions` | id, slug, name, city, isActive, statsJson | `statsJson` is a cache field |
| `contributor_institutions` | contributor_id, institution_id, assigned_at | Many-to-many junction |
| `wellbeing_checkins` | contributor_id, wemwbs_score, ucla_score, completed_at | Time-series health data |
| `ithink_attention_flags` | contributor_id, institution_id, cleared_at, signal_type | One row per iThink signal |
| `webhook_deliveries` | delivery_id (unique), processed_at | Idempotency log |
| `contributor_hours` | contributor_id, circle_id, hours_logged, logged_at | Activity ledger |
| `challenge_interests` | contributor_id, challenge_id, created_at | Challenge participation |

### Route Mount Order (express-app.ts — critical for new features)

```
1. POST /api/payments/webhook   — express.raw() (Stripe)
2. POST /api/webhooks/ithink    — express.raw() (iThink HMAC-signed)
3. app.use(express.json())      ← all raw-body routes MUST be above this
4. All other routes
5. app.use(adminRouter) at /api/admin
```

---

## New Features: Integration Points

### Feature 1: Wellbeing Aggregation in PDF

**Status of dependencies:** Fully available. `wellbeing_checkins` table exists with `wemwbs_score`, `ucla_score`, `completed_at`, `contributor_id`. PDF route exists at `GET /api/admin/institutions/:slug/report.pdf`. `buildInstitutionReport` is a pure function accepting a `ReportData` struct.

**Modified files only — no new files, no new tables.**

#### Modified: `packages/server/src/pdf/institution-report.ts`

Extend the exported `ReportData` interface with an optional wellbeing field:

```typescript
export interface ReportData {
  institutionName: string;
  institutionCity: string | null;
  stats: { contributors: number; challenges: number; hours: number };
  generatedAt: Date;
  dateRange: { startDate: Date | null; endDate: Date | null };
  // NEW — undefined or null when below privacy threshold
  wellbeing?: {
    avgWemwbsScore: number;
    avgUclaScore: number;
    checkinCount: number;
  } | null;
}
```

The `buildInstitutionReport` function renders a wellbeing section only when `data.wellbeing` is non-null. The privacy threshold decision lives in the route handler — the PDF module never knows about it.

#### Modified: `GET /api/admin/institutions/:slug/report.pdf` in `routes/admin.ts`

After the existing four aggregation queries (contributor IDs, challenge count, hours), add a fifth:

```typescript
// Fetch per-contributor wellbeing averages within the date window
const wellbeingRows = await db
  .select({
    contributorId: wellbeingCheckins.contributorId,
    avgWemwbs: sql<number>`avg(${wellbeingCheckins.wemwbsScore})`,
    avgUcla: sql<number>`avg(${wellbeingCheckins.uclaScore})`,
  })
  .from(wellbeingCheckins)
  .where(/* inArray(contributorIds) + optional date filters */)
  .groupBy(wellbeingCheckins.contributorId);

const WELLBEING_MIN_THRESHOLD = 5; // privacy gate — agree with stakeholders
const checkinCount = wellbeingRows.length;

const wellbeing = checkinCount >= WELLBEING_MIN_THRESHOLD
  ? {
      avgWemwbsScore: wellbeingRows.reduce((s, r) => s + r.avgWemwbs, 0) / checkinCount,
      avgUclaScore:   wellbeingRows.reduce((s, r) => s + r.avgUcla, 0)   / checkinCount,
      checkinCount,
    }
  : null;

const reportData: ReportData = { ...existingFields, wellbeing };
```

**Data flow:**
```
GET /api/admin/institutions/:slug/report.pdf
  → look up institution by slug
  → fetch contributorIds
  → [existing] hours + challenge aggregations
  → [NEW] wellbeing aggregation → privacy threshold check
  → buildInstitutionReport({ ...stats, wellbeing })
  → doc.pipe(res) + doc.end()
```

---

### Feature 2: Attention Trends

**Status of dependencies:** Fully available. `ithink_attention_flags` exists with `institution_id`, `created_at`, `cleared_at`. The existing attention routes (`/attention`, `/attention/history`) establish the institution-scoping pattern.

**Modified files only — no new tables.**

#### Modified: `routes/admin.ts`

Add a new route. Critical: register it BEFORE any `/:flagId` parameter routes (same constraint as the existing `/attention/history` comment in the file):

```typescript
// MUST be registered before /attention/:flagId/resolve
router.get("/attention/trends", async (req, res) => {
  const cmId = req.contributor!.id;
  const db = getDb();

  // Resolve CM institution from DB — never from JWT (existing pattern)
  const [assignment] = await db
    .select({ institutionId: contributorInstitutions.institutionId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.contributorId, cmId))
    .limit(1);

  if (!assignment) {
    res.status(403).json({ error: "No institution assigned to this community manager" });
    return;
  }

  // Weekly counts for last 12 weeks
  const weeklyCounts = await db.execute(sql`
    SELECT
      date_trunc('week', created_at) AS week_bucket,
      count(*)                       AS total,
      count(cleared_at)              AS resolved
    FROM ithink_attention_flags
    WHERE institution_id = ${assignment.institutionId}
      AND created_at >= now() - interval '12 weeks'
    GROUP BY week_bucket
    ORDER BY week_bucket DESC
  `);

  res.json({ weeklyCounts: weeklyCounts.rows });
});
```

#### Modified: `packages/web/src/api/attention.ts`

Add `getAttentionTrends()` function following the same pattern as `getAttentionFlags`.

#### Modified: `packages/web/src/hooks/useAttention.ts`

Add `useAttentionTrends()` TanStack Query hook.

#### Modified: `packages/web/src/pages/admin/AttentionDashboard.tsx`

Add a third tab ("Trends") to the existing two-tab layout. The trends tab renders a chart or a weekly summary table. Check whether recharts is already in the dependency tree before importing a charting library.

---

### Feature 3: PDF Scheduling and Auto-Delivery

**Status of dependencies:** Resend is already configured. `node-cron` is already installed and in use (`wellbeing-reminder.job.ts`). `buildInstitutionReport` is reusable. The PDF route's data aggregation is proven. New schema table required.

**This is the most architecturally novel feature.** It introduces: a new DB table, a new cron job, and the first use of Resend for file attachments.

#### New Schema: `pdf_report_schedules` table

Add to `packages/server/src/db/schema.ts`:

```typescript
export const reportFrequencyEnum = pgEnum("report_frequency", ["monthly", "quarterly"]);

export const pdfReportSchedules = pgTable("pdf_report_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  frequency: reportFrequencyEnum("frequency").notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
  nextSendAt: timestamp("next_send_at", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by").references(() => contributors.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

`nextSendAt` is computed at creation (e.g. first day of next month for monthly). The cron job queries `WHERE is_active = true AND next_send_at <= now()`. After dispatch, the job updates `last_sent_at = now()` and computes the new `next_send_at`.

#### New File: `packages/server/src/services/pdf-report.job.ts`

Follows the exact structure of `wellbeing-reminder.job.ts`:

```typescript
import cron from "node-cron";
// ...

export function startPdfReportJob(): void {
  cron.schedule("0 6 * * *", async () => {  // 06:00 UTC daily
    try {
      await runPdfReportJob();
    } catch (err) {
      console.error("[pdf-report-job] Error:", err);
    }
  });
  console.log("[pdf-report-job] Scheduled daily at 06:00 UTC");
}

async function runPdfReportJob(): Promise<void> {
  const db = getDb();
  const now = new Date();
  const dueSchedules = await db
    .select()
    .from(pdfReportSchedules)
    .where(and(eq(pdfReportSchedules.isActive, true), lte(pdfReportSchedules.nextSendAt, now)));

  for (const schedule of dueSchedules) {
    try {
      await dispatchScheduledReport(db, schedule);
    } catch (err) {
      // Per-schedule catch — one failure does not abort the batch
      console.error(`[pdf-report-job] Failed for schedule ${schedule.id}:`, err);
    }
  }
}
```

#### New File: `packages/server/src/services/pdf-email.service.ts`

**Key architectural constraint:** When sending via Resend as an email attachment, the PDF cannot be streamed — it must be buffered into a `Buffer` first. Resend's attachment API requires `content: Buffer`. This is the one correct use of buffering (contrast with the browser download endpoint where streaming is mandatory).

```typescript
import { buildInstitutionReport, type ReportData } from "../pdf/institution-report.js";

export async function sendPdfReportEmail(
  recipientEmail: string,
  reportData: ReportData,
  filename: string,
): Promise<void> {
  const doc = buildInstitutionReport(reportData);

  // Buffer the PDF — required for Resend attachment API
  const pdfBuffer = await bufferPdfDocument(doc);

  const resend = new Resend(getEnv().RESEND_API_KEY);
  await resend.emails.send({
    from: "reports@indomitableunity.com",
    to: recipientEmail,
    subject: `Impact Report — ${reportData.institutionName}`,
    html: `<p>Scheduled impact report for ${reportData.institutionName} is attached.</p>`,
    attachments: [{ filename, content: pdfBuffer }],
  });
}

function bufferPdfDocument(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
```

#### Modified: `packages/server/src/index.ts`

```typescript
startWellbeingReminderJob();
startPdfReportJob();   // NEW
```

#### Modified: `packages/server/src/routes/admin.ts`

Add schedule CRUD routes on the existing `adminRouter`:

```
POST   /api/admin/institutions/:id/report-schedules    — create schedule
GET    /api/admin/institutions/:id/report-schedules    — list for institution
PATCH  /api/admin/report-schedules/:scheduleId         — toggle active / change frequency
DELETE /api/admin/report-schedules/:scheduleId         — delete
```

All guarded by the existing `adminRouter` middleware. The POST body (Zod-validated): `{ frequency: "monthly"|"quarterly", recipientEmail: string }`. `nextSendAt` is computed server-side.

#### Modified: `packages/web/src/pages/admin/InstitutionManagement.tsx`

Add a "Scheduled Reports" collapsible section to each institution card. Shows existing schedules (frequency badge, last sent, next send, active toggle). Includes an inline form to create a new schedule.

---

### Feature 4: Institution Portal

**Status of dependencies:** The role enum and auth middleware exist but do not include `"institution_user"`. A new junction table is needed. Resend welcome email is already used for regular contributors.

**This is the highest-risk feature architecturally** — it introduces a new auth role and new portal-scoped routes.

#### Modified Schema: `contributorRoleEnum` in `schema.ts`

Add `"institution_user"` to the existing enum:

```typescript
export const contributorRoleEnum = pgEnum("contributor_role", [
  "contributor",
  "community_manager",
  "admin",
  "challenger",
  "institution_user",   // NEW
]);
```

PostgreSQL enum extension requires a migration. Drizzle-kit generates `ALTER TYPE contributor_role ADD VALUE 'institution_user'` — this is non-transactional in PostgreSQL and must be run outside a transaction block. Write the migration as a standalone SQL file (not inside a `BEGIN`/`COMMIT` block).

#### New Schema: `institution_user_assignments` table

This is distinct from `contributor_institutions` (which links regular contributors to their institution). Institution portal users need a clean link:

```typescript
export const institutionUserAssignments = pgTable("institution_user_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  contributorId: uuid("contributor_id")
    .notNull()
    .references(() => contributors.id, { onDelete: "cascade" }),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  assignedBy: uuid("assigned_by").references(() => contributors.id, { onDelete: "set null" }),
}, (table) => [
  unique("institution_user_assignments_unique").on(table.contributorId, table.institutionId),
]);
```

#### New File: `packages/server/src/routes/institution-portal.ts`

A separate router — NOT mounted on `adminRouter` (which blocks non-CM roles). The portal routes apply their own guard:

```typescript
const router = Router();
router.use(authMiddleware);
// Inline role check — institution_user OR admin (admin can preview the portal)
router.use((req, res, next) => {
  const role = req.contributor?.role;
  if (role !== "institution_user" && role !== "admin") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  next();
});

// GET /api/institution-portal/dashboard
// GET /api/institution-portal/wellbeing
// GET /api/institution-portal/attention  (read-only — no resolve action)
// GET /api/institution-portal/report.pdf (on-demand, reuses buildInstitutionReport)
```

All queries scope to the institution resolved from `institution_user_assignments WHERE contributor_id = req.contributor.id` — same DB-resolution pattern as the CM attention routes.

#### Modified: `packages/server/src/express-app.ts`

```typescript
import { institutionPortalRoutes } from "./routes/institution-portal.js";
// ...
app.use("/api/institution-portal", institutionPortalRoutes);
```

#### Modified: `packages/server/src/routes/admin.ts`

Add institution user management routes:

```
POST   /api/admin/institution-users        — create institution_user account + send invite email
GET    /api/admin/institution-users        — list all institution users with their institution
DELETE /api/admin/institution-users/:id    — deactivate account
```

Account creation uses the existing `contributors` table (inserts with `role: "institution_user"`) and sends a password-reset-style invite email via Resend (reuse `auth.service.ts` token pattern).

#### New Frontend Files

**`packages/web/src/api/institution-portal.ts`** — fetch functions for portal endpoints.

**`packages/web/src/hooks/useInstitutionPortal.ts`** — TanStack Query hooks.

**`packages/web/src/pages/institution-portal/PortalDashboard.tsx`** — read-only view: institution name, headcount, challenges, hours, wellbeing trend, attention flags (no resolve button).

#### Modified Frontend

**`packages/web/src/App.tsx` (or TanStack Router file)** — add routes under `/portal/`:

```tsx
// Protected with a new InstitutionPortalRoute guard component
// that checks role === "institution_user" or role === "admin"
<Route path="/portal/dashboard" element={<InstitutionPortalRoute><PortalDashboard /></InstitutionPortalRoute>} />
```

**`packages/web/src/pages/admin/InstitutionManagement.tsx`** — add "Portal Users" section to each institution card with invite and deactivate controls.

---

## Component Boundaries

| Component | Package | Responsibility | Communicates With |
|-----------|---------|---------------|-------------------|
| `routes/admin.ts` | server | CM CRUD (institutions, contributors, attention, schedules, institution users), PDF streaming | DB, `institution-report.ts`, `pdf-email.service.ts` |
| `routes/institution-portal.ts` | server | Institution user read-only view, scoped to own institution | DB, `institution-report.ts` |
| `routes/wellbeing.ts` | server | Contributor check-in submission and history | DB, consent records |
| `pdf/institution-report.ts` | server | Stateless PDF document builder — no DB, no network | Called by route handlers and `pdf-email.service.ts` |
| `services/pdf-report.job.ts` | server | Scheduled PDF dispatch — queries due schedules | DB, `pdf-email.service.ts` |
| `services/pdf-email.service.ts` | server | Buffer PDF, attach to Resend email | `institution-report.ts`, Resend API |
| `services/notification.service.ts` | server | Push notifications (unchanged) | DB, web-push |
| `pages/admin/AttentionDashboard.tsx` | web | CM attention flags + history + trends | `api/attention.ts`, hooks |
| `pages/admin/InstitutionManagement.tsx` | web | Institution CRUD, PDF, schedules, portal users | `api/admin.ts`, hooks |
| `pages/institution-portal/PortalDashboard.tsx` | web | Institution user read-only dashboard | `api/institution-portal.ts`, hooks |

---

## Data Flow Diagrams

### On-Demand PDF (existing — extended with wellbeing)

```
CM clicks "Generate Report"
  → downloadInstitutionReport(slug, from, to)   [api/admin.ts]
  → raw fetch → GET /api/admin/institutions/:slug/report.pdf
  → adminRouter auth guard
  → DB: institution by slug
  → DB: contributor_institutions → contributorIds
  → DB: contributor_hours (date-filtered)
  → DB: challenge_interests (date-filtered)
  → [NEW] DB: wellbeing_checkins (date-filtered, grouped by contributor)
  → privacy threshold check → wellbeing = data or null
  → buildInstitutionReport({ stats, wellbeing })
  → doc.pipe(res) + doc.end()  ← streams to browser
  → browser: blob URL → <a>.click() → file download
```

### Scheduled PDF (new)

```
node-cron 06:00 UTC
  → runPdfReportJob()
  → DB: SELECT * FROM pdf_report_schedules WHERE is_active AND next_send_at <= now
  → for each schedule:
    → DB: institution + contributorIds + hours + challenges + wellbeing
    → buildInstitutionReport(reportData)
    → bufferPdfDocument(doc) → Buffer
    → Resend.send({ to: recipientEmail, attachments: [pdfBuffer] })
    → DB: UPDATE pdf_report_schedules SET last_sent_at, next_send_at
```

### Attention Trends (new)

```
CM opens AttentionDashboard → Trends tab
  → useAttentionTrends()
  → GET /api/admin/attention/trends
  → adminRouter auth guard
  → DB: resolve CM institution from contributor_institutions
  → DB: GROUP BY date_trunc('week', created_at) on ithink_attention_flags
        WHERE institution_id = :cmInstitutionId AND created_at >= now() - 12 weeks
  → return { weeklyCounts: [{week, total, resolved}] }
  → render chart or table in Trends tab
```

### Institution Portal (new)

```
Institution user accesses /portal/dashboard
  → InstitutionPortalRoute: checks JWT role = "institution_user"
  → GET /api/institution-portal/dashboard
  → authMiddleware + inline role check
  → DB: institution_user_assignments WHERE contributor_id = req.contributor.id
  → DB: same aggregations as PDF route
  → return { institutionName, stats, wellbeing }
  → render PortalDashboard (read-only)
```

---

## Patterns to Follow

### Pattern 1: Institution Scoping (must follow on every new route)

Resolve the actor's institution from the DB on every request. Never read it from the JWT payload.

```typescript
// CM routes — existing pattern
const [assignment] = await db
  .select({ institutionId: contributorInstitutions.institutionId })
  .from(contributorInstitutions)
  .where(eq(contributorInstitutions.contributorId, cmId))
  .limit(1);

// Institution portal routes — new pattern (same structure, different table)
const [assignment] = await db
  .select({ institutionId: institutionUserAssignments.institutionId })
  .from(institutionUserAssignments)
  .where(eq(institutionUserAssignments.contributorId, req.contributor!.id))
  .limit(1);
```

### Pattern 2: Cron Job Structure (copy wellbeing-reminder.job.ts)

Export `startXJob()` calling `cron.schedule(expression, handler)`. Wrap async handler in try/catch. For batch jobs (PDF scheduler), wrap each item's dispatch in its own try/catch so one failure does not abort the run. Call `startXJob()` from `index.ts`.

### Pattern 3: PDF as Pure Function (never add DB access to institution-report.ts)

`buildInstitutionReport(data: ReportData)` is and must remain stateless. All DB queries happen in the caller (route handler or job dispatcher). Pass a complete, typed `ReportData` object. The wellbeing field extension follows this: the route handler applies the privacy threshold and passes `wellbeing: data | null` — the PDF module never decides what the threshold is.

### Pattern 4: Binary Download vs. Email Buffer

- **Browser download:** `doc.pipe(res); doc.end()` — stream directly, never buffer.
- **Email attachment:** Collect `doc.on("data")` chunks, await `doc.on("end")`, then `Buffer.concat(chunks)` — Resend attachment API requires a `Buffer`.

Never buffer for browser downloads. Never try to stream to Resend.

### Pattern 5: Route Registration Order for Specific Paths

In `routes/admin.ts`, specific string paths must be registered before parameterised paths on the same segment. The new `/attention/trends` route follows the same constraint as `/attention/history` — register it immediately after `/attention/history` and before `/attention/:flagId/resolve`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: JWT-Based Institution Scoping

Reading `institutionId` from the JWT payload. JWT claims are stale for up to the token TTL after a CM is reassigned. Always resolve from the DB. This is a GDPR-adjacent data leakage risk.

### Anti-Pattern 2: DB Queries Inside `buildInstitutionReport`

The PDF module must stay stateless. Adding a `getDb()` call breaks reusability between the browser streaming path and the email buffering path, and makes the module untestable without a DB mock.

### Anti-Pattern 3: Institution Portal Routes on `adminRouter`

`adminRouter` applies `requireRole("community_manager")` globally. Institution users would receive 403 before reaching any portal logic. Create a separate router with its own guard.

### Anti-Pattern 4: PostgreSQL Enum Extension Inside a Transaction

`ALTER TYPE contributor_role ADD VALUE 'institution_user'` is non-transactional in PostgreSQL. Wrapping it in `BEGIN`/`COMMIT` causes an error. Write the migration as a standalone SQL file outside a transaction block or use Drizzle's migration format that handles this.

### Anti-Pattern 5: Sending PDF as Base64 String to Resend

Resend's Node.js SDK accepts `Buffer` directly for attachment `content`. Using `.toString("base64")` adds 33% size overhead and an unnecessary encode/decode step. Pass the raw `Buffer`.

---

## New vs. Modified File Inventory

### New Files

| File | Purpose |
|------|---------|
| `packages/server/src/services/pdf-report.job.ts` | Daily cron job: query due schedules, dispatch PDFs via email |
| `packages/server/src/services/pdf-email.service.ts` | Buffer PDF document, send via Resend attachment |
| `packages/server/src/routes/institution-portal.ts` | Institution user read-only portal routes |
| `packages/web/src/api/institution-portal.ts` | Fetch functions for portal endpoints |
| `packages/web/src/hooks/useInstitutionPortal.ts` | TanStack Query hooks for portal |
| `packages/web/src/pages/institution-portal/PortalDashboard.tsx` | Institution user dashboard (read-only) |

### Modified Files

| File | Changes |
|------|---------|
| `packages/server/src/db/schema.ts` | Add `"institution_user"` to `contributorRoleEnum`; add `pdfReportSchedules` table; add `institutionUserAssignments` table; add `reportFrequencyEnum` |
| `packages/server/src/pdf/institution-report.ts` | Extend `ReportData` with optional `wellbeing` field; render wellbeing section when present |
| `packages/server/src/routes/admin.ts` | Add `/attention/trends` route; add schedule CRUD routes; add institution user CRUD routes |
| `packages/server/src/index.ts` | Call `startPdfReportJob()` at startup |
| `packages/server/src/express-app.ts` | Mount `institutionPortalRoutes` at `/api/institution-portal` |
| `packages/web/src/api/attention.ts` | Add `getAttentionTrends()` |
| `packages/web/src/hooks/useAttention.ts` | Add `useAttentionTrends()` |
| `packages/web/src/pages/admin/AttentionDashboard.tsx` | Add Trends tab |
| `packages/web/src/pages/admin/InstitutionManagement.tsx` | Add schedule management UI; add portal user management section |
| `packages/web/src/api/admin.ts` | Add schedule CRUD functions; add institution user functions |

### Unchanged Files (notable)

| File | Why Not Changed |
|------|----------------|
| `packages/server/src/middleware/auth.ts` | `requireRole` is parameterised and already passes `admin`; portal routes implement their own inline role check rather than requiring middleware changes |
| `packages/server/src/routes/institutions.ts` | Public landing page is unchanged |
| `packages/server/src/routes/webhooks.ts` | No new webhooks in v1.3 |
| `packages/server/src/services/wellbeing-reminder.job.ts` | Existing job unchanged |

---

## Build Order

| Phase | Features | Why This Order |
|-------|----------|----------------|
| 1 | Wellbeing aggregation in PDF + Attention trends | No new tables. Purely additive to existing files. Build and verify before adding scheduling complexity. |
| 2 | PDF scheduling + auto-delivery | Depends on complete PDF (with wellbeing). New table + cron job. Independent of institution portal. |
| 3 | Institution portal | New role enum value + new table + new routes + new frontend. Independent of scheduling. Can run in parallel with phase 2. |

Schema migrations always first within a phase. For the enum extension migration (`institution_user` role value), write it as a raw SQL file outside a transaction — Drizzle-kit may generate it inside a transaction block by default, which PostgreSQL rejects for enum additions.

---

## Sources

- Direct inspection: `packages/server/src/routes/admin.ts`, `routes/wellbeing.ts`, `routes/institutions.ts`, `express-app.ts`, `middleware/auth.ts`, `db/schema.ts`, `pdf/institution-report.ts`, `services/wellbeing-reminder.job.ts`
- Direct inspection: `packages/web/src/pages/admin/AttentionDashboard.tsx`, `InstitutionManagement.tsx`, `api/admin.ts`, `api/attention.ts`
- `.planning/phases/15-pdf-impact-report/15-RESEARCH.md` — pdfkit streaming vs. buffering, ESM font path, `ReportData` interface shape
- `.planning/research/SUMMARY.md` (v1.2) — institution scoping pattern, attention route conventions
- PostgreSQL docs — `ALTER TYPE ADD VALUE` is non-transactional (HIGH confidence)
- Resend Node.js SDK docs — attachment `content` accepts `Buffer` (HIGH confidence — standard SDK behavior)
- node-cron — `cron.schedule()` pattern, already in use in codebase
