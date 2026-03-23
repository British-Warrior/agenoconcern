import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { institutions } from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  createInstitutionSchema,
  updateInstitutionSchema,
  toggleActiveSchema,
} from "@indomitable-unity/shared";

const router = Router();

// ─── UUID validation ──────────────────────────────────────────────────────────
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Slug generation helper ───────────────────────────────────────────────────
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

// Apply authMiddleware + requireRole("community_manager") to all admin routes
router.use(authMiddleware, requireRole("community_manager"));

// ─── GET /institutions — List all institutions (active AND inactive) ──────────
router.get("/institutions", async (req, res) => {
  const db = getDb();

  const rows = await db
    .select({
      id: institutions.id,
      name: institutions.name,
      slug: institutions.slug,
      description: institutions.description,
      city: institutions.city,
      isActive: institutions.isActive,
      createdAt: institutions.createdAt,
    })
    .from(institutions)
    .orderBy(asc(institutions.name));

  res.json(rows);
});

// ─── POST /institutions — Create institution ──────────────────────────────────
router.post("/institutions", async (req, res) => {
  const result = createInstitutionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { name, description, city } = result.data;
  const slug = slugify(name);

  const db = getDb();

  // Check for slug conflict
  const [existing] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.slug, slug))
    .limit(1);

  if (existing) {
    res.status(409).json({
      error: `An institution with slug "${slug}" already exists. Choose a different name.`,
    });
    return;
  }

  const [created] = await db
    .insert(institutions)
    .values({
      name,
      slug,
      description: description ?? "",
      city: city ?? null,
    })
    .returning();

  res.status(201).json(created);
});

// ─── PUT /institutions/:id — Update institution (slug immutable) ──────────────
router.put("/institutions/:id", async (req, res) => {
  const id = req.params["id"] as string;

  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: "Invalid institution ID" });
    return;
  }

  const result = updateInstitutionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const db = getDb();

  const [existing] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  // Build update object — do NOT allow slug changes
  const { name, description, city } = result.data;
  const setValues: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) setValues.name = name;
  if (description !== undefined) setValues.description = description;
  if (city !== undefined) setValues.city = city;

  const [updated] = await db
    .update(institutions)
    .set(setValues)
    .where(eq(institutions.id, id))
    .returning();

  res.json(updated);
});

// ─── PATCH /institutions/:id/active — Toggle active status ───────────────────
router.patch("/institutions/:id/active", async (req, res) => {
  const id = req.params["id"] as string;

  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: "Invalid institution ID" });
    return;
  }

  const result = toggleActiveSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const db = getDb();

  const [existing] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  const [updated] = await db
    .update(institutions)
    .set({ isActive: result.data.isActive, updatedAt: new Date() })
    .where(eq(institutions.id, id))
    .returning();

  res.json(updated);
});

export { router as adminRouter };
