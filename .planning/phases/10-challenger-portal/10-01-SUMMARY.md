---
phase: "10"
plan: "01"
subsystem: challenger-portal
tags: [schema, migration, api, auth, challenger]
dependency_graph:
  requires:
    - "09-02: VANTAGE API key auth (challenger_organisations table exists)"
    - "packages/server/src/middleware/auth.ts (authMiddleware, requireRole)"
    - "packages/server/src/services/auth.service.ts (createTokens, setAuthCookies)"
  provides:
    - "5 challenger portal API endpoints at /api/challenger/*"
    - "Schema: contributor_id FK + organisation_type on challenger_organisations"
    - "Shared Zod schemas: registerChallengerSchema, submitChallengerChallengeSchema"
    - "Shared types: ChallengerOrg, ChallengerPortalChallenge, ChallengerPortalChallengeDetail"
  affects:
    - "packages/server/src/express-app.ts (new route mount)"
    - "packages/server/src/routes/auth.ts (dev-role challenger added)"
    - "packages/server/src/db/schema.ts (schema extended)"
    - "challenge_type DB enum (community, premium, knowledge_transition added)"
tech_stack:
  added: []
  patterns:
    - "db.transaction() for multi-table challenger registration"
    - "requireRole('challenger') role guard on all authenticated endpoints"
    - "status='draft' for challenger-submitted challenges (not 'open')"
    - "Ownership check via challenges.createdBy = req.contributor.id"
key_files:
  created:
    - "packages/server/src/routes/challenger.ts"
    - "packages/server/drizzle/0003_challenger-portal.sql"
    - "packages/shared/src/schemas/challenger.ts"
    - "packages/shared/src/types/challenger.ts"
  modified:
    - "packages/server/src/db/schema.ts"
    - "packages/server/src/express-app.ts"
    - "packages/server/src/routes/auth.ts"
    - "packages/shared/src/index.ts"
decisions:
  - "ChallengerPortalChallenge (not ChallengerChallenge) — avoids conflict with existing ChallengerChallenge in types/impact.ts"
  - "Extend challenge_type DB enum with community/premium/knowledge_transition — plan required these types; stored directly rather than mapping to paid/free"
  - "Migration applied manually (targeted SQL) — same Drizzle journal issue as Phase 9"
metrics:
  duration: "~25 minutes"
  completed: "2026-03-16"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 10 Plan 01: Challenger Portal Server Foundation Summary

**One-liner:** Challenger portal server foundation: 5 REST endpoints, JWT session auth, DB migration extending challenger_organisations with FK+type columns, and challenger-specific Zod schemas/types.

## What Was Built

The complete server-side foundation for the challenger self-service portal. Challenger organisations can now register with a full account (contributor + org records in a transaction), submit challenge briefs as drafts, list their own challenges with circle data, view circle progress and member details, and see resolution/rating data. The dev-role switcher supports the challenger role for testing.

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/challenger/register | Public | Create contributor (role=challenger) + org in transaction, set session cookie |
| GET | /api/challenger/me | challenger | Return org data for authenticated challenger |
| POST | /api/challenger/challenges | challenger | Submit challenge brief, stored with status=draft |
| GET | /api/challenger/challenges | challenger | List owned challenges with circle progress |
| GET | /api/challenger/challenges/:id | challenger | Detail view: circle members, resolution, rating |

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Schema migration + shared types | 0f001db | schema.ts, 0003_challenger-portal.sql, schemas/challenger.ts, types/challenger.ts |
| 2 | Challenger routes + mount + dev-role fix | 99fc4f4 | routes/challenger.ts, express-app.ts, routes/auth.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Extended challenge_type DB enum to match Zod schema types**
- **Found during:** Task 2 — implementing the challenger routes
- **Issue:** The plan specified `type: z.enum(["community", "premium", "knowledge_transition"])` in the Zod schema, but the `challenges` table `type` column uses `challengeTypeEnum` which only contained `["paid", "free"]`. Storing challenger-submitted challenge types would fail at the DB level.
- **Fix:** Extended `challengeTypeEnum` in schema.ts to include `community`, `premium`, `knowledge_transition`. Applied `ALTER TYPE challenge_type ADD VALUE` statements directly to DB. Updated the migration SQL file to document the changes.
- **Files modified:** `packages/server/src/db/schema.ts`, `packages/server/drizzle/0003_challenger-portal.sql`
- **Commit:** 99fc4f4

**2. [Rule 1 - Bug] ChallengerPortalChallenge naming to avoid type conflict**
- **Found during:** Task 1 — creating shared types
- **Issue:** The plan specified `ChallengerChallenge` as the type name, but `packages/shared/src/types/impact.ts` already exports `ChallengerChallenge` with different fields (minimal impact view). Using the same name would cause a conflict in the shared package index.ts re-export.
- **Fix:** Named the new types `ChallengerPortalChallenge` and `ChallengerPortalChallengeDetail` to avoid the collision. Plan 02 (React portal) should use these names.
- **Files modified:** `packages/shared/src/types/challenger.ts`, `packages/shared/src/index.ts`
- **Commit:** 0f001db

**3. [Rule 3 - Blocking] Migration applied manually (Phase 9 journal pattern)**
- **Found during:** Task 1 — drizzle-kit generate succeeded, drizzle-kit migrate would have re-run prior migrations
- **Issue:** Drizzle journal had prior migrations in the JSON but DB tracking table only showed 0002. Running `drizzle-kit migrate` would conflict.
- **Fix:** Applied ALTER TABLE statements directly via Node.js postgres client. Applied ALTER TYPE for enum values. Marked migration in `drizzle.__drizzle_migrations` table manually.
- **Commit:** 0f001db

## Verification Results

1. Schema columns: `SELECT contributor_id, organisation_type FROM challenger_organisations LIMIT 0` — PASS
2. Registration: POST /api/challenger/register → 201, Set-Cookie headers present — PASS
3. Duplicate email: POST with same email → 409 — PASS
4. Auth guard: GET /api/challenger/challenges without cookies → 401 — PASS
5. Role guard: requireRole("challenger") in middleware — PASS (verified by registration flow)
6. Challenge submission: POST /api/challenger/challenges → 201, status="draft" — PASS
7. Ownership: GET /challenges returns only the one challenge created by that user — PASS
8. TypeScript: noEmit passes in both shared and server — PASS

## Self-Check: PASSED

All created files verified present. All task commits verified in git log.
