import cron from "node-cron";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { Resend } from "resend";
import type PDFDocument from "pdfkit";
import { getDb } from "../db/index.js";
import { institutions, reportDeliveryLogs } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import { buildInstitutionReport, type ReportData } from "../pdf/institution-report.js";
import {
  contributorInstitutions,
  challengeInterests,
  contributorHours,
  wellbeingCheckins,
} from "../db/schema.js";
import { inArray, gte, desc } from "drizzle-orm";
import { rawToMetric, metricToBand } from "../lib/swemwbs-rasch.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const BASE_MS = 15 * 60 * 1000;
const MAX_DELAY_MS = 4 * 60 * 60 * 1000;

// ─── Exported entry point ─────────────────────────────────────────────────────

export function startReportDeliveryJob(): void {
  // Run hourly at :00
  cron.schedule("0 * * * *", async () => {
    try {
      await runReportDeliveryJob();
    } catch (err: unknown) {
      console.error("[report-delivery] Job error:", err);
    }
  });

  console.log("[report-delivery] Scheduled hourly");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collect PDFDocument stream chunks into a Buffer.
 * Caller must NOT have called doc.end() yet — this function calls it.
 */
function pdfDocToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

/**
 * Compute nextRetryAt using exponential backoff. Returns null when attempts exhausted.
 */
function computeNextRetryAt(attemptNumber: number): Date | null {
  if (attemptNumber >= MAX_ATTEMPTS) return null;
  const jitter = Math.floor(Math.random() * 60000);
  const delay = Math.min(BASE_MS * Math.pow(2, attemptNumber - 1) + jitter, MAX_DELAY_MS);
  return new Date(Date.now() + delay);
}

/**
 * Next scheduled run date for a given cadence.
 * Weekly: next Monday at 08:00 UTC
 * Monthly: 1st of next month at 08:00 UTC
 */
export function computeNextRunAt(cadence: "weekly" | "monthly"): Date {
  const now = new Date();
  if (cadence === "weekly") {
    // ISO day: Monday = 1, Sunday = 7. getDay(): Sunday = 0, Monday = 1
    const day = now.getUTCDay(); // 0 = Sun, 1 = Mon … 6 = Sat
    const daysUntilMonday = day === 0 ? 1 : 8 - day;
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 8, 0, 0, 0));
    return next;
  } else {
    // 1st of next month at 08:00 UTC
    const nextMonth = now.getUTCMonth() + 1;
    const year = nextMonth > 11 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
    const month = nextMonth > 11 ? 0 : nextMonth;
    return new Date(Date.UTC(year, month, 1, 8, 0, 0, 0));
  }
}

/**
 * The date range for the report period that just elapsed.
 * Weekly: previous Mon 00:00 UTC → previous Sun 23:59:59.999 UTC
 * Monthly: 1st of previous month 00:00 UTC → last day 23:59:59.999 UTC
 */
function computePeriodRange(cadence: "weekly" | "monthly"): { startDate: Date; endDate: Date } {
  const now = new Date();
  if (cadence === "weekly") {
    const day = now.getUTCDay(); // 0 = Sun, 1 = Mon … 6 = Sat
    // Days since last Monday
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    // Previous Monday = this Monday minus 7
    const thisMon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0, 0));
    const prevMon = new Date(thisMon.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevSun = new Date(thisMon.getTime() - 1);
    return { startDate: prevMon, endDate: prevSun };
  } else {
    const year = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
    const month = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
    // Last day of that month
    const endDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 1);
    return { startDate, endDate };
  }
}

// ─── Report data gathering (mirrors the PDF route logic) ─────────────────────

