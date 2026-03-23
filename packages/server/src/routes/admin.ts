import { Router } from "express";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  institutions,
  contributors,
  contributorInstitutions,
  challengeInterests,
  contributorHours,
  wellbeingCheckins,
  circleNotes,
} from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  createInstitutionSchema,
  updateInstitutionSchema,
  toggleActiveSchema,
  setContributorInstitutionsSchema,
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

// ─── GET /institutions — List all institutions with live stats ─────────────────
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

  // ── Batch live stats ────────────────────────────────────────────────────────
  // 1. Fetch all junction rows in one query
  const allAssignments = await db
    .select({
      contributorId: contributorInstitutions.contributorId,
      institutionId: contributorInstitutions.institutionId,
    })
    .from(contributorInstitutions);

  // Group contributor IDs by institution
  const assignmentsByInstitution = new Map<string, string[]>();
  for (const row of allAssignments) {
    const existing = assignmentsByInstitution.get(row.institutionId) ?? [];
    existing.push(row.contributorId);
    assignmentsByInstitution.set(row.institutionId, existing);
  }

  // Get all unique contributor IDs assigned to any institution
  const allContributorIds = [...new Set(allAssignments.map((r) => r.contributorId))];

  // 2. Batch-query challenge interests for assigned contributors
  let challengesByContributor = new Map<string, Set<string>>();
  let hoursByContributor = new Map<string, number>();

  if (allContributorIds.length > 0) {
    const ciRows = await db
      .select({
        contributorId: challengeInterests.contributorId,
        challengeId: challengeInterests.challengeId,
      })
      .from(challengeInterests)
      .where(inArray(challengeInterests.contributorId, allContributorIds));

    for (const row of ciRows) {
      const set = challengesByContributor.get(row.contributorId) ?? new Set<string>();
      set.add(row.challengeId);
      challengesByContributor.set(row.contributorId, set);
    }

    const hoursRows = await db
      .select({
        contributorId: contributorHours.contributorId,
        hoursLogged: contributorHours.hoursLogged,
      })
      .from(contributorHours)
      .where(inArray(contributorHours.contributorId, allContributorIds));

    for (const row of hoursRows) {
      const prev = hoursByContributor.get(row.contributorId) ?? 0;
      hoursByContributor.set(row.contributorId, prev + row.hoursLogged);
    }
  }

  // 3. Compute per-institution stats
  const institutionsWithStats = rows.map((inst) => {
    const memberIds = assignmentsByInstitution.get(inst.id) ?? [];
    const contributorCount = memberIds.length;
    const challengeSet = new Set<string>();
    let hoursTotal = 0;
    for (const cid of memberIds) {
      const cChallenges = challengesByContributor.get(cid);
      if (cChallenges) {
        for (const ch of cChallenges) challengeSet.add(ch);
      }
      hoursTotal += hoursByContributor.get(cid) ?? 0;
    }
    return {
      ...inst,
      stats:
        contributorCount > 0
          ? { contributors: contributorCount, challenges: challengeSet.size, hours: hoursTotal }
          : null,
    };
  });

  res.json(institutionsWithStats);
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

