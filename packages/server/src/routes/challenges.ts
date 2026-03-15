import { Router } from "express";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  challenges,
  challengeInterests,
  contributorProfiles,
  contributors,
} from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { scoreContributorForChallenge, suggestTeamCompositions } from "../services/matching.service.js";
import { notify } from "../services/notification.service.js";
import {
  createChallengeSchema,
  updateChallengeSchema,
  interestNoteSchema,
} from "@indomitable-unity/shared";

const router = Router();

// ─── GET / — Challenge feed ───────────────────────────────────────────────────
// Authenticated. Fetches all open challenges, scores them in TypeScript,
// sorts by score desc then createdAt desc. Paginated.
router.get("/", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;
  const { domain, type, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  // Fetch contributor profile for scoring
  const [profile] = await db
    .select({
      skills: contributorProfiles.skills,
      domainPreferences: contributorProfiles.domainPreferences,
    })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  const contributorSkills: string[] = profile?.skills ?? [];
  const contributorDomains: string[] = profile?.domainPreferences ?? [];

  // Build WHERE conditions
  const conditions = [eq(challenges.status, "open")];
  if (domain) conditions.push(sql`${challenges.domain} @> ${JSON.stringify([domain])}::jsonb`);
  if (type === "paid" || type === "free") conditions.push(eq(challenges.type, type));

  // Fetch all matching challenges (TypeScript scoring — avoids JSONB array operator bug)
  const allChallenges = await db
    .select()
    .from(challenges)
    .where(and(...conditions));

  // Fetch contributor's interests for these challenges
  const challengeIds = allChallenges.map((c) => c.id);
  let myInterestMap: Record<string, "active" | "withdrawn"> = {};
  if (challengeIds.length > 0) {
    const myInterests = await db
      .select({
        challengeId: challengeInterests.challengeId,
        status: challengeInterests.status,
      })
      .from(challengeInterests)
      .where(eq(challengeInterests.contributorId, contributorId));
    for (const i of myInterests) {
      myInterestMap[i.challengeId] = i.status;
    }
  }

  // Score and sort — match score is internal, never returned in feed
  const scored = allChallenges.map((c) => ({
    ...c,
    _score: scoreContributorForChallenge(
      contributorSkills,
      contributorDomains,
      (c.skillsNeeded as string[]) ?? [],
      c.domain,
    ),
    myInterest: (myInterestMap[c.id] ?? null) as "active" | "withdrawn" | null,
  }));

  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const paginated = scored.slice(offset, offset + limitNum);

  // Strip internal _score before responding
  const responseItems = paginated.map(({ _score: _ignored, ...c }) => c);

  res.json({ challenges: responseItems, page: pageNum, hasMore: paginated.length === limitNum });
});

// ─── GET /my-interests ────────────────────────────────────────────────────────
// Authenticated. Contributor's active interests joined with challenges.
// NOTE: This route must be declared before /:id to avoid matching "my-interests" as an ID.
router.get("/my-interests", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;

  const interests = await db
    .select({
      interest: challengeInterests,
      challenge: challenges,
    })
    .from(challengeInterests)
    .innerJoin(challenges, eq(challengeInterests.challengeId, challenges.id))
    .where(
      and(
        eq(challengeInterests.contributorId, contributorId),
        eq(challengeInterests.status, "active"),
      ),
    );

  res.json({ interests });
});

// ─── GET /:id ─────────────────────────────────────────────────────────────────
// Authenticated. Full challenge with myInterest.
router.get("/:id", authMiddleware, async (req, res) => {
  const db = getDb();
  const challengeId = req.params["id"] as string;
  const contributorId = req.contributor!.id;

  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const [interest] = await db
    .select({ status: challengeInterests.status })
    .from(challengeInterests)
    .where(
      and(
        eq(challengeInterests.challengeId, challengeId),
        eq(challengeInterests.contributorId, contributorId),
      ),
    )
    .limit(1);

  res.json({ ...challenge, myInterest: interest?.status ?? null });
});

// ─── POST / — Create challenge (CM only) ─────────────────────────────────────
router.post("/", authMiddleware, requireRole("community_manager"), async (req, res) => {
  const result = createChallengeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const db = getDb();
  const { deadline, ...rest } = result.data;

  const [created] = await db
    .insert(challenges)
    .values({
      ...rest,
      deadline: deadline ?? null,
      createdBy: req.contributor!.id,
      status: "open",
    })
    .returning();

  res.status(201).json(created);
});

