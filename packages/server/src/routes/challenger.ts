import { Router } from "express";
import * as argon2 from "argon2";
import { and, desc, eq, sql } from "drizzle-orm";
import type { Request, Response } from "express";
import { getDb } from "../db/index.js";
import {
  contributors,
  challengerOrganisations,
  challenges,
  circles,
  circleMembers,
  circleResolutions,
  resolutionRatings,
} from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { createTokens, setAuthCookies } from "../services/auth.service.js";
import {
  registerChallengerSchema,
  submitChallengerChallengeSchema,
} from "@indomitable-unity/shared";

const router = Router();

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── POST /register — Public registration ─────────────────────────────────────

router.post("/register", async (req: Request, res: Response) => {
  const result = registerChallengerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { contactName, email, password, organisationName, organisationType } = result.data;
  const db = getDb();

  // Check for existing contributor with same email
  const [existing] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, email.toLowerCase()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await argon2.hash(password);

  try {
    const { contributor, org } = await db.transaction(async (tx) => {
      const [newContributor] = await tx
        .insert(contributors)
        .values({
          name: contactName,
          email: email.toLowerCase(),
          passwordHash,
          authProvider: "email",
          role: "challenger",
          status: "active",
        })
        .returning({
          id: contributors.id,
          name: contributors.name,
          email: contributors.email,
          role: contributors.role,
          status: contributors.status,
        });

      const [newOrg] = await tx
        .insert(challengerOrganisations)
        .values({
          name: organisationName,
          contactEmail: email.toLowerCase(),
          contributorId: newContributor.id,
          organisationType,
        })
        .returning({
          id: challengerOrganisations.id,
          name: challengerOrganisations.name,
          contactEmail: challengerOrganisations.contactEmail,
          organisationType: challengerOrganisations.organisationType,
          createdAt: challengerOrganisations.createdAt,
        });

      return { contributor: newContributor, org: newOrg };
    });

    const tokens = await createTokens(contributor.id, contributor.role);
    setAuthCookies(res, tokens);

    res.status(201).json({
      contributor: {
        id: contributor.id,
        name: contributor.name,
        email: contributor.email,
        role: contributor.role,
      },
      organisation: {
        id: org.id,
        name: org.name,
        organisationType: org.organisationType,
      },
    });
  } catch (err) {
    console.error("[challenger] Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── GET /me — Get challenger org data ────────────────────────────────────────

router.get("/me", authMiddleware, requireRole("challenger"), async (req: Request, res: Response) => {
  const db = getDb();

  const [org] = await db
    .select({
      id: challengerOrganisations.id,
      name: challengerOrganisations.name,
      contactEmail: challengerOrganisations.contactEmail,
      organisationType: challengerOrganisations.organisationType,
      createdAt: challengerOrganisations.createdAt,
    })
    .from(challengerOrganisations)
    .where(eq(challengerOrganisations.contributorId, req.contributor!.id))
    .limit(1);

  if (!org) {
    res.status(404).json({ error: "Organisation not found" });
    return;
  }

  res.json({ organisation: org });
});

// ─── POST /challenges — Submit a challenge brief (draft) ──────────────────────

router.post(
  "/challenges",
  authMiddleware,
  requireRole("challenger"),
  async (req: Request, res: Response) => {
    const result = submitChallengerChallengeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    const { title, brief, domain, skillsNeeded, type, deadline, circleSize } = result.data;
    const db = getDb();

    try {
      const [created] = await db
        .insert(challenges)
        .values({
          title,
          description: brief, // description mirrors brief for challenger submissions
          brief,
          domain,
          skillsNeeded,
          type: type as "community" | "premium" | "knowledge_transition",
          deadline: deadline ? new Date(deadline).toISOString().split("T")[0] : null,
          circleSize: circleSize ?? 4,
          createdBy: req.contributor!.id,
          status: "draft",
        })
        .returning();

      res.status(201).json({ challenge: created });
    } catch (err) {
      console.error("[challenger] Challenge submission error:", err);
      res.status(500).json({ error: "Failed to submit challenge" });
    }
  },
);

// ─── GET /challenges — List challenger's own challenges ───────────────────────

router.get(
  "/challenges",
  authMiddleware,
  requireRole("challenger"),
  async (req: Request, res: Response) => {
    const db = getDb();
    const contributorId = req.contributor!.id;

    // Get all challenges owned by this contributor
    const myChallenges = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        brief: challenges.brief,
        domain: challenges.domain,
        skillsNeeded: challenges.skillsNeeded,
        type: challenges.type,
        status: challenges.status,
        deadline: challenges.deadline,
        createdAt: challenges.createdAt,
      })
      .from(challenges)
      .where(eq(challenges.createdBy, contributorId))
      .orderBy(desc(challenges.createdAt));

    if (myChallenges.length === 0) {
      res.json({ challenges: [] });
      return;
    }

    const challengeIds = myChallenges.map((c) => c.id);

    // Get circle data for each challenge (a challenge has at most one circle)
    const circleRows = await db
      .select({
        challengeId: circles.challengeId,
        id: circles.id,
        status: circles.status,
        memberCount: sql<number>`COUNT(${circleMembers.id})::int`,
      })
      .from(circles)
      .leftJoin(circleMembers, eq(circleMembers.circleId, circles.id))
      .where(
        challengeIds.length === 1
          ? eq(circles.challengeId, challengeIds[0]!)
          : sql`${circles.challengeId} = ANY(ARRAY[${sql.join(
              challengeIds.map((id) => sql`${id}::uuid`),
              sql`, `,
            )}])`,
      )
      .groupBy(circles.id, circles.challengeId, circles.status);

    const circleByChallenge = new Map(circleRows.map((c) => [c.challengeId, c]));

    const items = myChallenges.map((challenge) => {
      const circle = circleByChallenge.get(challenge.id);
      return {
        ...challenge,
        deadline: challenge.deadline ? String(challenge.deadline) : null,
        createdAt: challenge.createdAt.toISOString(),
        circle: circle
          ? {
              id: circle.id,
              status: circle.status,
              memberCount: circle.memberCount,
            }
          : null,
      };
    });

    res.json({ challenges: items });
  },
);

// ─── GET /challenges/:id — Get single challenge with circle detail ─────────────

router.get(
  "/challenges/:id",
  authMiddleware,
  requireRole("challenger"),
  async (req: Request, res: Response) => {
    const challengeId = req.params["id"] as string;
    const contributorId = req.contributor!.id;

    if (!UUID_PATTERN.test(challengeId)) {
      res.status(400).json({ error: "Invalid challenge ID format" });
      return;
    }

    const db = getDb();

    // Get the challenge with ownership check
    const [challenge] = await db
      .select({
        id: challenges.id,
        title: challenges.title,
        brief: challenges.brief,
        domain: challenges.domain,
        skillsNeeded: challenges.skillsNeeded,
        type: challenges.type,
        status: challenges.status,
        deadline: challenges.deadline,
        createdAt: challenges.createdAt,
      })
      .from(challenges)
      .where(
        and(
          eq(challenges.id, challengeId),
          eq(challenges.createdBy, contributorId),
        ),
      )
      .limit(1);

    if (!challenge) {
      res.status(404).json({ error: "Challenge not found" });
      return;
    }

    // Get circle with member count
    const [circle] = await db
      .select({
        id: circles.id,
        status: circles.status,
      })
      .from(circles)
      .where(eq(circles.challengeId, challengeId))
      .limit(1);

    let circleDetail: {
      id: string;
      status: string;
      memberCount: number;
      members: { id: string; name: string }[];
    } | null = null;

    if (circle) {
      const members = await db
        .select({
          id: contributors.id,
          name: contributors.name,
        })
        .from(circleMembers)
        .innerJoin(contributors, eq(circleMembers.contributorId, contributors.id))
        .where(eq(circleMembers.circleId, circle.id));

      circleDetail = {
        id: circle.id,
        status: circle.status,
        memberCount: members.length,
        members,
      };
    }

    // Get resolution + rating if circle exists
    let resolutionDetail: {
      id: string;
      submittedAt: string;
      rating?: {
        rating: number;
        feedback: string | null;
        createdAt: string;
      } | null;
    } | null = null;

    if (circle) {
      const [resolution] = await db
        .select({
          id: circleResolutions.id,
          submittedAt: circleResolutions.submittedAt,
        })
        .from(circleResolutions)
        .where(eq(circleResolutions.circleId, circle.id))
        .limit(1);

      if (resolution) {
        const [ratingRow] = await db
          .select({
            rating: resolutionRatings.rating,
            feedback: resolutionRatings.feedback,
            createdAt: resolutionRatings.createdAt,
          })
          .from(resolutionRatings)
          .where(eq(resolutionRatings.resolutionId, resolution.id))
          .limit(1);

        resolutionDetail = {
          id: resolution.id,
          submittedAt: resolution.submittedAt.toISOString(),
          rating: ratingRow
            ? {
                rating: ratingRow.rating,
                feedback: ratingRow.feedback,
                createdAt: ratingRow.createdAt.toISOString(),
              }
            : null,
        };
      }
    }

    res.json({
      challenge: {
        ...challenge,
        deadline: challenge.deadline ? String(challenge.deadline) : null,
        createdAt: challenge.createdAt.toISOString(),
        circle: circleDetail,
        resolution: resolutionDetail,
      },
    });
  },
);

export { router as challengerRoutes };
