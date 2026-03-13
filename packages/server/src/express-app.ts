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

// Error handler (must be last)
app.use(errorHandler);

export { app };