// ─── PUT /:id — Update challenge (CM only) ────────────────────────────────────
// Edit lock: if interestCount > 0, only status changes are allowed.
router.put("/:id", authMiddleware, requireRole("community_manager"), async (req, res) => {
  const db = getDb();
  const challengeId = req.params["id"] as string;

  const [existing] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const result = updateChallengeSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const updates = result.data;

  // Edit lock: if interest exists, only status field is permitted
  if (existing.interestCount > 0) {
    const nonStatusKeys = Object.keys(updates).filter((k) => k !== "status");
    if (nonStatusKeys.length > 0) {
      res.status(409).json({
        error:
          "Challenge cannot be edited after interest has been expressed. You can close or archive it.",
      });
      return;
    }
  }

  const { deadline, ...restUpdates } = updates;
  const setValues: Record<string, unknown> = {
    ...restUpdates,
    updatedAt: new Date(),
  };
  if (deadline !== undefined) {
    setValues.deadline = deadline ?? null;
  }

  const [updated] = await db
    .update(challenges)
    .set(setValues)
    .where(eq(challenges.id, challengeId))
    .returning();

  res.json(updated);
});

// ─── POST /:id/interest — Toggle interest ─────────────────────────────────────
// 24-hour cooldown on re-expression after withdrawal.
// Returns soft capacity warning data.
router.post("/:id/interest", authMiddleware, async (req, res) => {
  const db = getDb();
  const challengeId = req.params["id"] as string;
  const contributorId = req.contributor!.id;

  // Validate optional note
  const noteResult = interestNoteSchema.safeParse(req.body);
  if (!noteResult.success) {
    res.status(400).json({ error: noteResult.error.flatten() });
    return;
  }
  const { note } = noteResult.data;

  // Check challenge exists
  const [challenge] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  // Check existing interest record
  const [existing] = await db
    .select()
    .from(challengeInterests)
    .where(
      and(
        eq(challengeInterests.challengeId, challengeId),
        eq(challengeInterests.contributorId, contributorId),
      ),
    )
    .limit(1);

  if (existing) {
    if (existing.status === "active") {
      // Withdraw
      await db
        .update(challengeInterests)
        .set({ status: "withdrawn", lastWithdrawnAt: new Date(), updatedAt: new Date() })
        .where(eq(challengeInterests.id, existing.id));

      await db
        .update(challenges)
        .set({
          interestCount: sql`${challenges.interestCount} - 1`,
          updatedAt: new Date(),
        })
        .where(eq(challenges.id, challengeId));

      res.json({ status: "withdrawn" });
      return;
    }

    // Re-express: enforce 24-hour cooldown
    if (existing.lastWithdrawnAt) {
      const hoursSince =
        (Date.now() - new Date(existing.lastWithdrawnAt).getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const cooldownRemainingHours = Math.ceil(24 - hoursSince);
        res.status(429).json({
          error: `You can re-express interest after ${cooldownRemainingHours} hour${cooldownRemainingHours !== 1 ? "s" : ""}.`,
          cooldownRemainingHours,
        });
        return;
      }
    }

    // Re-activate
    await db
      .update(challengeInterests)
      .set({ status: "active", note: note ?? existing.note, updatedAt: new Date() })
      .where(eq(challengeInterests.id, existing.id));

    await db
      .update(challenges)
      .set({
        interestCount: sql`${challenges.interestCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(challenges.id, challengeId));

    // Fetch active interest count and maxCircles for soft capacity warning
    const [profileData] = await db
      .select({ maxCircles: contributorProfiles.maxCircles })
      .from(contributorProfiles)
      .where(eq(contributorProfiles.contributorId, contributorId))
      .limit(1);

    const [{ count: activeCount }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(challengeInterests)
      .where(
        and(
          eq(challengeInterests.contributorId, contributorId),
          eq(challengeInterests.status, "active"),
        ),
      );

    res.json({
      status: "active",
      activeInterestCount: activeCount,
      maxCircles: profileData?.maxCircles ?? 3,
    });
    return;
  }

  // First-time interest: compute match score
  const [profileData] = await db
    .select({
      skills: contributorProfiles.skills,
      domainPreferences: contributorProfiles.domainPreferences,
      maxCircles: contributorProfiles.maxCircles,
    })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  const matchScore = scoreContributorForChallenge(
    profileData?.skills ?? [],
    profileData?.domainPreferences ?? [],
    (challenge.skillsNeeded as string[]) ?? [],
    challenge.domain,
  );

  await db.insert(challengeInterests).values({
    challengeId,
    contributorId,
    note: note ?? null,
    matchScore,
    status: "active",
  });

  await db
    .update(challenges)
    .set({
      interestCount: sql`${challenges.interestCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(challenges.id, challengeId));

  // Fetch updated active count for soft capacity warning
  const [{ count: activeCount }] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(challengeInterests)
    .where(
      and(
        eq(challengeInterests.contributorId, contributorId),
        eq(challengeInterests.status, "active"),
      ),
    );

  // Notify the contributor that they've expressed interest in a challenge match
  notify(contributorId, {
    type: "challenge_match",
    title: "Interest registered",
    body: `You've expressed interest in "${challenge.title}". We'll notify you when a Circle forms.`,
    url: `/challenges/${challengeId}`,
  }).catch((err: unknown) => console.error("[notifications] challenge_match notify error:", err));

  res.status(201).json({
    status: "active",
    activeInterestCount: activeCount,
    maxCircles: profileData?.maxCircles ?? 3,
  });
});

// ─── GET /:id/interests — List interested contributors ────────────────────────
// CM sees all names. Regular contributor sees own name only.
router.get("/:id/interests", authMiddleware, async (req, res) => {
  const db = getDb();
  const challengeId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const isCM =
    req.contributor!.role === "community_manager" || req.contributor!.role === "admin";

  const [challenge] = await db
    .select({ id: challenges.id })
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    res.status(404).json({ error: "Challenge not found" });
    return;
  }

  const interests = await db
    .select({
      id: challengeInterests.id,
      contributorId: challengeInterests.contributorId,
      note: challengeInterests.note,
      createdAt: challengeInterests.createdAt,
      name: contributors.name,
    })
    .from(challengeInterests)
    .innerJoin(contributors, eq(challengeInterests.contributorId, contributors.id))
    .where(
      and(
        eq(challengeInterests.challengeId, challengeId),
        eq(challengeInterests.status, "active"),
      ),
    );

  // Phase 3: contributor sees own name; CM sees all names.
  // Phase 4 will add: contributor can see names of prior circle members.
  const response = interests.map((i) => ({
    id: i.id,
    name: isCM || i.contributorId === contributorId ? i.name : null,
    note: isCM || i.contributorId === contributorId ? i.note : null,
    isYou: i.contributorId === contributorId,
    createdAt: i.createdAt,
  }));

  res.json({ interests: response, count: interests.length });
});

// ─── GET /:id/team-suggestions — CM only ─────────────────────────────────────
router.get(
  "/:id/team-suggestions",
  authMiddleware,
  requireRole("community_manager"),
  async (req, res) => {
    const db = getDb();
    const challengeId = req.params["id"] as string;

    const [challenge] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    const challengeSkills = (challenge.skillsNeeded as string[]) ?? [];

    // Fetch all active interested contributors with their profiles
    const interested = await db
      .select({
        contributorId: challengeInterests.contributorId,
        name: contributors.name,
        skills: contributorProfiles.skills,
      })
      .from(challengeInterests)
      .innerJoin(contributors, eq(challengeInterests.contributorId, contributors.id))
      .leftJoin(
        contributorProfiles,
        eq(contributorProfiles.contributorId, challengeInterests.contributorId),
      )
      .where(
        and(
          eq(challengeInterests.challengeId, challengeId),
          eq(challengeInterests.status, "active"),
        ),
      );

    const candidates = interested.map((i) => ({
      id: i.contributorId,
      name: i.name,
      skills: (i.skills as string[]) ?? [],
      score: scoreContributorForChallenge(
        (i.skills as string[]) ?? [],
        [],
        challengeSkills,
        challenge.domain,
      ),
    }));

    const compositions = suggestTeamCompositions(
      candidates,
      challengeSkills,
      challenge.circleSize,
    );

    res.json({ compositions });
  },
);

export { router as challengeRoutes };
