import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { challengeRoutes } from "./routes/challenges.js";
import { circleRoutes } from "./routes/circles.js";
import { webhookHandler, paymentRoutes } from "./routes/payments.js";
import { impactRoutes } from "./routes/impact.js";
import { wellbeingRoutes } from "./routes/wellbeing.js";
import { notificationRoutes } from "./routes/notifications.js";
import { vantageRoutes } from "./routes/vantage.js";
import { challengerRoutes } from "./routes/challenger.js";
import { institutionRoutes } from "./routes/institutions.js";
import { adminRouter } from "./routes/admin.js";
import { ithinkWebhookHandler } from "./routes/webhooks.js";

const app = express();

// CORS
app.use(
  cors({
    origin: getEnv().CLIENT_URL,
    credentials: true,
  }),
);

// Cookie parsing
app.use(cookieParser());

// Stripe webhook — must use raw body for signature verification (BEFORE express.json())
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), webhookHandler);

// iThink webhook — must use raw body for HMAC signature verification (BEFORE express.json())
app.post("/api/webhooks/ithink", express.raw({ type: "application/json" }), ithinkWebhookHandler);

// JSON body parsing
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes
app.use("/api/auth", authRoutes);

// Onboarding routes
app.use("/api/onboarding", onboardingRoutes);

// Challenge routes
app.use("/api/challenges", challengeRoutes);

// Circle routes
app.use("/api/circles", circleRoutes);

// Payment routes
app.use("/api/payments", paymentRoutes);

// Impact routes
app.use("/api/impact", impactRoutes);

// Wellbeing routes
app.use("/api/wellbeing", wellbeingRoutes);

// Notification routes
app.use("/api/notifications", notificationRoutes);

// VANTAGE routes (API key auth)
app.use("/api/vantage", vantageRoutes);

// Challenger portal routes
app.use("/api/challenger", challengerRoutes);

// Institution public routes (no auth required)
app.use("/api/institutions", institutionRoutes);

// Admin routes (CM/admin only — protected via adminRouter middleware)
app.use("/api/admin", adminRouter);

// Dev-only: auto-login as first CM user (no credentials needed)
if (getEnv().NODE_ENV !== "production") {
  app.post("/api/dev/login-as", async (req, res) => {
    try {
      const { role = "community_manager" } = req.body || {};
      const { getDb } = await import("./db/index.js");
      const { contributors } = await import("./db/schema.js");
      const { eq } = await import("drizzle-orm");
      const { createTokens, setAuthCookies } = await import("./services/auth.service.js");
      const db = getDb();
      const [user] = await db
        .select({ id: contributors.id, role: contributors.role })
        .from(contributors)
        .where(eq(contributors.role, role))
        .limit(1);
      if (!user) { res.status(404).json({ error: `No ${role} user found` }); return; }
      const tokens = await createTokens(user.id, user.role);
      setAuthCookies(res, tokens);
      res.json({ ok: true, id: user.id, role: user.role });
    } catch (e: unknown) {
      res.status(500).json({ error: String(e) });
    }
  });
}

// Error handler (must be last)
app.use(errorHandler);

export { app };
