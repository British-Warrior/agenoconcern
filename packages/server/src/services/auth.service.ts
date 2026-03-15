import * as jose from "jose";
import * as argon2 from "argon2";
import { eq, or } from "drizzle-orm";
import type { Response } from "express";
import { getDb } from "../db/index.js";
import { contributors, oauthAccounts, passwordResetTokens } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import {
  registerInputSchema,
  loginInputSchema,
  type RegisterInput,
  type LoginInput,
  type ContributorRole,
} from "@indomitable-unity/shared";

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------

function getSecret() {
  return new TextEncoder().encode(getEnv().JWT_SECRET);
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function createTokens(contributorId: string, role: string) {
  const secret = getSecret();

  const accessToken = await new jose.SignJWT({ sub: contributorId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);

  const refreshToken = await new jose.SignJWT({
    sub: contributorId,
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret);

  return { accessToken, refreshToken };
}

export async function verifyToken(token: string) {
  const { payload } = await jose.jwtVerify(token, getSecret());
  return payload as jose.JWTPayload & {
    sub: string;
    role?: ContributorRole;
    type?: string;
  };
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  const secure = getEnv().NODE_ENV === "production";
  res.cookie("access_token", tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: "/",
  });
  res.cookie("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/api/auth/refresh",
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth/refresh" });
}

// ---------------------------------------------------------------------------
// Email/password registration
// ---------------------------------------------------------------------------

export async function register(input: RegisterInput) {
  const data = registerInputSchema.parse(input);
  const db = getDb();

  // Check email not taken
  const existing = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, data.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new AuthError("Email already registered", 409);
  }

  const passwordHash = await argon2.hash(data.password);

  const [contributor] = await db
    .insert(contributors)
    .values({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      authProvider: "email",
    })
    .returning({
      id: contributors.id,
      name: contributors.name,
      email: contributors.email,
      role: contributors.role,
      status: contributors.status,
    });

  const tokens = await createTokens(contributor.id, contributor.role);
  return { tokens, contributor };
}

// ---------------------------------------------------------------------------
// Email/password login
// ---------------------------------------------------------------------------

export async function login(input: LoginInput) {
  const data = loginInputSchema.parse(input);
  const db = getDb();

  const [contributor] = await db
    .select()
    .from(contributors)
    .where(eq(contributors.email, data.email.toLowerCase()))
    .limit(1);

  if (!contributor || !contributor.passwordHash) {
    throw new AuthError("Invalid email or password", 401);
  }

  const validPassword = await argon2.verify(
    contributor.passwordHash,
    data.password,
  );

  if (!validPassword) {
    throw new AuthError("Invalid email or password", 401);
  }

  const tokens = await createTokens(contributor.id, contributor.role);
  return {
    tokens,
    contributor: {
      id: contributor.id,
      name: contributor.name,
      email: contributor.email,
      role: contributor.role,
      status: contributor.status,
    },
  };
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

export async function findOrCreateOAuthContributor(profile: {
  provider: "google" | "linkedin";
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  rawProfile?: Record<string, unknown>;
}) {
  const db = getDb();

  // Try to find by provider account ID first, then by email
  const conditions = [
    eq(contributors.authProviderId, profile.providerAccountId),
  ];
  if (profile.email) {
    conditions.push(eq(contributors.email, profile.email.toLowerCase()));
  }

  const [existing] = await db
    .select()
    .from(contributors)
    .where(or(...conditions))
    .limit(1);

  let contributor: {
    id: string;
    name: string;
    email: string | null;
    role: string;
    status: string;
  };

  if (existing) {
    contributor = {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: existing.role,
      status: existing.status,
    };
  } else {
    const [created] = await db
      .insert(contributors)
      .values({
        name: profile.name || "Contributor",
        email: profile.email?.toLowerCase() || null,
        authProvider: profile.provider,
        authProviderId: profile.providerAccountId,
      })
      .returning({
        id: contributors.id,
        name: contributors.name,
        email: contributors.email,
        role: contributors.role,
        status: contributors.status,
      });
    contributor = created;
  }

  // Upsert OAuth account with profile snapshot
  const [existingOAuth] = await db
    .select({ id: oauthAccounts.id })
    .from(oauthAccounts)
    .where(eq(oauthAccounts.providerAccountId, profile.providerAccountId))
    .limit(1);

  if (existingOAuth) {
    await db
      .update(oauthAccounts)
      .set({
        profileSnapshot: profile.rawProfile || null,
        updatedAt: new Date(),
      })
      .where(eq(oauthAccounts.id, existingOAuth.id));
  } else {
    await db.insert(oauthAccounts).values({
      contributorId: contributor.id,
      provider: profile.provider,
      providerAccountId: profile.providerAccountId,
      profileSnapshot: profile.rawProfile || null,
    });
  }

  const tokens = await createTokens(contributor.id, contributor.role);
  return { tokens, contributor };
}

// ---------------------------------------------------------------------------
// Phone/SMS helpers
// ---------------------------------------------------------------------------

export function normaliseUKPhone(phone: string): string {
  // Convert "07..." or "7..." to "+447..."
  if (phone.startsWith("07")) {
    return "+44" + phone.slice(1);
  }
  if (phone.startsWith("7") && phone.length >= 10) {
    return "+44" + phone;
  }
  return phone;
}

export async function findOrCreatePhoneContributor(phoneNumber: string) {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(contributors)
    .where(eq(contributors.phoneNumber, phoneNumber))
    .limit(1);

  if (existing) {
    const tokens = await createTokens(existing.id, existing.role);
    return {
      tokens,
      contributor: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        status: existing.status,
      },
    };
  }

  const [created] = await db
    .insert(contributors)
    .values({
      name: "Contributor",
      phoneNumber,
      authProvider: "phone",
    })
    .returning({
      id: contributors.id,
      name: contributors.name,
      email: contributors.email,
      role: contributors.role,
      status: contributors.status,
    });

  const tokens = await createTokens(created.id, created.role);
  return { tokens, contributor: created };
}

// ---------------------------------------------------------------------------
// Password reset helpers
// ---------------------------------------------------------------------------

export async function createPasswordResetToken(email: string) {
  const db = getDb();
  const crypto = await import("node:crypto");

  const [contributor] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, email.toLowerCase()))
    .limit(1);

  if (!contributor) {
    // Don't reveal whether email exists
    return null;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({
    contributorId: contributor.id,
    tokenHash,
    expiresAt,
  });

  return { rawToken, contributorId: contributor.id };
}

export async function resetPassword(token: string, newPassword: string) {
  const db = getDb();
  const crypto = await import("node:crypto");
  const { gt, isNull, and } = await import("drizzle-orm");

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const [resetRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);

  if (!resetRow) {
    throw new AuthError("Invalid or expired reset token", 400);
  }

  const passwordHash = await argon2.hash(newPassword);

  await db
    .update(contributors)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(contributors.id, resetRow.contributorId));

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, resetRow.id));
}