// ─── GET /institutions/:id/contributors — List contributors for an institution ─
router.get("/institutions/:id/contributors", async (req, res) => {
  const id = req.params["id"] as string;

  if (!UUID_PATTERN.test(id)) {
    res.status(400).json({ error: "Invalid institution ID" });
    return;
  }

  const db = getDb();

  // Verify institution exists
  const [institution] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.id, id))
    .limit(1);

  if (!institution) {
    res.status(404).json({ error: "Institution not found" });
    return;
  }

  // Fetch contributors assigned to this institution
  const memberRows = await db
    .select({
      id: contributors.id,
      name: contributors.name,
      role: contributors.role,
      status: contributors.status,
    })
    .from(contributorInstitutions)
    .innerJoin(contributors, eq(contributors.id, contributorInstitutions.contributorId))
    .where(eq(contributorInstitutions.institutionId, id))
    .orderBy(asc(contributors.name));

  if (memberRows.length === 0) {
    res.json([]);
    return;
  }

  const memberIds = memberRows.map((r) => r.id);

  // Batch-query last check-in per contributor
  const checkinRows = await db
    .select({
      contributorId: wellbeingCheckins.contributorId,
      lastAt: sql<string>`max(${wellbeingCheckins.completedAt})`.as("last_at"),
    })
    .from(wellbeingCheckins)
    .where(inArray(wellbeingCheckins.contributorId, memberIds))
    .groupBy(wellbeingCheckins.contributorId);

  const lastCheckin = new Map<string, Date>();
  for (const row of checkinRows) {
    lastCheckin.set(row.contributorId, new Date(row.lastAt));
  }

  // Batch-query last circle note per contributor (as author)
  const noteRows = await db
    .select({
      authorId: circleNotes.authorId,
      lastAt: sql<string>`max(${circleNotes.createdAt})`.as("last_at"),
    })
    .from(circleNotes)
    .where(inArray(circleNotes.authorId, memberIds))
    .groupBy(circleNotes.authorId);

  const lastNote = new Map<string, Date>();
  for (const row of noteRows) {
    lastNote.set(row.authorId, new Date(row.lastAt));
  }

  // Merge: take the later date
  const result = memberRows.map((member) => {
    const checkin = lastCheckin.get(member.id);
    const note = lastNote.get(member.id);
    let lastActivity: string | null = null;
    if (checkin && note) {
      lastActivity = checkin >= note ? checkin.toISOString() : note.toISOString();
    } else if (checkin) {
      lastActivity = checkin.toISOString();
    } else if (note) {
      lastActivity = note.toISOString();
    }
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      status: member.status,
      lastActivity,
    };
  });

  res.json(result);
});

// ─── GET /contributors — List all contributors with institution assignments ────
router.get("/contributors", async (req, res) => {
  const db = getDb();

  const allContributors = await db
    .select({
      id: contributors.id,
      name: contributors.name,
      role: contributors.role,
      status: contributors.status,
    })
    .from(contributors)
    .orderBy(asc(contributors.name));

  // Fetch all assignments in one query
  const allAssignments = await db
    .select({
      contributorId: contributorInstitutions.contributorId,
      institutionId: contributorInstitutions.institutionId,
      institutionName: institutions.name,
    })
    .from(contributorInstitutions)
    .innerJoin(institutions, eq(institutions.id, contributorInstitutions.institutionId));

  // Group by contributor
  const assignmentMap = new Map<string, { id: string; name: string }[]>();
  for (const row of allAssignments) {
    const existing = assignmentMap.get(row.contributorId) ?? [];
    existing.push({ id: row.institutionId, name: row.institutionName });
    assignmentMap.set(row.contributorId, existing);
  }

  const result = allContributors.map((c) => ({
    id: c.id,
    name: c.name,
    role: c.role,
    status: c.status,
    institutions: assignmentMap.get(c.id) ?? [],
  }));

  res.json(result);
});

// ─── PUT /contributors/:contributorId/institutions — Set assignments ───────────
router.put("/contributors/:contributorId/institutions", async (req, res) => {
  const contributorId = req.params["contributorId"] as string;

  if (!UUID_PATTERN.test(contributorId)) {
    res.status(400).json({ error: "Invalid contributor ID" });
    return;
  }

  const parseResult = setContributorInstitutionsSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.flatten() });
    return;
  }

  const { institutionIds } = parseResult.data;

  const db = getDb();

  // Verify contributor exists
  const [contributor] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.id, contributorId))
    .limit(1);

  if (!contributor) {
    res.status(404).json({ error: "Contributor not found" });
    return;
  }

  // Transaction: DELETE all existing, INSERT new
  await db.transaction(async (tx) => {
    await tx
      .delete(contributorInstitutions)
      .where(eq(contributorInstitutions.contributorId, contributorId));

    if (institutionIds.length > 0) {
      const assignedBy = (req as unknown as { contributor?: { id: string } }).contributor?.id ?? null;
      await tx.insert(contributorInstitutions).values(
        institutionIds.map((institutionId) => ({
          contributorId,
          institutionId,
          assignedBy,
        })),
      );
    }
  });

  // Return updated assignments
  const updatedAssignments = await db
    .select({
      id: institutions.id,
      name: institutions.name,
    })
    .from(contributorInstitutions)
    .innerJoin(institutions, eq(institutions.id, contributorInstitutions.institutionId))
    .where(eq(contributorInstitutions.contributorId, contributorId));

  res.json({ contributorId, institutions: updatedAssignments });
});

export { router as adminRouter };
