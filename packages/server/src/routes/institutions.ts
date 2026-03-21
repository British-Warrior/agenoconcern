import { Router } from "express";
import type { Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { institutions } from "../db/schema.js";

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

  res.json({
    id: institution.id,
    name: institution.name,
    slug: institution.slug,
    description: institution.description,
    city: institution.city,
    stats: institution.statsJson,
  });
});

export { router as institutionRoutes };
