import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { eq, and, gt } from "drizzle-orm";
import { rateLimit } from "express-rate-limit";
import { getDb } from "../db/index.js";
import { apiKeys } from "../db/schema.js";

declare global {
  namespace Express {
    interface Request {
      vantageClient?: {
        keyId: string;
        scopes: string[];
      };
    }
  }
}

/**
 * API key authentication middleware for VANTAGE endpoints.
 * Reads X-API-Key header, SHA-256 hashes it, looks up in api_keys table,
 * performs timing-safe comparison, then attaches req.vantageClient.
 *
 * Completely independent of JWT/cookie auth path — does NOT use authMiddleware.
 */
export async function apiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.headers["x-api-key"];

  if (!raw || typeof raw !== "string") {
    res.status(401).json({ error: "API key required" });
    return;
  }

  const incomingHash = createHash("sha256").update(raw).digest("hex");

  const db = getDb();
  const now = new Date();

  const [key] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyHash, incomingHash),
        eq(apiKeys.isActive, true),
        gt(apiKeys.expiresAt, now),
      ),
    )
    .limit(1);

  if (!key) {
    res.status(401).json({ error: "Invalid or expired API key" });
    return;
  }

  // Timing-safe comparison: compare incoming hash bytes against stored hash bytes
  const incomingHashBuf = Buffer.from(incomingHash, "hex");
  const storedHashBuf = Buffer.from(key.keyHash, "hex");

  if (
    incomingHashBuf.length !== storedHashBuf.length ||
    !timingSafeEqual(incomingHashBuf, storedHashBuf)
  ) {
    res.status(401).json({ error: "Invalid or expired API key" });
    return;
  }

  // Update last_used_at (fire-and-forget)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .catch((err: unknown) => console.error("[api-key-auth] last_used_at update error:", err));

  req.vantageClient = {
    keyId: key.id,
    scopes: key.scopes as string[],
  };

  next();
}

/**
 * Rate limiter for VANTAGE endpoints.
 * 60 requests per minute per API key (falls back to IP if no key present).
 * Must be applied BEFORE apiKeyMiddleware in the middleware chain.
 */
export const vantageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const apiKey = req.headers["x-api-key"];
    return typeof apiKey === "string" ? apiKey : (req.ip ?? "unknown");
  },
  handler: (_req, res) => {
    res.status(429).json({ error: "Rate limit exceeded" });
  },
});
