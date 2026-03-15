import { Router } from "express";
import * as arctic from "arctic";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { contributors } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  register,
  login,
  createTokens,
  verifyToken,
  setAuthCookies,
  clearAuthCookies,
  findOrCreateOAuthContributor,
  findOrCreatePhoneContributor,
  normaliseUKPhone,
  createPasswordResetToken,
  resetPassword,
  createAccountForContributor,
  AuthError,
} from "../services/auth.service.js";
import {
  registerInputSchema,
  loginInputSchema,
  phoneInputSchema,
  resetPasswordInputSchema,
} from "@indomitable-unity/shared";

const router = Router();

// ---------------------------------------------------------------------------
// Email/password registration
// ---------------------------------------------------------------------------

router.post("/register", async (req: Request, res: Response) => {
  try {
    const body = registerInputSchema.parse(req.body);
    const result = await register(body);
    setAuthCookies(res, result.tokens);
    res.json({ contributor: result.contributor });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Email/password login
// ---------------------------------------------------------------------------

router.post("/login", async (req: Request, res: Response) => {
  try {
    const body = loginInputSchema.parse(req.body);
    const result = await login(body);
    setAuthCookies(res, result.tokens);
    res.json({ contributor: result.contributor });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err });
      return;
    }
    throw err;
  }
});

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      res.status(401).json({ error: "No refresh token" });
      return;
    }

    const payload = await verifyToken(token);
    if (payload.type !== "refresh") {
      res.status(401).json({ error: "Invalid token type" });
      return;
    }

    // Verify contributor still exists
    const db = getDb();
    const [contributor] = await db
      .select({ id: contributors.id, role: contributors.role })
      .from(contributors)
      .where(eq(contributors.id, payload.sub))
      .limit(1);

    if (!contributor) {
      res.status(401).json({ error: "Contributor not found" });
      return;
    }

    // Issue new access token only
    const { accessToken } = await createTokens(contributor.id, contributor.role);
    const secure = getEnv().NODE_ENV === "production";
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.json({ success: true });
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ message: "Logged out" });
});

// ---------------------------------------------------------------------------
// Dev role switcher (development only)
// ---------------------------------------------------------------------------

if (getEnv().NODE_ENV === "development") {
  router.post(
    "/dev-role",
    authMiddleware,
    async (req: Request, res: Response) => {
      try {
        const { role } = req.body as { role: string };
        const validRoles = ["contributor", "community_manager", "admin"];
        if (!validRoles.includes(role)) {
          res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` });
          return;
        }

        const db = getDb();
        await db
          .update(contributors)
          .set({ role: role as "contributor" | "community_manager" | "admin", updatedAt: new Date() })
          .where(eq(contributors.id, req.contributor!.id));

        // Re-issue tokens with new role
        const tokens = await createTokens(req.contributor!.id, role);
        setAuthCookies(res, tokens);

        res.json({ role });
      } catch {
        res.status(500).json({ error: "Failed to switch role" });
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Get current user
// ---------------------------------------------------------------------------

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const [contributor] = await db
      .select({
        id: contributors.id,
        name: contributors.name,
        email: contributors.email,
        username: contributors.username,
        phoneNumber: contributors.phoneNumber,
        role: contributors.role,
        status: contributors.status,
        authProvider: contributors.authProvider,
        createdAt: contributors.createdAt,
      })
      .from(contributors)
      .where(eq(contributors.id, req.contributor!.id))
      .limit(1);

    if (!contributor) {
      res.status(404).json({ error: "Contributor not found" });
      return;
    }

    res.json({ contributor });
  } catch {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

router.get("/google", (_req: Request, res: Response) => {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res
      .status(501)
      .json({ error: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    return;
  }

  const google = new arctic.Google(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    `http://localhost:${env.PORT}/api/auth/callback/google`,
  );

  const state = arctic.generateState();
  const codeVerifier = arctic.generateCodeVerifier();
  const scopes = ["openid", "profile", "email"];
  const url = google.createAuthorizationURL(state, codeVerifier, scopes);

  const secure = env.NODE_ENV === "production";
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });
  res.cookie("code_verifier", codeVerifier, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });

  res.redirect(url.toString());
});

