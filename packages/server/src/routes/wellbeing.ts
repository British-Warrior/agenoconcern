import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { wellbeingCheckins, consentRecords } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { wellbeingCheckinSchema } from "@indomitable-unity/shared";
import type { WellbeingCheckin, WellbeingDueResponse, WellbeingTrajectoryPoint } from "@indomitable-unity/shared";

const router = Router();

// ─── POST /checkin — Submit a wellbeing check-in ──────────────────────────────
router.post("/checkin", authMiddleware, async (req, res) => {
  const result = wellbeingCheckinSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { uclaItems, wemwbsItems } = result.data;
  const contributorId = req.contributor!.id;
  const db = getDb();

  // Compute scores
  const uclaScore = uclaItems[0] + uclaItems[1] + uclaItems[2];
  const wemwbsScore = wemwbsItems[0] + wemwbsItems[1] + wemwbsItems[2] + wemwbsItems[3] + wemwbsItems[4] + wemwbsItems[5] + wemwbsItems[6];

  // Insert GDPR explicit consent record for special category health data
  const [consentRecord] = await db
    .insert(consentRecords)
    .values({
      contributorId,
      purpose: "wellbeing_checkin",
      granted: true,
      policyVersion: "1.0",
      ipAddress: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
    })
    .returning({ id: consentRecords.id });

  // Insert wellbeing check-in
  const [checkin] = await db
    .insert(wellbeingCheckins)
    .values({
      contributorId,
      consentRecordId: consentRecord.id,
      uclaItem1: uclaItems[0],
      uclaItem2: uclaItems[1],
      uclaItem3: uclaItems[2],
      uclaScore,
      wemwbsItem1: wemwbsItems[0],
      wemwbsItem2: wemwbsItems[1],
      wemwbsItem3: wemwbsItems[2],
      wemwbsItem4: wemwbsItems[3],
      wemwbsItem5: wemwbsItems[4],
      wemwbsItem6: wemwbsItems[5],
      wemwbsItem7: wemwbsItems[6],
      wemwbsScore,
    })
    .returning({
      id: wellbeingCheckins.id,
      uclaScore: wellbeingCheckins.uclaScore,
      wemwbsScore: wellbeingCheckins.wemwbsScore,
      completedAt: wellbeingCheckins.completedAt,
    });

  const response: WellbeingCheckin = {
    id: checkin.id,
    uclaScore: checkin.uclaScore,
    wemwbsScore: checkin.wemwbsScore,
    completedAt: checkin.completedAt.toISOString(),
  };

  res.status(201).json(response);
});

// ─── GET /due — Check if a wellbeing check-in is due (56-day interval) ────────
router.get("/due", authMiddleware, async (req, res) => {
  const contributorId = req.contributor!.id;
  const db = getDb();

  const [latest] = await db
    .select({ completedAt: wellbeingCheckins.completedAt })
    .from(wellbeingCheckins)
    .where(eq(wellbeingCheckins.contributorId, contributorId))
    .orderBy(desc(wellbeingCheckins.completedAt))
    .limit(1);

  if (!latest) {
    const response: WellbeingDueResponse = { due: true, lastCheckinAt: null };
    res.json(response);
    return;
  }

  const lastCheckinAt = latest.completedAt.toISOString();
  const daysSinceLast = (Date.now() - latest.completedAt.getTime()) / (1000 * 60 * 60 * 24);
  const due = daysSinceLast > 56;

  const response: WellbeingDueResponse = { due, lastCheckinAt };
  res.json(response);
});

// ─── GET /history — Score trajectory for impact dashboard ─────────────────────
router.get("/history", authMiddleware, async (req, res) => {
  const contributorId = req.contributor!.id;
  const db = getDb();

  const rows = await db
    .select({
      uclaScore: wellbeingCheckins.uclaScore,
      wemwbsScore: wellbeingCheckins.wemwbsScore,
      completedAt: wellbeingCheckins.completedAt,
    })
    .from(wellbeingCheckins)
    .where(eq(wellbeingCheckins.contributorId, contributorId))
    .orderBy(wellbeingCheckins.completedAt);

  const trajectory: WellbeingTrajectoryPoint[] = rows.map((r) => ({
    uclaScore: r.uclaScore,
    wemwbsScore: r.wemwbsScore,
    completedAt: r.completedAt.toISOString(),
  }));

  res.json(trajectory);
});

export { router as wellbeingRoutes };
