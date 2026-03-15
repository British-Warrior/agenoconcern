import { Router } from "express";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { notifications, pushSubscriptions, contributorProfiles } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { pushSubscriptionSchema, notificationPreferencesSchema } from "@agenoconcern/shared";

const router = Router();

// ─── GET / — List notifications (most recent 50) ─────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.contributorId, contributorId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  res.json(rows);
});

// ─── POST /read-all — Mark all notifications as read ─────────────────────────
// NOTE: Must be declared before /:id/read to avoid route shadowing
router.post("/read-all", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.contributorId, contributorId),
        isNull(notifications.readAt),
      ),
    );

  res.json({ ok: true });
});

// ─── GET /preferences — Get circle activity preference ───────────────────────
// NOTE: Must be declared before /:id routes
router.get("/preferences", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;

  const [profile] = await db
    .select({ notifyCircleActivity: contributorProfiles.notifyCircleActivity })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  res.json({ notifyCircleActivity: profile?.notifyCircleActivity ?? "immediate" });
});

// ─── PATCH /preferences — Update circle activity preference ──────────────────
router.patch("/preferences", authMiddleware, async (req, res) => {
  const result = notificationPreferencesSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const db = getDb();
  const contributorId = req.contributor!.id;

  await db
    .update(contributorProfiles)
    .set({ notifyCircleActivity: result.data.notifyCircleActivity, updatedAt: new Date() })
    .where(eq(contributorProfiles.contributorId, contributorId));

  res.json({ ok: true });
});

// ─── POST /push-sub — Register push subscription ─────────────────────────────
router.post("/push-sub", authMiddleware, async (req, res) => {
  const result = pushSubscriptionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const db = getDb();
  const contributorId = req.contributor!.id;
  const { endpoint, keys } = result.data;

  await db
    .insert(pushSubscriptions)
    .values({
      contributorId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        updatedAt: new Date(),
      },
    });

  res.status(201).json({ ok: true });
});

// ─── DELETE /push-sub — Remove push subscription ─────────────────────────────
router.delete("/push-sub", authMiddleware, async (req, res) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) {
    res.status(400).json({ error: "endpoint is required" });
    return;
  }

  const db = getDb();
  const contributorId = req.contributor!.id;

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.endpoint, endpoint),
        eq(pushSubscriptions.contributorId, contributorId),
      ),
    );

  res.json({ ok: true });
});

// ─── PATCH /:id/read — Mark single notification as read ──────────────────────
router.patch("/:id/read", authMiddleware, async (req, res) => {
  const db = getDb();
  const contributorId = req.contributor!.id;
  const notificationId = req.params["id"] as string;

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.contributorId, contributorId),
      ),
    );

  res.json({ ok: true });
});

export { router as notificationRoutes };