router.get("/callback/google", async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const { code, state } = req.query as { code: string; state: string };
    const storedState = req.cookies?.oauth_state;
    const codeVerifier = req.cookies?.code_verifier;

    if (!code || !state || state !== storedState || !codeVerifier) {
      res.status(400).json({ error: "Invalid OAuth callback" });
      return;
    }

    const google = new arctic.Google(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      `http://localhost:${env.PORT}/api/auth/callback/google`,
    );

    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const idToken = tokens.idToken();
    const claims = arctic.decodeIdToken(idToken) as {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };

    const result = await findOrCreateOAuthContributor({
      provider: "google",
      providerAccountId: claims.sub,
      email: claims.email,
      name: claims.name,
      avatarUrl: claims.picture,
      rawProfile: claims as unknown as Record<string, unknown>,
    });

    setAuthCookies(res, result.tokens);

    // Clear OAuth state cookies
    res.clearCookie("oauth_state", { path: "/" });
    res.clearCookie("code_verifier", { path: "/" });

    res.redirect(env.CLIENT_URL + "/dashboard");
  } catch (err) {
    console.error("[auth] Google OAuth callback error:", err);
    res.redirect(env.CLIENT_URL + "/login?error=oauth_failed");
  }
});

// ---------------------------------------------------------------------------
// LinkedIn OAuth
// ---------------------------------------------------------------------------

router.get("/linkedin", (_req: Request, res: Response) => {
  const env = getEnv();
  if (!env.LINKEDIN_CLIENT_ID || !env.LINKEDIN_CLIENT_SECRET) {
    res
      .status(501)
      .json({ error: "LinkedIn OAuth not configured. Set LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET." });
    return;
  }

  const linkedin = new arctic.LinkedIn(
    env.LINKEDIN_CLIENT_ID,
    env.LINKEDIN_CLIENT_SECRET,
    `http://localhost:${env.PORT}/api/auth/callback/linkedin`,
  );

  const state = arctic.generateState();
  const scopes = ["openid", "profile", "email"];
  // LinkedIn does NOT use PKCE
  const url = linkedin.createAuthorizationURL(state, scopes);

  const secure = env.NODE_ENV === "production";
  res.cookie("oauth_state", state, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
    path: "/",
  });

  res.redirect(url.toString());
});

router.get("/callback/linkedin", async (req: Request, res: Response) => {
  const env = getEnv();
  try {
    const { code, state } = req.query as { code: string; state: string };
    const storedState = req.cookies?.oauth_state;

    if (!code || !state || state !== storedState) {
      res.status(400).json({ error: "Invalid OAuth callback" });
      return;
    }

    const linkedin = new arctic.LinkedIn(
      env.LINKEDIN_CLIENT_ID,
      env.LINKEDIN_CLIENT_SECRET,
      `http://localhost:${env.PORT}/api/auth/callback/linkedin`,
    );

    const tokens = await linkedin.validateAuthorizationCode(code);
    const accessToken = tokens.accessToken();

    // Fetch profile from userinfo endpoint
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const profile = (await profileResponse.json()) as {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };

    const result = await findOrCreateOAuthContributor({
      provider: "linkedin",
      providerAccountId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      rawProfile: profile as unknown as Record<string, unknown>,
    });

    setAuthCookies(res, result.tokens);
    res.clearCookie("oauth_state", { path: "/" });

    res.redirect(env.CLIENT_URL + "/dashboard");
  } catch (err) {
    console.error("[auth] LinkedIn OAuth callback error:", err);
    res.redirect(env.CLIENT_URL + "/login?error=oauth_failed");
  }
});

// ---------------------------------------------------------------------------
// Phone/SMS auth
// ---------------------------------------------------------------------------

