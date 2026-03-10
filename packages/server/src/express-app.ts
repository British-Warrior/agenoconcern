import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getEnv } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRoutes } from "./routes/auth.js";

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

// Error handler (must be last)
app.use(errorHandler);

export { app };