async function gatherReportData(
  db: ReturnType<typeof getDb>,
  institutionId: string,
  institutionName: string,
  institutionCity: string | null,
  startDate: Date,
  endDate: Date,
): Promise<ReportData> {
  const assignments = await db
    .select({ contributorId: contributorInstitutions.contributorId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.institutionId, institutionId));

  const contributorIds = assignments.map((a) => a.contributorId);

  let challenges = 0;
  let hours = 0;

  if (contributorIds.length > 0) {
    const ciRows = await db
      .select({ challengeId: challengeInterests.challengeId })
      .from(challengeInterests)
      .where(
        sql`${inArray(challengeInterests.contributorId, contributorIds)} AND (${challengeInterests.createdAt} >= ${startDate}) AND (${challengeInterests.createdAt} <= ${endDate})`,
      );
    challenges = new Set(ciRows.map((r) => r.challengeId)).size;

    const hoursRows = await db
      .select({ hoursLogged: contributorHours.hoursLogged })
      .from(contributorHours)
      .where(
        sql`${inArray(contributorHours.contributorId, contributorIds)} AND (${contributorHours.loggedAt} >= ${startDate}) AND (${contributorHours.loggedAt} <= ${endDate})`,
      );
    hours = hoursRows.reduce((sum, r) => sum + r.hoursLogged, 0);
  }

  // Wellbeing band (consent-filtered, k=5 anonymity)
  const K_ANONYMITY = 5;
  let wellbeingBand: "Low" | "Typical" | "High" | null = null;
  let wellbeingMessage: string | undefined;

  if (contributorIds.length > 0) {
    const wellbeingRows = await db
      .selectDistinctOn([wellbeingCheckins.contributorId], {
        contributorId: wellbeingCheckins.contributorId,
        wemwbsScore: wellbeingCheckins.wemwbsScore,
      })
      .from(wellbeingCheckins)
      .where(
        sql`${inArray(wellbeingCheckins.contributorId, contributorIds)} AND ${eq(wellbeingCheckins.institutionalReporting, true)}`,
      )
      .orderBy(wellbeingCheckins.contributorId, desc(wellbeingCheckins.completedAt));

    if (wellbeingRows.length < K_ANONYMITY) {
      wellbeingBand = null;
      wellbeingMessage =
        "Wellbeing data not available — fewer than 5 contributors have shared their wellbeing data for this report period.";
    } else {
      const bandCounts: Record<"Low" | "Typical" | "High", number> = { Low: 0, Typical: 0, High: 0 };
      for (const row of wellbeingRows) {
        try {
          const metric = rawToMetric(row.wemwbsScore);
          const band = metricToBand(metric);
          bandCounts[band]++;
        } catch {
          // Skip invalid scores
        }
      }
      wellbeingBand =
        bandCounts.Typical >= bandCounts.Low && bandCounts.Typical >= bandCounts.High
          ? "Typical"
          : bandCounts.Low >= bandCounts.High
            ? "Low"
            : "High";
    }
  } else {
    wellbeingMessage = "Wellbeing data not available — no contributors assigned to this institution.";
  }

  return {
    institutionName,
    institutionCity,
    stats: { contributors: contributorIds.length, challenges, hours },
    generatedAt: new Date(),
    dateRange: { startDate, endDate },
    wellbeingBand,
    wellbeingMessage,
  };
}

// ─── Delivery helpers ─────────────────────────────────────────────────────────

