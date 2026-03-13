import crypto from "crypto";
import { Router } from "express";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  circles,
  circleMembers,
  circleNotes,
  noteAttachments,
  circleResolutions,
  resolutionRatings,
  challenges,
  contributors,
  contributorProfiles,
} from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import { getEnv } from "../config/env.js";
import { generateDownloadUrl } from "../services/s3.service.js";
import {
  createCircleSchema,
  postNoteSchema,
  submitResolutionSchema,
  rateResolutionSchema,
  setSocialChannelSchema,
  attachmentUrlSchema,
} from "@agenoconcern/shared";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function isCircleMember(
  circleId: string,
  contributorId: string,
  db: ReturnType<typeof getDb>,
): Promise<boolean> {
  const [row] = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(
      and(eq(circleMembers.circleId, circleId), eq(circleMembers.contributorId, contributorId)),
    )
    .limit(1);
  return !!row;
}

async function isChallenger(
  circleId: string,
  contributorId: string,
  db: ReturnType<typeof getDb>,
): Promise<boolean> {
  const [row] = await db
    .select({ createdBy: challenges.createdBy })
    .from(circles)
    .innerJoin(challenges, eq(circles.challengeId, challenges.id))
    .where(eq(circles.id, circleId))
    .limit(1);
  return row?.createdBy === contributorId;
}

async function canAccessCircle(
  circleId: string,
  contributorId: string,
  db: ReturnType<typeof getDb>,
): Promise<boolean> {
  return (
    (await isCircleMember(circleId, contributorId, db)) ||
    (await isChallenger(circleId, contributorId, db))
  );
}

function getS3ClientForCircles(): S3Client {
  const env = getEnv();
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
    throw new Error("S3 not configured");
  }
  return new S3Client({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
}

// ─── POST / — Create circle (CM only) ────────────────────────────────────────
router.post("/", authMiddleware, requireRole("community_manager"), async (req, res) => {
  const result = createCircleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { challengeId, memberIds } = result.data;
  const db = getDb();

  // Check multi-circle limit for each member
  for (const memberId of memberIds) {
    const [profile] = await db
      .select({ maxCircles: contributorProfiles.maxCircles })
      .from(contributorProfiles)
      .where(eq(contributorProfiles.contributorId, memberId))
      .limit(1);

    const maxCircles = profile?.maxCircles ?? 3;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(circleMembers)
      .innerJoin(circles, eq(circleMembers.circleId, circles.id))
      .where(
        and(
          eq(circleMembers.contributorId, memberId),
          inArray(circles.status, ["forming", "active", "submitted"]),
        ),
      );

    if (count >= maxCircles) {
      res.status(409).json({
        error: `Contributor ${memberId} has reached their maximum circle limit (${maxCircles}).`,
      });
      return;
    }
  }

  const createdBy = req.contributor!.id;
  const initialStatus = memberIds.length >= 3 ? "active" : "forming";

  const created = await db.transaction(async (tx) => {
    const [circle] = await tx
      .insert(circles)
      .values({ challengeId, createdBy, status: initialStatus })
      .returning();

    await tx.insert(circleMembers).values(
      memberIds.map((contributorId) => ({ circleId: circle.id, contributorId })),
    );

    return circle;
  });

  res.status(201).json(created);
});

// ─── GET / — List contributor's circles ──────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;

  const rows = await db
    .select({
      id: circles.id,
      challengeId: circles.challengeId,
      challengeTitle: challenges.title,
      status: circles.status,
      createdAt: circles.createdAt,
    })
    .from(circleMembers)
    .innerJoin(circles, eq(circleMembers.circleId, circles.id))
    .innerJoin(challenges, eq(circles.challengeId, challenges.id))
    .where(eq(circleMembers.contributorId, contributorId))
    .orderBy(desc(circles.createdAt));

  // Attach member counts
  const circleIds = rows.map((r) => r.id);
  let memberCountMap: Record<string, number> = {};

  if (circleIds.length > 0) {
    const counts = await db
      .select({
        circleId: circleMembers.circleId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(circleMembers)
      .where(inArray(circleMembers.circleId, circleIds))
      .groupBy(circleMembers.circleId);

    for (const c of counts) {
      memberCountMap[c.circleId] = c.count;
    }
  }

  const items = rows.map((r) => ({
    ...r,
    memberCount: memberCountMap[r.id] ?? 0,
  }));

  res.json({ circles: items });
});

// ─── GET /:id — Circle workspace ─────────────────────────────────────────────
// NOTE: Declared before /:id/... routes but static sub-paths must come first.
router.get("/:id", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const hasAccess = await canAccessCircle(circleId, contributorId, db);
  if (!hasAccess) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const [circle] = await db
    .select()
    .from(circles)
    .where(eq(circles.id, circleId))
    .limit(1);

  if (!circle) {
    res.status(404).json({ error: "Circle not found" });
    return;
  }

  const [challenge] = await db
    .select({
      id: challenges.id,
      title: challenges.title,
      brief: challenges.brief,
      domain: challenges.domain,
      skillsNeeded: challenges.skillsNeeded,
      type: challenges.type,
      createdBy: challenges.createdBy,
    })
    .from(challenges)
    .where(eq(challenges.id, circle.challengeId))
    .limit(1);

  const members = await db
    .select({
      id: circleMembers.id,
      contributorId: circleMembers.contributorId,
      name: contributors.name,
      joinedAt: circleMembers.joinedAt,
    })
    .from(circleMembers)
    .innerJoin(contributors, eq(circleMembers.contributorId, contributors.id))
    .where(eq(circleMembers.circleId, circleId));

  res.json({ circle, challenge, members });
});

