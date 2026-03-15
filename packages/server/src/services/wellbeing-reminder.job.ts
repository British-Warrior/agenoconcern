import cron from "node-cron";
import { and, eq, lt, notExists, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { contributors, wellbeingCheckins } from "../db/schema.js";
import { notifyBatch } from "./notification.service.js";

const OVERDUE_DAYS = 56; // 8 weeks

export function startWellbeingReminderJob(): void {
  // Run daily at 09:00 UTC
  cron.schedule("0 9 * * *", async () => {
    try {
      await runWellbeingReminderJob();
    } catch (err: unknown) {
      console.error("[wellbeing-reminder] Job error:", err);
    }
  });

  console.log("[wellbeing-reminder] Scheduled daily at 09:00 UTC");
}

async function runWellbeingReminderJob(): Promise<void> {
  const db = getDb();
  const cutoff = new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000);

  // 1. Contributors with check-ins but most recent is older than 56 days
  const overdueCheckins = await db
    .select({
      contributorId: wellbeingCheckins.contributorId,
    })
    .from(wellbeingCheckins)
    .groupBy(wellbeingCheckins.contributorId)
    .having(lt(sql`MAX(${wellbeingCheckins.completedAt})`, cutoff));

  const overdueCheckinIds = overdueCheckins.map((r) => r.contributorId);

  // 2. Contributors with no check-ins at all, whose account was created > 56 days ago
  const noCheckinRows = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(
      and(
        lt(contributors.createdAt, cutoff),
        notExists(
          db
            .select({ id: wellbeingCheckins.id })
            .from(wellbeingCheckins)
            .where(eq(wellbeingCheckins.contributorId, contributors.id)),
        ),
      ),
    );

  const noCheckinIds = noCheckinRows.map((r) => r.id);

  // Combine and deduplicate
  const allIds = [...new Set([...overdueCheckinIds, ...noCheckinIds])];

  if (allIds.length === 0) {
    console.log("[wellbeing-reminder] No overdue contributors today");
    return;
  }

  await notifyBatch(allIds, {
    type: "wellbeing_reminder",
    title: "Wellbeing check-in due",
    body: "It has been 8 weeks since your last wellbeing check-in. Complete it now to track your wellbeing journey.",
    url: "/wellbeing/checkin",
  });

  console.log(`[wellbeing-reminder] Sent ${allIds.length} reminder(s)`);
}
