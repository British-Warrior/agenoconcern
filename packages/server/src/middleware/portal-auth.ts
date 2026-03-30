import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { getEnv } from "../config/env.js";

declare global {
  namespace Express {
    interface Request {
      portalUser?: {
        id: string;
        institutionId: string;
      };
    }
  }
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

/**
 * Portal auth middleware: reads portal_access_token cookie, verifies JWT,
 * checks payload.type === "portal" (rejects contributor tokens),
 * and attaches req.portalUser.
 * Returns 401 if token is missing, invalid, or wrong type.
 */
export async function portalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.portal_access_token;

  if (!token) {
    res.status(401).json({ error: "Portal authentication required" });
    return;
  }

  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());

    if (payload.type !== "portal") {
      res.status(401).json({ error: "Invalid portal token" });
      return;
    }

    req.portalUser = {
      id: payload.sub as string,
      institutionId: payload.institutionId as string,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired portal token" });
  }
}
