import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { challengeRoutes } from "./routes/challenges.js";
import { circleRoutes } from "./routes/circles.js";

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

// Error handler (must be last)
app.use(errorHandler);

export { app };
