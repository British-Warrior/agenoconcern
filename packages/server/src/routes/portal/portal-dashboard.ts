import { Router } from "express";
import type { Request, Response } from "express";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import {
  institutions,
  contributorInstitutions,
  challengeInterests,
  contributorHours,
  ithinkAttentionFlags,
  contributors,
  wellbeingCheckins,
} from "../../db/schema.js";
import { portalAuthMiddleware } from "../../middleware/portal-auth.js";
import { buildInstitutionReport, type ReportData } from "../../pdf/institution-report.js";
import { rawToMetric, metricToBand } from "../../lib/swemwbs-rasch.js";

const router = Router();

// All dashboard routes require portal auth
router.use(portalAuthMiddleware);

// ---------------------------------------------------------------------------
// GET /dashboard — Institution stats scoped to portal user's institution
// ---------------------------------------------------------------------------

router.get("/dashboard", async (req: Request, res: Response) => {
  const institutionId = req.portalUser!.institutionId;
  const db = getDb();

  // Look up institution name
  const [institution] = await db
    .select({ name: institutions.name })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .limit(1);

  if (!institution) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  // Get contributor IDs for this institution
  const assignments = await db
    .select({ contributorId: contributorInstitutions.contributorId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.institutionId, institutionId));

  if (assignments.length === 0) {
    res.json({
      institutionName: institution.name,
      stats: { contributors: 0, challenges: 0, hours: 0 },
    });
    return;
  }

  const contributorIds = assignments.map((a) => a.contributorId);

  // Count unique challenges
  const ciRows = await db
    .select({ challengeId: challengeInterests.challengeId })
    .from(challengeInterests)
    .where(inArray(challengeInterests.contributorId, contributorIds));

  const uniqueChallenges = new Set(ciRows.map((r) => r.challengeId));

  // Sum hours
  const hoursRows = await db
    .select({ hoursLogged: contributorHours.hoursLogged })
    .from(contributorHours)
    .where(inArray(contributorHours.contributorId, contributorIds));

  const totalHours = hoursRows.reduce((sum, r) => sum + r.hoursLogged, 0);

  res.json({
    institutionName: institution.name,
    stats: {
      contributors: contributorIds.length,
      challenges: uniqueChallenges.size,
      hours: totalHours,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /report.pdf — Stream institution PDF report (no slug — scoped by portal JWT)
// ---------------------------------------------------------------------------

router.get("/report.pdf", async (req: Request, res: Response) => {
  const institutionId = req.portalUser!.institutionId;
  const db = getDb();

  // Look up institution
  const [institution] = await db
    .select({
      id: institutions.id,
      name: institutions.name,
      city: institutions.city,
      slug: institutions.slug,
    })
    .from(institutions)
    .where(eq(institutions.id, institutionId))
    .limit(1);

  if (!institution) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  // Fetch contributor assignments
  const assignments = await db
    .select({ contributorId: contributorInstitutions.contributorId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.institutionId, institutionId));

  if (assignments.length === 0) {
    res.status(422).json({
      error: "No contributors assigned to this institution — cannot generate report",
    });
    return;
  }

  const contributorIds = assignments.map((a) => a.contributorId);

  // Unique challenges (no date filtering for portal — all-time)
  const ciRows = await db
    .select({ challengeId: challengeInterests.challengeId })
    .from(challengeInterests)
    .where(inArray(challengeInterests.contributorId, contributorIds));

  const uniqueChallenges = new Set(ciRows.map((r) => r.challengeId));

  // Hours (all-time)
  const hoursRows = await db
    .select({ hoursLogged: contributorHours.hoursLogged })
    .from(contributorHours)
    .where(inArray(contributorHours.contributorId, contributorIds));

  const totalHours = hoursRows.reduce((sum, r) => sum + r.hoursLogged, 0);

  // Wellbeing band (consent-filtered, latest per contributor, k=5 threshold)
  const K_ANONYMITY = 5;
  let wellbeingBand: "Low" | "Typical" | "High" | null = null;
  let wellbeingMessage: string | undefined;

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
    const bandCounts: Record<"Low" | "Typical" | "High", number> = {
      Low: 0,
      Typical: 0,
      High: 0,
    };
    for (const row of wellbeingRows) {
      try {
        const metric = rawToMetric(row.wemwbsScore);
        const band = metricToBand(metric);
        bandCounts[band]++;
      } catch {
        // Skip invalid scores
      }
    }
    // Modal band — Typical wins ties
    if (bandCounts.Typical >= bandCounts.Low && bandCounts.Typical >= bandCounts.High) {
      wellbeingBand = "Typical";
    } else if (bandCounts.Low >= bandCounts.High) {
      wellbeingBand = "Low";
    } else {
      wellbeingBand = "High";
    }
  }

  const reportData: ReportData = {
    institutionName: institution.name,
    institutionCity: institution.city ?? null,
    stats: {
      contributors: contributorIds.length,
      challenges: uniqueChallenges.size,
      hours: totalHours,
    },
    generatedAt: new Date(),
    dateRange: { startDate: null, endDate: null },
    wellbeingBand,
    wellbeingMessage,
  };

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="impact-report-${institution.slug}.pdf"`,
  );
  res.setHeader("Cache-Control", "no-store");

  const doc = buildInstitutionReport(reportData);
  doc.pipe(res);
  doc.end();
});

// ---------------------------------------------------------------------------
// GET /attention — Active (unresolved) attention flags for portal user's institution
// ---------------------------------------------------------------------------

router.get("/attention", async (req: Request, res: Response) => {
  const institutionId = req.portalUser!.institutionId;
  const db = getDb();

  const flags = await db
    .select({
      id: ithinkAttentionFlags.id,
      contributorId: ithinkAttentionFlags.contributorId,
      contributorName: contributors.name,
      signalType: ithinkAttentionFlags.signalType,
      cohortSize: ithinkAttentionFlags.cohortSize,
      flaggedCount: ithinkAttentionFlags.flaggedCount,
      createdAt: ithinkAttentionFlags.createdAt,
    })
    .from(ithinkAttentionFlags)
    .innerJoin(contributors, eq(contributors.id, ithinkAttentionFlags.contributorId))
    .where(
      sql`${ithinkAttentionFlags.institutionId} = ${institutionId} AND ${ithinkAttentionFlags.clearedAt} IS NULL`,
    )
    .orderBy(desc(ithinkAttentionFlags.createdAt));

  res.json(flags);
});

export { router as portalDashboardRoutes };
