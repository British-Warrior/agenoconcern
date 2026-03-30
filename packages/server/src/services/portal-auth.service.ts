import * as jose from "jose";
import * as argon2 from "argon2";
import { eq, and } from "drizzle-orm";
import type { Response } from "express";
import { getDb } from "../db/index.js";
import { institutionPortalAccounts, institutions } from "../db/schema.js";
import { getEnv } from "../config/env.js";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function getSecret() {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function createPortalTokens(
  portalAccountId: string,
  institutionId: string,
) {
  const secret = getSecret();

  const accessToken = await new jose.SignJWT({
    sub: portalAccountId,
    institutionId,
    type: "portal",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    sub: portalAccountId,
    type: "portal_refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret);

  return { accessToken, refreshToken };
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function setPortalAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  const secure = getEnv().NODE_ENV === "production";
  res.cookie("portal_access_token", tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: "/",
  });
  res.cookie("portal_refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/portal/refresh",
  });
}

export function clearPortalAuthCookies(res: Response) {
  res.clearCookie("portal_access_token", { path: "/" });
  res.clearCookie("portal_refresh_token", { path: "/api/portal/refresh" });
}

// ---------------------------------------------------------------------------
// Portal login
// ---------------------------------------------------------------------------

export async function portalLogin(email: string, password: string) {
  const db = getDb();

  const [account] = await db
    .select({
      id: institutionPortalAccounts.id,
      institutionId: institutionPortalAccounts.institutionId,
      passwordHash: institutionPortalAccounts.passwordHash,
      isActive: institutionPortalAccounts.isActive,
    })
    .from(institutionPortalAccounts)
    .where(
      and(
        eq(institutionPortalAccounts.email, email.toLowerCase()),
        eq(institutionPortalAccounts.isActive, true),
      ),
    )
    .limit(1);

  if (!account) {
    throw new PortalAuthError("Invalid email or password", 401);
  }

  const validPassword = await argon2.verify(account.passwordHash, password);

  if (!validPassword) {
    throw new PortalAuthError("Invalid email or password", 401);
  }

  const tokens = await createPortalTokens(account.id, account.institutionId);
  return {
    tokens,
    account: {
      id: account.id,
      institutionId: account.institutionId,
    },
  };
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class PortalAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "PortalAuthError";
  }
}
