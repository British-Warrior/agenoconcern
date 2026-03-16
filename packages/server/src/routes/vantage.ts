import { randomBytes, createHash } from "node:crypto";
import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db/index.js";
import { apiKeys, challenges } from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { apiKeyMiddleware, vantageRateLimiter } from "../middleware/api-key-auth.js";

const router = Router();

// ─── POST /keys — Create API key (admin-only, cookie-auth) ────────────────────
// This route uses cookie/JWT auth, not API key auth.
// The raw key is returned exactly once and never stored or logged.
const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).default(["vantage"]),
  expiresInDays: z.number().int().positive().default(365),
});

router.post("/keys", authMiddleware, requireRole("admin"), async (req, res) => {
  const result = createKeySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { name, scopes, expiresInDays } = result.data;

  const raw = randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(raw).digest("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const db = getDb();
  const [inserted] = await db
    .insert(apiKeys)
    .values({
      name,
      keyHash,
      scopes,
      expiresAt,
      createdBy: req.contributor!.id,
    })
    .returning();

  // raw is returned exactly once — never log it
  res.status(201).json({
    key: raw,
    id: inserted.id,
    name: inserted.name,
    scopes: inserted.scopes,
    expiresAt: inserted.expiresAt,
  });
});

// ─── VANTAGE-authenticated routes (rate limiter FIRST, then auth) ─────────────
// Rate limiter applied before apiKeyMiddleware to throttle unauthenticated flooding.
router.use(vantageRateLimiter);
router.use(apiKeyMiddleware);

// ─── GET /challenges — Paginated open challenges ──────────────────────────────
router.get("/challenges", async (req, res) => {
  const db = getDb();
  const { page = "1", limit = "20", domain } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  // Build WHERE conditions
  const conditions: ReturnType<typeof eq>[] = [eq(challenges.status, "open")];
  if (domain) {
    conditions.push(sql`${challenges.domain} @> ${JSON.stringify([domain])}::jsonb` as ReturnType<typeof eq>);
  }

  const [allChallenges, [{ total }]] = await Promise.all([
    db
      .select({
        id: challenges.id,
        title: challenges.title,
        description: challenges.description,
        domain: challenges.domain,
        skillsNeeded: challenges.skillsNeeded,
        type: challenges.type,
        deadline: challenges.deadline,
        circleSize: challenges.circleSize,
        status: challenges.status,
        createdAt: challenges.createdAt,
      })
      .from(challenges)
      .where(and(...conditions))
      .limit(limitNum)
      .offset(offset),
    db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(challenges)
      .where(and(...conditions)),
  ]);

  res.json({
    challenges: allChallenges,
    total,
    page: pageNum,
    limit: limitNum,
  });
});

// ─── GET /challenges/:id — Single challenge ───────────────────────────────────
router.get("/challenges/:id", async (req, res) => {
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

  res.json(challenge);
});

export { router as vantageRoutes };