router.post("/phone/send", async (req: Request, res: Response) => {
  const env = getEnv();
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_VERIFY_SERVICE_SID
  ) {
    res
      .status(501)
      .json({ error: "Phone login is not available yet. Please use email or social login instead." });
    return;
  }

  try {
    let { phoneNumber } = req.body as { phoneNumber: string };
    phoneNumber = normaliseUKPhone(phoneNumber || "");

    // Validate E.164
    phoneInputSchema.parse({ phoneNumber });

    const twilio = (await import("twilio")).default;
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneNumber, channel: "sms" });

    res.json({ message: "Code sent" });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      res.status(400).json({ error: "Invalid phone number. Use E.164 format (e.g., +447700900000)." });
      return;
    }
    console.error("[auth] SMS send error:", err);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

router.post("/phone/verify", async (req: Request, res: Response) => {
  const env = getEnv();
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.TWILIO_VERIFY_SERVICE_SID
  ) {
    res
      .status(501)
      .json({ error: "Phone login is not available yet. Please use email or social login instead." });
    return;
  }

  try {
    let { phoneNumber, code } = req.body as {
      phoneNumber: string;
      code: string;
    };
    phoneNumber = normaliseUKPhone(phoneNumber || "");
    phoneInputSchema.parse({ phoneNumber });

    if (!code || typeof code !== "string") {
      res.status(400).json({ error: "Verification code is required" });
      return;
    }

    const twilio = (await import("twilio")).default;
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

    const check = await client.verify.v2
      .services(env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({ to: phoneNumber, code });

    if (check.status !== "approved") {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    const result = await findOrCreatePhoneContributor(phoneNumber);
    setAuthCookies(res, result.tokens);
    res.json({ contributor: result.contributor });
  } catch (err) {
    if (err instanceof Error && err.name === "ZodError") {
      res.status(400).json({ error: "Invalid phone number format." });
      return;
    }
    console.error("[auth] SMS verify error:", err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

router.post("/forgot-password", async (req: Request, res: Response) => {
  const env = getEnv();

  try {
    const { email } = req.body as { email: string };
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const result = await createPasswordResetToken(email);

    // Send email if contributor found and email service is configured
    if (result && env.RESEND_API_KEY) {
      const { Resend } = await import("resend");
      const resend = new Resend(env.RESEND_API_KEY);
      const resetLink = `${env.CLIENT_URL}/reset-password?token=${result.rawToken}`;

      await resend.emails.send({
        from: "Indomitable Unity <noreply@indomitableunity.org>",
        to: email,
        subject: "Reset your password",
        text: `You requested a password reset for your Indomitable Unity account.\n\nClick this link to reset your password (valid for 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
      });
    } else if (result && !env.RESEND_API_KEY) {
      console.warn("[auth] Password reset requested but RESEND_API_KEY not configured — email not sent");
    }

    // Always return success (never reveal whether account exists)
    res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("[auth] Forgot password error:", err);
    // Still return the safe message to prevent account enumeration via error timing
    res.json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const body = resetPasswordInputSchema.parse(req.body);
    await resetPassword(body.token, body.newPassword);
    clearAuthCookies(res);
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.name === "ZodError") {
      res.status(400).json({ error: "Validation failed", details: err });
      return;
    }
    console.error("[auth] Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ---------------------------------------------------------------------------
// CM account creation
// ---------------------------------------------------------------------------

router.post(
  "/create-account",
  authMiddleware,
  requireRole("community_manager"),
  async (req: Request, res: Response) => {
    try {
      const { name, username, password, phoneNumber, email } = req.body as {
        name: string;
        username?: string;
        password?: string;
        phoneNumber?: string;
        email?: string;
      };

      if (!name || typeof name !== "string") {
        res.status(400).json({ error: "Name is required" });
        return;
      }

      const result = await createAccountForContributor({
        name,
        username,
        password,
        phoneNumber,
        email,
        createdBy: req.contributor!.id,
      });

      res.json({
        contributorId: result.contributorId,
        username: result.username,
        password: result.password, // Plain text - only time it's visible
        name: result.name,
      });
    } catch (err) {
      console.error("[auth] Create account error:", err);
      res.status(500).json({ error: "Failed to create account" });
    }
  },
);

export { router as authRoutes };