// ─── POST /:id/members — Add member (CM only) ─────────────────────────────────
router.post(
  "/:id/members",
  authMiddleware,
  requireRole("community_manager"),
  async (req, res) => {
    const circleId = req.params["id"] as string;
    const { contributorId } = req.body as { contributorId?: string };
    const db = getDb();

    if (!contributorId) {
      res.status(400).json({ error: "contributorId is required" });
      return;
    }

    const [circle] = await db
      .select()
      .from(circles)
      .where(eq(circles.id, circleId))
      .limit(1);

    if (!circle) {
      res.status(404).json({ error: "Circle not found" });
      return;
    }

    // Check multi-circle limit
    const [profile] = await db
      .select({ maxCircles: contributorProfiles.maxCircles })
      .from(contributorProfiles)
      .where(eq(contributorProfiles.contributorId, contributorId))
      .limit(1);

    const maxCircles = profile?.maxCircles ?? 3;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(circleMembers)
      .innerJoin(circles as typeof circles, eq(circleMembers.circleId, circles.id))
      .where(
        and(
          eq(circleMembers.contributorId, contributorId),
          inArray(circles.status, ["forming", "active", "submitted"]),
        ),
      );

    if (count >= maxCircles) {
      res.status(409).json({
        error: `Contributor has reached their maximum circle limit (${maxCircles}).`,
      });
      return;
    }

    const [newMember] = await db
      .insert(circleMembers)
      .values({ circleId, contributorId })
      .returning();

    // Promote to active if now >= 3 members
    const [{ memberCount }] = await db
      .select({ memberCount: sql<number>`COUNT(*)::int` })
      .from(circleMembers)
      .where(eq(circleMembers.circleId, circleId));

    if (circle.status === "forming" && memberCount >= 3) {
      await db
        .update(circles)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(circles.id, circleId));
    }

    res.status(201).json(newMember);
  },
);