async function deliverReport(
  db: ReturnType<typeof getDb>,
  institution: {
    id: string;
    name: string;
    city: string | null;
    contactEmail: string;
    reportCadence: string;
  },
  attemptNumber: number,
): Promise<{ success: boolean; errorMessage?: string }> {
  const cadence = institution.reportCadence as "weekly" | "monthly";
  const { startDate, endDate } = computePeriodRange(cadence);

  let reportData: ReportData;
  try {
    reportData = await gatherReportData(db, institution.id, institution.name, institution.city, startDate, endDate);
  } catch (err: unknown) {
    return { success: false, errorMessage: `Failed to gather report data: ${err instanceof Error ? err.message : String(err)}` };
  }

  let pdfBuffer: Buffer;
  try {
    const doc = buildInstitutionReport(reportData);
    pdfBuffer = await pdfDocToBuffer(doc);
  } catch (err: unknown) {
    return { success: false, errorMessage: `Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}` };
  }

  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    console.warn("[report-delivery] RESEND_API_KEY not configured — skipping email delivery");
    return { success: false, errorMessage: "RESEND_API_KEY not configured" };
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const periodLabel = cadence === "weekly"
    ? `Week of ${reportData.dateRange.startDate?.toLocaleDateString("en-GB")}`
    : `${reportData.dateRange.startDate?.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;

  try {
    const { error } = await resend.emails.send({
      from: "Indomitable Unity <reports@indomitableunity.org>",
      to: [institution.contactEmail],
      subject: `Impact Report — ${institution.name} — ${periodLabel}`,
      text: `Please find attached your ${cadence} impact report for ${institution.name}.\n\nReport period: ${periodLabel}\n\nThis is an automated delivery from Indomitable Unity.`,
      attachments: [
        {
          filename: `impact-report-${institution.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (error) {
      return { success: false, errorMessage: `Resend error: ${error.message}` };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, errorMessage: `Email send failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

// ─── Core job ─────────────────────────────────────────────────────────────────

async function runReportDeliveryJob(): Promise<void> {
  const db = getDb();

  // Acquire advisory lock (key 7171) — prevents duplicate execution across instances
  const lockResult = await db.execute<{ pg_try_advisory_lock: boolean }>(
    sql`SELECT pg_try_advisory_lock(7171)`,
  );
  const lockAcquired = Array.from(lockResult)[0]?.pg_try_advisory_lock === true;

  if (!lockAcquired) {
    console.log("[report-delivery] Advisory lock not acquired — another instance running, skipping");
    return;
  }

  try {
    const now = new Date();

    // ── 1. Process due deliveries ──────────────────────────────────────────────
    const dueInstitutions = await db
      .select({
        id: institutions.id,
        name: institutions.name,
        city: institutions.city,
        contactEmail: institutions.contactEmail,
        reportCadence: institutions.reportCadence,
      })
      .from(institutions)
      .where(
        and(
          eq(institutions.reportDeliveryEnabled, true),
          isNotNull(institutions.contactEmail),
          isNotNull(institutions.reportNextRunAt),
          lte(institutions.reportNextRunAt, now),
        ),
      );

    for (const inst of dueInstitutions) {
      if (!inst.contactEmail || !inst.reportCadence) continue;

      console.log(`[report-delivery] Delivering to ${inst.name} (${inst.contactEmail})`);

      const { success, errorMessage } = await deliverReport(
        db,
        { ...inst, contactEmail: inst.contactEmail, reportCadence: inst.reportCadence },
        1,
      );

      if (success) {
        await db.insert(reportDeliveryLogs).values({
          institutionId: inst.id,
          status: "sent",
          recipientEmail: inst.contactEmail,
          attemptNumber: 1,
        });
        await db
          .update(institutions)
          .set({ reportNextRunAt: computeNextRunAt(inst.reportCadence as "weekly" | "monthly") })
          .where(eq(institutions.id, inst.id));
        console.log(`[report-delivery] Sent to ${inst.name}`);
      } else {
        const nextRetryAt = computeNextRetryAt(1);
        await db.insert(reportDeliveryLogs).values({
          institutionId: inst.id,
          status: "failed",
          recipientEmail: inst.contactEmail,
          errorMessage: errorMessage ?? "Unknown error",
          attemptNumber: 1,
          nextRetryAt,
        });
        console.warn(`[report-delivery] Failed for ${inst.name}: ${errorMessage}`);
      }
    }

    // ── 2. Process retries ────────────────────────────────────────────────────
    const retryRows = await db
      .select({
        id: reportDeliveryLogs.id,
        institutionId: reportDeliveryLogs.institutionId,
        attemptNumber: reportDeliveryLogs.attemptNumber,
        recipientEmail: reportDeliveryLogs.recipientEmail,
      })
      .from(reportDeliveryLogs)
      .where(
        and(
          eq(reportDeliveryLogs.status, "failed"),
          isNotNull(reportDeliveryLogs.nextRetryAt),
          lte(reportDeliveryLogs.nextRetryAt, now),
        ),
      );

    for (const retryRow of retryRows) {
      // Look up institution details
      const [inst] = await db
        .select({
          id: institutions.id,
          name: institutions.name,
          city: institutions.city,
          contactEmail: institutions.contactEmail,
          reportCadence: institutions.reportCadence,
          reportDeliveryEnabled: institutions.reportDeliveryEnabled,
        })
        .from(institutions)
        .where(eq(institutions.id, retryRow.institutionId))
        .limit(1);

      if (!inst || !inst.contactEmail || !inst.reportCadence || !inst.reportDeliveryEnabled) {
        // Institution disabled or missing data — clear retry
        await db
          .update(reportDeliveryLogs)
          .set({ nextRetryAt: null })
          .where(eq(reportDeliveryLogs.id, retryRow.id));
        continue;
      }

      const nextAttempt = retryRow.attemptNumber + 1;
      console.log(`[report-delivery] Retry #${nextAttempt} for ${inst.name}`);

      const { success, errorMessage } = await deliverReport(
        db,
        { ...inst, contactEmail: inst.contactEmail, reportCadence: inst.reportCadence },
        nextAttempt,
      );

      if (success) {
        // Mark old row's nextRetryAt as null, insert sent log, update nextRunAt
        await db
          .update(reportDeliveryLogs)
          .set({ nextRetryAt: null })
          .where(eq(reportDeliveryLogs.id, retryRow.id));

        await db.insert(reportDeliveryLogs).values({
          institutionId: inst.id,
          status: "sent",
          recipientEmail: retryRow.recipientEmail,
          attemptNumber: nextAttempt,
        });

        await db
          .update(institutions)
          .set({ reportNextRunAt: computeNextRunAt(inst.reportCadence as "weekly" | "monthly") })
          .where(eq(institutions.id, inst.id));

        console.log(`[report-delivery] Retry succeeded for ${inst.name}`);
      } else {
        const nextRetryAt = computeNextRetryAt(nextAttempt);
        // Clear the old retry row
        await db
          .update(reportDeliveryLogs)
          .set({ nextRetryAt: null })
          .where(eq(reportDeliveryLogs.id, retryRow.id));
        // Insert new failed row
        await db.insert(reportDeliveryLogs).values({
          institutionId: inst.id,
          status: "failed",
          recipientEmail: retryRow.recipientEmail,
          errorMessage: errorMessage ?? "Unknown error",
          attemptNumber: nextAttempt,
          nextRetryAt,
        });

        if (nextRetryAt === null) {
          console.warn(`[report-delivery] Exhausted retries (${nextAttempt}) for ${inst.name}`);
        } else {
          console.warn(`[report-delivery] Retry #${nextAttempt} failed for ${inst.name}: ${errorMessage}`);
        }
      }
    }
  } finally {
    await db.execute(sql`SELECT pg_advisory_unlock(7171)`);
  }
}
