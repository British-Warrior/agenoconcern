import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  challengeInterests,
  challenges,
  contributorHours,
  paymentTransactions,
  circleMembers,
  circleResolutions,
  resolutionRatings,
  circles,
  wellbeingCheckins,
} from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import type { ImpactSummary, ImpactChallenge, ImpactEarning, ChallengerImpact, WellbeingTrajectoryPoint } from "@indomitable-unity/shared";

const router = Router();

// ─── GET /summary — Contributor impact summary ────────────────────────────────
router.get("/summary", authMiddleware, async (req, res) => {
  const contributorId = req.contributor!.id;
  const db = getDb();

  const [challengeRows, hoursRows, earningsRows, wellbeingRows] = await Promise.all([
    // a. Challenges participated
    db
      .select({
        id: challenges.id,
        title: challenges.title,
        domain: challenges.domain,
        type: challenges.type,
        status: challenges.status,
        circleId: circleMembers.circleId,
      })
      .from(challengeInterests)
      .innerJoin(challenges, eq(challengeInterests.challengeId, challenges.id))
      .leftJoin(
        circleMembers,
        eq(circleMembers.contributorId, contributorId),
      )
      .where(eq(challengeInterests.contributorId, contributorId)),

    // b. Hours logged
    db
      .select()
      .from(contributorHours)
      .where(eq(contributorHours.contributorId, contributorId))
      .orderBy(desc(contributorHours.loggedAt)),

    // c. Earnings (transferred only)
    db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.contributorId, contributorId))
      .orderBy(desc(paymentTransactions.createdAt)),

    // d. Wellbeing trajectory
    db
      .select({
        uclaScore: wellbeingCheckins.uclaScore,
        wemwbsScore: wellbeingCheckins.wemwbsScore,
        completedAt: wellbeingCheckins.completedAt,
      })
      .from(wellbeingCheckins)
      .where(eq(wellbeingCheckins.contributorId, contributorId))
      .orderBy(wellbeingCheckins.completedAt),
  ]);

  // Deduplicate challenges — a contributor may appear in multiple circle members rows
  const seenChallengeIds = new Set<string>();
  const challengesParticipated: ImpactChallenge[] = [];
  for (const row of challengeRows) {
    if (!seenChallengeIds.has(row.id)) {
      seenChallengeIds.add(row.id);
      challengesParticipated.push({
        id: row.id,
        title: row.title,
        domain: row.domain,
        type: row.type,
        status: row.status,
        circleId: row.circleId ?? undefined,
      });
    }
  }

  // Compute hours totals
  const totalHours = hoursRows.reduce((sum, h) => sum + h.hoursLogged, 0);
  const paidHours = hoursRows.reduce((sum, h) => sum + (h.isPaid ? h.hoursLogged : 0), 0);
  const unpaidHours = totalHours - paidHours;

  // Compute earnings from transferred transactions
  const transferredRows = earningsRows.filter((t) => t.status === "transferred");
  const totalEarningsPence = transferredRows.reduce((sum, t) => sum + t.amountPence, 0);
  const earnings: ImpactEarning[] = transferredRows.map((t) => ({
    id: t.id,
    paymentType: t.paymentType,
    amountPence: t.amountPence,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  const wellbeingTrajectory: WellbeingTrajectoryPoint[] = wellbeingRows.map((r) => ({
    uclaScore: r.uclaScore,
    wemwbsScore: r.wemwbsScore,
    completedAt: r.completedAt.toISOString(),
  }));

  const summary: ImpactSummary = {
    challengesParticipated,
    totalHours,
    paidHours,
    unpaidHours,
    totalEarningsPence,
    earnings,
    wellbeingTrajectory,
  };

  res.json(summary);
});

// ─── GET /challenger — Challenger's challenges with resolutions and ratings ───
router.get("/challenger", authMiddleware, async (req, res) => {
  const contributorId = req.contributor!.id;
  const db = getDb();

  // Get all challenges created by this user
  const challengeRows = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      status: challenges.status,
    })
    .from(challenges)
    .where(eq(challenges.createdBy, contributorId))
    .orderBy(desc(challenges.createdAt));

  if (challengeRows.length === 0) {
    const result: ChallengerImpact = { challenges: [] };
    res.json(result);
    return;
  }

  // For each challenge, look up circle -> resolution -> rating
  const enrichedChallenges = await Promise.all(
    challengeRows.map(async (challenge) => {
      // Find the circle for this challenge
      const [circle] = await db
        .select({ id: circles.id })
        .from(circles)
        .where(eq(circles.challengeId, challenge.id))
        .limit(1);

      if (!circle) {
        return {
          id: challenge.id,
          title: challenge.title,
          status: challenge.status,
          resolution: undefined,
          rating: undefined,
        };
      }

      const [resolution] = await db
        .select()
        .from(circleResolutions)
        .where(eq(circleResolutions.circleId, circle.id))
        .limit(1);

      if (!resolution) {
        return {
          id: challenge.id,
          title: challenge.title,
          status: challenge.status,
          resolution: undefined,
          rating: undefined,
        };
      }

      const [rating] = await db
        .select()
        .from(resolutionRatings)
        .where(eq(resolutionRatings.resolutionId, resolution.id))
        .limit(1);

      return {
        id: challenge.id,
        title: challenge.title,
        status: challenge.status,
        resolution: {
          problemSummary: resolution.problemSummary,
          recommendations: resolution.recommendations,
          submittedAt: resolution.submittedAt.toISOString(),
        },
        rating: rating
          ? {
              rating: rating.rating,
              feedback: rating.feedback ?? null,
              createdAt: rating.createdAt.toISOString(),
            }
          : undefined,
      };
    }),
  );

  const result: ChallengerImpact = { challenges: enrichedChallenges };
  res.json(result);
});

export { router as impactRoutes };