// ─── POST /:id/notes/attachment-url — Generate presigned upload URL ───────────
// MUST be declared before /:id/notes/:noteId to avoid route shadowing
router.post("/:id/notes/attachment-url", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const member = await isCircleMember(circleId, contributorId, db);
  if (!member) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const result = attachmentUrlSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { fileName, mimeType } = result.data;
  const env = getEnv();
  if (!env.S3_BUCKET) {
    res.status(503).json({ error: "S3 not configured" });
    return;
  }

  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const s3Key = `circle-notes/${circleId}/${crypto.randomUUID()}/${Date.now()}-${sanitizedFileName}`;

  const client = getS3ClientForCircles();
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  res.json({ uploadUrl, s3Key });
});

// ─── GET /:id/notes — Paginated notes feed ────────────────────────────────────
router.get("/:id/notes", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const hasAccess = await canAccessCircle(circleId, contributorId, db);
  if (!hasAccess) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const { cursor, limit = "20" } = req.query as Record<string, string>;
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const conditions = [eq(circleNotes.circleId, circleId)];
  if (cursor) {
    conditions.push(lt(circleNotes.createdAt, new Date(cursor)));
  }

  const notes = await db
    .select({
      id: circleNotes.id,
      circleId: circleNotes.circleId,
      authorId: circleNotes.authorId,
      body: circleNotes.body,
      createdAt: circleNotes.createdAt,
      updatedAt: circleNotes.updatedAt,
      authorName: contributors.name,
    })
    .from(circleNotes)
    .innerJoin(contributors, eq(circleNotes.authorId, contributors.id))
    .where(and(...conditions))
    .orderBy(desc(circleNotes.createdAt))
    .limit(limitNum);

  // Attach attachments for each note
  const noteIds = notes.map((n) => n.id);
  let attachmentsByNote: Record<string, typeof noteAttachments.$inferSelect[]> = {};

  if (noteIds.length > 0) {
    const allAttachments = await db
      .select()
      .from(noteAttachments)
      .where(inArray(noteAttachments.noteId, noteIds));

    for (const att of allAttachments) {
      if (!attachmentsByNote[att.noteId]) attachmentsByNote[att.noteId] = [];
      attachmentsByNote[att.noteId]!.push(att);
    }
  }

  const response = notes.map((n) => ({
    ...n,
    attachments: attachmentsByNote[n.id] ?? [],
  }));

  res.json({ notes: response, hasMore: notes.length === limitNum });
});

// ─── POST /:id/notes — Post a note ────────────────────────────────────────────
router.post("/:id/notes", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const member = await isCircleMember(circleId, contributorId, db);
  if (!member) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const result = postNoteSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { body, attachments } = result.data;

  const created = await db.transaction(async (tx) => {
    const [note] = await tx
      .insert(circleNotes)
      .values({ circleId, authorId: contributorId, body })
      .returning();

    let insertedAttachments: typeof noteAttachments.$inferSelect[] = [];
    if (attachments.length > 0) {
      insertedAttachments = await tx
        .insert(noteAttachments)
        .values(attachments.map((a) => ({ noteId: note.id, ...a })))
        .returning();
    }

    return { ...note, attachments: insertedAttachments };
  });

  res.status(201).json(created);
});

// ─── GET /:id/notes/:noteId/download/:attachmentId — Presigned download URL ──
router.get("/:id/notes/:noteId/download/:attachmentId", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const noteId = req.params["noteId"] as string;
  const attachmentId = req.params["attachmentId"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const hasAccess = await canAccessCircle(circleId, contributorId, db);
  if (!hasAccess) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  // Verify the note belongs to this circle
  const [note] = await db
    .select({ id: circleNotes.id })
    .from(circleNotes)
    .where(and(eq(circleNotes.id, noteId), eq(circleNotes.circleId, circleId)))
    .limit(1);

  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }

  const [attachment] = await db
    .select()
    .from(noteAttachments)
    .where(and(eq(noteAttachments.id, attachmentId), eq(noteAttachments.noteId, noteId)))
    .limit(1);

  if (!attachment) {
    res.status(404).json({ error: "Attachment not found" });
    return;
  }

  const downloadUrl = await generateDownloadUrl(attachment.s3Key);
  res.json({ downloadUrl, fileName: attachment.fileName });
});

