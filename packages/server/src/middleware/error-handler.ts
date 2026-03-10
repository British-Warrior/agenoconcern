import type { Request, Response, NextFunction } from "express";
import { getEnv } from "../config/env.js";

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const env = getEnv();
  const statusCode = err.statusCode ?? 500;

  console.error(`[ERROR] ${statusCode} - ${err.message}`, {
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
    code: err.code,
  });

  res.status(statusCode).json({
    error:
      env.NODE_ENV === "production" && statusCode === 500
        ? "Internal server error"
        : err.message,
  });
}
