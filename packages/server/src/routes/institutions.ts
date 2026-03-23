import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  institutions,
  contributorInstitutions,
  challengeInterests,
  contributorHours,
} from "../db/schema.js";

const router = Router();

// Slug must be 2-100 characters: lowercase letters, digits, hyphens only
// Prevents path traversal, SQL confusion, and malformed input
const SLUG_PATTERN = /^[a-z0-9-]{2,100}$/;

// ─── GET /:slug — Public institution landing page data ────────────────────────

router.get("/:slug", async (req: Request, res: Response) => {
  const slug = req.params.slug as string;

  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Invalid institution slug" });
    return;
  }

  const db = getDb();

  const [institution] = await db
    .select()
    .from(institutions)
    .where(and(eq(institutions.slug, slug), eq(institutions.isActive, true)))
    .limit(1);

  if (!institution) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  // ── Compute live stats ────────────────────────────────────────────────────
  const assignmentRows = await db
    .select({ contributorId: contributorInstitutions.contributorId })
    .from(contributorInstitutions)
    .where(eq(contributorInstitutions.institutionId, institution.id));

  const memberIds = assignmentRows.map((r) => r.contributorId);

  let liveStats: { contributors: number; challenges: number; hours: number } | null = null;

  if (memberIds.length > 0) {
    // Batch-query challenge interests
    const ciRows = await db
      .select({ challengeId: challengeInterests.challengeId })
      .from(challengeInterests)
      .where(inArray(challengeInterests.contributorId, memberIds));

    const uniqueChallenges = new Set(ciRows.map((r) => r.challengeId));

    // Batch-query hours
    const hoursRows = await db
      .select({
        total: sql<string>`coalesce(sum(${contributorHours.hoursLogged}), 0)`.as("total"),
      })
      .from(contributorHours)
      .where(inArray(contributorHours.contributorId, memberIds));

    const hoursTotal = Number(hoursRows[0]?.total ?? 0);

    liveStats = {
      contributors: memberIds.length,
      challenges: uniqueChallenges.size,
      hours: hoursTotal,
    };
  }

  // statsJson is preserved in DB as cache/fallback but not returned to the client
  res.json({
    id: institution.id,
    name: institution.name,
    slug: institution.slug,
    description: institution.description,
    city: institution.city,
    stats: liveStats,
  });
});

export { router as institutionRoutes };
