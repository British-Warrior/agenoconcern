---
phase: 09-server-foundation-and-vantage
plan: "02"
subsystem: server
tags: [api-key-auth, rate-limiting, vantage, express, middleware]
dependency_graph:
  requires: ["09-01"]
  provides: ["api-key-authentication", "vantage-endpoints", "vantage-contract"]
  affects: ["packages/server/src/express-app.ts"]
tech_stack:
  added: ["express-rate-limit"]
  patterns: ["timing-safe comparison", "fire-and-forget last_used_at update", "rate-limiter-first middleware ordering"]
key_files:
  created:
    - packages/server/src/middleware/api-key-auth.ts
    - packages/server/src/routes/vantage.ts
    - packages/server/VANTAGE-CONTRACT.md
  modified:
    - packages/server/src/express-app.ts
    - packages/server/package.json
decisions:
  - "Rate limiter applied before apiKeyMiddleware: throttles unauthenticated flooding without DB hit"
  - "timingSafeEqual secondary check after DB hash lookup: prevents timing attacks on comparison"
  - "last_used_at update is fire-and-forget: non-blocking, failure logged but not surfaced to caller"
  - "Key creation uses cookie/JWT admin auth, not API key auth: bootstrapping concern"
metrics:
  duration: "~3 min"
  completed: "2026-03-16"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 9 Plan 02: VANTAGE API Key Auth and Routes Summary

API key authentication middleware for VANTAGE (SHA-256 hash lookup + `timingSafeEqual`) with express-rate-limit (60 req/min per key) and three VANTAGE endpoints mounted at `/api/vantage`.

## What Was Built

### Task 1: express-rate-limit + API key middleware (d9f83bf)

**`packages/server/src/middleware/api-key-auth.ts`** — Two exports:

- **`apiKeyMiddleware`**: Reads `X-API-Key` header, SHA-256 hashes it, queries `api_keys` WHERE `key_hash = $hash AND is_active = true AND expires_at > now()`, performs `timingSafeEqual` against stored hash bytes, updates `lastUsedAt` (fire-and-forget), attaches `req.vantageClient = { keyId, scopes }`. Returns 401 on any failure. Completely independent of JWT/cookie auth.
- **`vantageRateLimiter`**: `rateLimit({ windowMs: 60000, limit: 60, standardHeaders: "draft-8" })` keyed on the raw `X-API-Key` header value (falls back to IP).

Express.Request augmented with `vantageClient?: { keyId: string; scopes: string[] }`.

### Task 2: VANTAGE routes, express-app mount, contract doc (8502f96)

**`packages/server/src/routes/vantage.ts`** — Three routes:

| Route | Auth | Description |
|-------|------|-------------|
| `POST /keys` | Cookie JWT (admin only) | Creates API key, returns raw key once |
| `GET /challenges` | X-API-Key | Paginated open challenges (page/limit/domain) |
| `GET /challenges/:id` | X-API-Key | Single challenge by UUID |

Middleware order on challenge routes: `vantageRateLimiter` → `apiKeyMiddleware` (rate limiting before auth prevents DB flooding from unauthenticated requests).

**`packages/server/src/express-app.ts`** — Added `app.use("/api/vantage", vantageRoutes)` before error handler.

**`packages/server/VANTAGE-CONTRACT.md`** — Full endpoint contract with request/response shapes, auth requirements, rate limit table, security notes, and field descriptions.

## Deviations from Plan

None — plan executed exactly as written.

## Key Links Satisfied

- `vantage.ts` → `api-key-auth.ts` via `apiKeyMiddleware` applied to VANTAGE routes
- `express-app.ts` → `vantage.ts` via `app.use('/api/vantage', vantageRoutes)`
- `api-key-auth.ts` → `schema.ts` via `apiKeys` table hash lookup

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `d9f83bf` | feat(09-02): install express-rate-limit and create API key middleware |
| 2 | `8502f96` | feat(09-02): create VANTAGE routes, mount on Express app, write contract doc |

## Self-Check: PASSED

All created files verified present. Both task commits verified in git log.
