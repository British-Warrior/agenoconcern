import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { getEnv } from "../config/env.js";
import type { ContributorRole } from "@indomitable-unity/shared";

declare global {
  namespace Express {
    interface Request {
      contributor?: {
        id: string;
        role: ContributorRole;
      };
    }
  }
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

/**
 * Auth middleware: reads access_token cookie, verifies JWT, attaches req.contributor.
 * Returns 401 if token is missing or invalid.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret());

    req.contributor = {
      id: payload.sub as string,
      role: payload.role as ContributorRole,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Role guard: checks req.contributor.role matches the required role.
 * Must be used after authMiddleware.
 */
export function requireRole(role: ContributorRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.contributor) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (req.contributor.role !== role && req.contributor.role !== "admin") {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
