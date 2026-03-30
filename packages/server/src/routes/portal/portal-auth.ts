import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import * as argon2 from "argon2";
import * as jose from "jose";
import { getDb } from "../../db/index.js";
import { institutionPortalAccounts, institutions } from "../../db/schema.js";
import { getEnv } from "../../config/env.js";
import { authMiddleware, requireRole } from "../../middleware/auth.js";
import { portalAuthMiddleware } from "../../middleware/portal-auth.js";
import {
  portalLogin,
  createPortalTokens,
  setPortalAuthCookies,
  clearPortalAuthCookies,
  PortalAuthError,
} from "../../services/portal-auth.service.js";

const router = Router();

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const result = await portalLogin(email, password);
    setPortalAuthCookies(res, result.tokens);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof PortalAuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: "Validation failed", details: err });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /logout
// ---------------------------------------------------------------------------

router.post("/logout", (_req: Request, res: Response) => {
  clearPortalAuthCookies(res);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// POST /refresh
// ---------------------------------------------------------------------------

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.portal_refresh_token;
    if (!token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }

    const { payload } = await jose.jwtVerify(token, getJwtSecret());

    if (payload.type !== "portal_refresh") {
      res.status(401).json({ error: "Invalid token type" });
      return;
    }

    const portalAccountId = payload.sub as string;

    // Re-read account from DB for freshness (per research pitfall 4)
    const db = getDb();
    const [account] = await db
      .select({
        id: institutionPortalAccounts.id,
        institutionId: institutionPortalAccounts.institutionId,
        isActive: institutionPortalAccounts.isActive,
      })
      .from(institutionPortalAccounts)
      .where(eq(institutionPortalAccounts.id, portalAccountId))
      .limit(1);

    if (!account || !account.isActive) {
      res.status(401).json({ error: "Portal account not found or deactivated" });
      return;
    }

    const tokens = await createPortalTokens(account.id, account.institutionId);
    setPortalAuthCookies(res, tokens);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// ---------------------------------------------------------------------------
// GET /me
// ---------------------------------------------------------------------------

router.get("/me", portalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [account] = await db
      .select({
        id: institutionPortalAccounts.id,
        email: institutionPortalAccounts.email,
        institutionId: institutionPortalAccounts.institutionId,
        institutionName: institutions.name,
      })
      .from(institutionPortalAccounts)
      .innerJoin(
        institutions,
        eq(institutionPortalAccounts.institutionId, institutions.id),
      )
      .where(eq(institutionPortalAccounts.id, req.portalUser!.id))
      .limit(1);

    if (!account) {
      res.status(401).json({ error: "Portal account not found" });
      return;
    }

    res.json({
      id: account.id,
      email: account.email,
      institutionId: account.institutionId,
      institutionName: account.institutionName,
    });
  } catch (err) {
    throw err;
  }
});

// ---------------------------------------------------------------------------
// POST /admin/create-portal-account
// ---------------------------------------------------------------------------

const createPortalAccountSchema = z.object({
  institutionId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8).optional(),
});

router.post(
  "/admin/create-portal-account",
  authMiddleware,
  requireRole("community_manager"),
  async (req: Request, res: Response) => {
    try {
      const { institutionId, email, password } = createPortalAccountSchema.parse(req.body);
      const db = getDb();

      // Check no existing active account for this institution
      const [existing] = await db
        .select({ id: institutionPortalAccounts.id })
        .from(institutionPortalAccounts)
        .where(
          and(
            eq(institutionPortalAccounts.institutionId, institutionId),
            eq(institutionPortalAccounts.isActive, true),
          ),
        )
        .limit(1);

      if (existing) {
        res.status(409).json({
          error: "An active portal account already exists for this institution",
        });
        return;
      }

      const crypto = await import("node:crypto");
      const plainPassword =
        password ||
        crypto.randomBytes(12).toString("base64url").slice(0, 16);

      const passwordHash = await argon2.hash(plainPassword);

      const [account] = await db
        .insert(institutionPortalAccounts)
        .values({
          institutionId,
          email: email.toLowerCase(),
          passwordHash,
          createdBy: req.contributor!.id,
        })
        .returning({
          id: institutionPortalAccounts.id,
          email: institutionPortalAccounts.email,
        });

      res.status(201).json({
        id: account.id,
        email: account.email,
        password: plainPassword,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: err });
        return;
      }
      throw err;
    }
  },
);

// ---------------------------------------------------------------------------
// PATCH /admin/:accountId/active
// ---------------------------------------------------------------------------

const updateActiveSchema = z.object({
  isActive: z.boolean(),
});

router.patch(
  "/admin/:accountId/active",
  authMiddleware,
  requireRole("community_manager"),
  async (req: Request, res: Response) => {
    try {
      const accountId = req.params.accountId as string;
      const { isActive } = updateActiveSchema.parse(req.body);
      const db = getDb();

      const [updated] = await db
        .update(institutionPortalAccounts)
        .set({ isActive, updatedAt: new Date() })
        .where(eq(institutionPortalAccounts.id, accountId))
        .returning({
          id: institutionPortalAccounts.id,
          email: institutionPortalAccounts.email,
          institutionId: institutionPortalAccounts.institutionId,
          isActive: institutionPortalAccounts.isActive,
          updatedAt: institutionPortalAccounts.updatedAt,
        });

      if (!updated) {
        res.status(404).json({ error: "Portal account not found" });
        return;
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Validation failed", details: err });
        return;
      }
      throw err;
    }
  },
);

// ---------------------------------------------------------------------------
// POST /admin/:accountId/reset-password
// ---------------------------------------------------------------------------

router.post(
  "/admin/:accountId/reset-password",
  authMiddleware,
  requireRole("community_manager"),
  async (req: Request, res: Response) => {
    try {
      const accountId = req.params.accountId as string;
      const db = getDb();

      const crypto = await import("node:crypto");
      const newPassword = crypto.randomBytes(12).toString("base64url").slice(0, 16);
      const passwordHash = await argon2.hash(newPassword);

      const [updated] = await db
        .update(institutionPortalAccounts)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(institutionPortalAccounts.id, accountId))
        .returning({ id: institutionPortalAccounts.id });

      if (!updated) {
        res.status(404).json({ error: "Portal account not found" });
        return;
      }

      res.json({ password: newPassword });
    } catch (err) {
      throw err;
    }
  },
);

export { router as portalAuthRoutes };
