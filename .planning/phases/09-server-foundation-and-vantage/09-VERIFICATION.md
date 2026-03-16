---
phase: 09-server-foundation-and-vantage
verified: 2026-03-16T00:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
gaps: []
human_verification: []
---

# Phase 9: Server Foundation and VANTAGE Verification Report

**Phase Goal:** VANTAGE can call the platform's REST API with a secure API key, and the codebase has the type and schema foundation needed to build the challenger portal.
**Verified:** 2026-03-16
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | VANTAGE authenticates via X-API-Key header, independent of cookie auth | VERIFIED | `apiKeyMiddleware` in `api-key-auth.ts` reads `req.headers["x-api-key"]`, has no JWT/cookie dependency; explicitly does NOT call `authMiddleware` |
| 2 | API keys stored as SHA-256 hashes; raw key shown exactly once at creation | VERIFIED | `POST /api/vantage/keys` generates `randomBytes(32)`, hashes with SHA-256, stores only `keyHash`; responds with raw `key` and comment "never log it"; `keyHash` column is `varchar(64)` (SHA-256 hex length) |
| 3 | Requests beyond rate limit receive HTTP 429 | VERIFIED | `vantageRateLimiter` (express-rate-limit, 60 req/60 s) applied via `router.use(vantageRateLimiter)` *before* `router.use(apiKeyMiddleware)`; handler returns `res.status(429).json({ error: "Rate limit exceeded" })` |
| 4 | VANTAGE-CONTRACT.md lists every consumed endpoint with request/response shapes | VERIFIED | `packages/server/VANTAGE-CONTRACT.md` documents `POST /api/vantage/keys`, `GET /api/vantage/challenges`, and `GET /api/vantage/challenges/:id` — each with full request fields, response JSON shapes, error table, and rate-limit behaviour |
| 5 | `challenger_organisations` table and `challenger` enum value exist via a named Drizzle migration | VERIFIED | Migration `0002_add-challenger-role-and-orgs.sql` issues `ALTER TYPE "contributor_role" ADD VALUE 'challenger'` and `CREATE TABLE "challenger_organisations"`; registered in `_journal.json` as `0002_add-challenger-role-and-orgs` |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `packages/server/src/middleware/api-key-auth.ts` | API key auth + rate limiter | Yes | 104 lines, no stubs | Imported in `vantage.ts` | VERIFIED |
| `packages/server/src/routes/vantage.ts` | VANTAGE routes | Yes | 129 lines, real DB queries | Imported in `express-app.ts`, mounted at `/api/vantage` | VERIFIED |
| `packages/server/src/express-app.ts` | Route mounting | Yes | `app.use("/api/vantage", vantageRoutes)` at line 65 | N/A (entry point) | VERIFIED |
| `packages/server/VANTAGE-CONTRACT.md` | API contract document | Yes | 205 lines, 3 endpoints documented | N/A (documentation) | VERIFIED |
| `packages/server/src/db/schema.ts` — `apiKeys` table | API key storage | Yes | Defined at line 458–468; `key_hash varchar(64) unique` | Used in both `api-key-auth.ts` and `vantage.ts` | VERIFIED |
| `packages/server/src/db/schema.ts` — `challengerOrganisations` table | Challenger portal foundation | Yes | Defined at line 471–478; FK to `api_keys` | Schema exported; migration created it | VERIFIED |
| `packages/server/src/db/schema.ts` — `challenger` enum value | Role type foundation | Yes | `contributorRoleEnum` includes `"challenger"` at line 29 | Used by `contributors.role` column | VERIFIED |
| `packages/shared/src/types/auth.ts` — `ContributorRole` | Shared type union | Yes | `"challenger"` included in union at line 3 | N/A (type definition) | VERIFIED |
| `packages/shared/src/constants.ts` — `CONTRIBUTOR_ROLES` | Shared constants array | Yes | `"challenger"` included at line 5 | N/A (constant definition) | VERIFIED |
| `packages/server/drizzle/0002_add-challenger-role-and-orgs.sql` | Named migration | Yes | Adds `challenger` enum value + creates `api_keys` + `challenger_organisations` + 12 other tables | Registered in `_journal.json` | VERIFIED |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `vantage.ts` | `api-key-auth.ts` | `import { apiKeyMiddleware, vantageRateLimiter }` | WIRED | Both applied via `router.use()` in correct order (rate limiter before auth middleware) |
| `express-app.ts` | `vantage.ts` | `import { vantageRoutes }` + `app.use("/api/vantage", vantageRoutes)` | WIRED | Line 14 import, line 65 mount |
| `api-key-auth.ts` | `schema.ts` (`apiKeys`) | `import { apiKeys } from "../db/schema.js"` + DB query | WIRED | Queries `apiKeys` table on every request; uses `keyHash`, `isActive`, `expiresAt` columns |
| `vantage.ts` `POST /keys` | `schema.ts` (`apiKeys`) | `import { apiKeys }` + `db.insert(apiKeys)` | WIRED | Inserts row, returns `inserted.id`, `name`, `scopes`, `expiresAt` |
| Rate limiter | Cookie auth path | None (intentional isolation) | CORRECTLY UNWIRED | `apiKeyMiddleware` has no reference to `authMiddleware`; the key-creation route uses `authMiddleware` separately on its own handler, not on the VANTAGE auth middleware chain |

---

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| VANTAGE API key authentication | SATISFIED | X-API-Key header, SHA-256 lookup, timing-safe compare |
| Rate limiting at 60 req/min | SATISFIED | `express-rate-limit` with per-key generator, 429 handler |
| Raw key shown once at creation | SATISFIED | `POST /keys` returns `key: raw`, never stored |
| VANTAGE-CONTRACT.md | SATISFIED | 3 endpoints fully documented with shapes and error tables |
| `challenger_organisations` table in DB | SATISFIED | In schema.ts and migration `0002` |
| `challenger` role enum value | SATISFIED | In `contributorRoleEnum`, `ContributorRole` type, `CONTRIBUTOR_ROLES` constant, and migration `0002` |

---

### Anti-Patterns Found

None. No TODO/FIXME/placeholder patterns found in any phase-modified files. All route handlers execute real database queries and return substantive responses.

---

### Human Verification Required

None required for automated checks. The following items are low-risk and can be verified at integration test time:

1. **Rate limit header format** — Verify `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` are present in responses (draft-8 standard). The `standardHeaders: "draft-8"` option is configured but header names can only be confirmed by making a real request.

2. **Key creation admin guard** — Verify `POST /api/vantage/keys` returns 403 (not 401) when authenticated as a non-admin role. This depends on `requireRole("admin")` behaviour in the auth middleware, which is shared code from a previous phase.

---

### Gaps Summary

No gaps. All 5 observable truths are fully verified. Every artifact exists, is substantive, and is correctly wired into the application. The migration is named, registered in the Drizzle journal, and contains both the `challenger` enum alteration and the `challenger_organisations` table creation.

---

_Verified: 2026-03-16_
_Verifier: Claude (gsd-verifier)_