// ─── PUT /:id/social — Set social channel ────────────────────────────────────
router.put("/:id/social", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const member = await isCircleMember(circleId, contributorId, db);
  if (!member) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const result = setSocialChannelSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { channel, url } = result.data;

  const [updated] = await db
    .update(circles)
    .set({ socialChannel: channel, socialChannelUrl: url, updatedAt: new Date() })
    .where(eq(circles.id, circleId))
    .returning();

  res.json(updated);
});

// ─── POST /:id/resolution — Submit resolution ─────────────────────────────────
router.post("/:id/resolution", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const member = await isCircleMember(circleId, contributorId, db);
  if (!member) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const result = submitResolutionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  try {
    const [resolution] = await db
      .insert(circleResolutions)
      .values({ circleId, submittedBy: contributorId, ...result.data })
      .returning();

    await db
      .update(circles)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(eq(circles.id, circleId));

    res.status(201).json(resolution);
  } catch (err: unknown) {
    if (isPostgresUniqueViolation(err)) {
      res.status(409).json({ error: "A resolution already exists for this circle." });
      return;
    }
    throw err;
  }
});

// ─── PUT /:id/resolution — Update resolution ──────────────────────────────────
router.put("/:id/resolution", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const member = await isCircleMember(circleId, contributorId, db);
  if (!member) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const [circle] = await db
    .select({ status: circles.status })
    .from(circles)
    .where(eq(circles.id, circleId))
    .limit(1);

  if (!circle) {
    res.status(404).json({ error: "Circle not found" });
    return;
  }

  if (circle.status === "completed") {
    res.status(409).json({ error: "Resolution cannot be updated after circle is completed." });
    return;
  }

  const result = submitResolutionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(circleResolutions)
    .set({ ...result.data, updatedAt: new Date() })
    .where(eq(circleResolutions.circleId, circleId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "No resolution found for this circle." });
    return;
  }

  res.json(updated);
});

// ─── GET /:id/resolution — Get resolution (members + challenger) ──────────────
router.get("/:id/resolution", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const hasAccess = await canAccessCircle(circleId, contributorId, db);
  if (!hasAccess) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const [resolution] = await db
    .select()
    .from(circleResolutions)
    .where(eq(circleResolutions.circleId, circleId))
    .limit(1);

  if (!resolution) {
    res.status(404).json({ error: "No resolution submitted yet." });
    return;
  }

  const [rating] = await db
    .select()
    .from(resolutionRatings)
    .where(eq(resolutionRatings.resolutionId, resolution.id))
    .limit(1);

  res.json({ resolution, rating: rating ?? null });
});

// ─── POST /:id/resolution/rating — Rate resolution (challenger only) ──────────
router.post("/:id/resolution/rating", authMiddleware, async (req, res) => {
  const circleId = req.params["id"] as string;
  const contributorId = req.contributor!.id;
  const db = getDb();

  const challenger = await isChallenger(circleId, contributorId, db);
  if (!challenger) {
    res.status(403).json({ error: "Only the challenge creator can rate the resolution." });
    return;
  }

  const result = rateResolutionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const [resolution] = await db
    .select({ id: circleResolutions.id })
    .from(circleResolutions)
    .where(eq(circleResolutions.circleId, circleId))
    .limit(1);

  if (!resolution) {
    res.status(404).json({ error: "No resolution to rate." });
    return;
  }

  try {
    const [rating] = await db
      .insert(resolutionRatings)
      .values({ resolutionId: resolution.id, raterId: contributorId, ...result.data })
      .returning();

    await db
      .update(circles)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(circles.id, circleId));

    res.status(201).json(rating);
  } catch (err: unknown) {
    if (isPostgresUniqueViolation(err)) {
      res.status(409).json({ error: "Resolution has already been rated." });
      return;
    }
    throw err;
  }
});

// ─── Utility ──────────────────────────────────────────────────────────────────

function isPostgresUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

export { router as circleRoutes };
