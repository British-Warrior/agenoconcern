---
phase: 03
plan: 01
subsystem: challenges-backend
tags: [schema, drizzle, matching-algorithm, api-routes, shared-types]
dependency_graph:
  requires: [02-01, 02-02, 02-03]
  provides: [challenge-db-tables, matching-service, challenges-api]
  affects: [03-02, 03-03]
tech_stack:
  added: []
  patterns:
    - TypeScript in-memory scoring (avoids JSONB arrayOverlaps bug)
    - Atomic SQL increment for interestCount
    - Unique constraint on (challengeId, contributorId) for upsert pattern
    - 24-hour cooldown via lastWithdrawnAt timestamp comparison
key_files:
  created:
    - packages/shared/src/types/challenge.ts
    - packages/shared/src/schemas/challenge.ts
    - packages/server/src/db/schema.ts (extended)
    - packages/server/src/services/matching.service.ts
    - packages/server/src/routes/challenges.ts
  modified:
    - packages/shared/src/index.ts
    - packages/server/src/express-app.ts
decisions:
  - Match scoring done in TypeScript (not SQL) — avoids Drizzle JSONB arrayOverlaps bug #4935
  - interestCount incremented with sql`count + 1` — concurrency-safe atomic update
  - /my-interests route declared before /:id to prevent route shadowing
  - deadline stored as `date` string column (not timestamp) — ISO date "YYYY-MM-DD"
  - skillsNeeded stored as jsonb — MVP scale, TypeScript scoring sidesteps operator bug
metrics:
  duration: 25 min
  completed: 2026-03-12
---

# Phase 3 Plan 1: Backend — DB Schema, Shared Types, Matching Algorithm, Challenge API Routes

One-liner: Drizzle schema with challenges/challenge_interests tables, TypeScript scoring algorithm with greedy team composition, and 7-endpoint challenges REST API with atomic interest toggling and CM-gated routes.

## What Was Built

### Task 1: Schema, Shared Types, and Matching Service

**Shared types** (`packages/shared/src/types/challenge.ts`): Challenge, ChallengeInterest, ChallengeFilters, TeamComposition, ChallengeInterestResponse, ChallengeFeedResponse.

**Shared Zod schemas** (`packages/shared/src/schemas/challenge.ts`): createChallengeSchema (title 5-200, description 20-5000, brief 10-500, domain enum, skillsNeeded max 20, type paid/free, optional deadline, circleSize 2-10 default 4), updateChallengeSchema (all optional partial), interestNoteSchema (note max 500 optional).

**Database schema** — three new enums and two new tables pushed to PostgreSQL:
- `challengeTypeEnum`: paid | free
- `challengeStatusEnum`: draft | open | closed | archived
- `challengeInterestStatusEnum`: active | withdrawn
- `challenges` table: id, createdBy (FK restrict), title, description, brief, domain, skillsNeeded (jsonb), type, deadline (date), circleSize (smallint), status, interestCount (integer), timestamps
- `challengeInterests` table: id, challengeId (FK cascade), contributorId (FK cascade), status, note, matchScore (smallint), lastWithdrawnAt, timestamps; unique constraint on (challengeId, contributorId)

**Matching service** (`packages/server/src/services/matching.service.ts`):
- `scoreContributorForChallenge`: skill overlap × 70 + domain match 30 = 0–100
- `suggestTeamCompositions`: 3 compositions (top-scoring, greedy coverage, balanced mix), deduplicates identical ones, each scored with coverageScore/diversityScore/balanceScore (50/30/20 weighted)

### Task 2: Challenge API Routes

**`packages/server/src/routes/challenges.ts`** — 7 routes:

| Route | Auth | Notes |
|-------|------|-------|
| GET /api/challenges | auth | TypeScript scoring, sorted by score desc, strip _score from response |
| GET /api/challenges/my-interests | auth | Declared before /:id to prevent shadowing |
| GET /api/challenges/:id | auth | Full challenge + myInterest |
| POST /api/challenges | CM only | createChallengeSchema, status forced to "open" |
| PUT /api/challenges/:id | CM only | Edit lock when interestCount > 0 (status-only allowed) |
| POST /api/challenges/:id/interest | auth | Toggle with 24h cooldown, soft capacity warning in response |
| GET /api/challenges/:id/interests | auth | Conditional name visibility (CM sees all; contributor sees own) |
| GET /api/challenges/:id/team-suggestions | CM only | suggestTeamCompositions with scored candidates |

**`packages/server/src/express-app.ts`**: Mounted `challengeRoutes` at `/api/challenges`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Express @types/express v5 req.params typing**
- **Found during:** Task 2 TypeScript compilation
- **Issue:** `@types/express` v5 types `req.params` values as `string | string[]`. Drizzle's `eq()` overloads don't accept `string | string[]` — only `string | SQLWrapper`. Every `req.params.id` call caused TS2769 errors.
- **Fix:** Cast all `req.params["id"]` usages with `as string` — consistent with how the existing onboarding route handles `req.params["jobId"]`.
- **Files modified:** `packages/server/src/routes/challenges.ts`
- **Commit:** 2219157

## Verification

- TypeScript: `packages/server/node_modules/.bin/tsc -p packages/server/tsconfig.json --noEmit` — PASS
- TypeScript: `packages/shared/node_modules/.bin/tsc -p packages/shared/tsconfig.json --noEmit` — PASS
- Schema push: `drizzle-kit push` — `[✓] Changes applied`
- Server startup: Initializes fully (fails only on EADDRINUSE because dev server already running on port 3000)

## Self-Check: PASSED

All created files exist. Both task commits (6867aad, 2219157) confirmed in git log.