// ---------------------------------------------------------------------------
// CM account creation
// ---------------------------------------------------------------------------

export async function createAccountForContributor(input: {
  name: string;
  username?: string;
  password?: string;
  phoneNumber?: string;
  email?: string;
  createdBy: string;
}) {
  const db = getDb();
  const crypto = await import("node:crypto");

  // Generate username if not provided
  let username = input.username;
  if (!username) {
    const parts = input.name.toLowerCase().split(/\s+/);
    const base =
      parts.length >= 2 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
    username = base;

    // Check for conflicts and add number suffix
    let suffix = 0;
    let taken = true;
    while (taken) {
      const candidate: string = suffix === 0 ? username! : `${base}${suffix}`;
      const [existing] = await db
        .select({ id: contributors.id })
        .from(contributors)
        .where(eq(contributors.username, candidate))
        .limit(1);
      if (!existing) {
        username = candidate;
        taken = false;
      } else {
        suffix++;
      }
    }
  }

  // Generate password if not provided
  const plainPassword =
    input.password || crypto.randomBytes(12).toString("base64url").slice(0, 16);

  const passwordHash = await argon2.hash(plainPassword);

  const [contributor] = await db
    .insert(contributors)
    .values({
      name: input.name,
      username,
      email: input.email?.toLowerCase() || null,
      phoneNumber: input.phoneNumber || null,
      passwordHash,
      authProvider: "cm_created",
      createdBy: input.createdBy,
    })
    .returning({
      id: contributors.id,
      name: contributors.name,
      username: contributors.username,
      role: contributors.role,
    });

  return {
    contributorId: contributor.id,
    username: contributor.username!,
    password: plainPassword,
    name: contributor.name,
  };
}

// ---------------------------------------------------------------------------
// Custom error class
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
