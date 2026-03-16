---
phase: 09-server-foundation-and-vantage
plan: "01"
subsystem: database-schema
tags: [schema, migration, enums, api-keys, challenger]
dependency_graph:
  requires:
    - "packages/server/src/db/schema.ts (existing tables)"
    - "packages/shared/src/types/auth.ts (ContributorRole)"
    - "packages/shared/src/constants.ts (CONTRIBUTOR_ROLES)"
  provides:
    - "challenger enum value in contributor_role Postgres enum"
    - "api_keys table with key_hash unique constraint"
    - "challenger_organisations table with FK to api_keys"
    - "ContributorRole TypeScript union includes challenger"
    - "CONTRIBUTOR_ROLES constant includes challenger"
  affects:
    - "packages/shared/src/schemas/contributor.schemas.ts (auto-derives challenger via z.enum)"
    - "All downstream VANTAGE API key auth (Phase 9 plan 02+)"
    - "Challenger portal routes (Phase 9/10)"
tech_stack:
  added: []
  patterns:
    - "Drizzle pgTable + pgEnum for schema definition"
    - "drizzle-kit generate for migration generation (cumulative snapshot diffing)"
    - "Direct SQL application for migrations when Drizzle journal is out of sync with DB"
key_files:
  created:
    - "packages/server/drizzle/0002_add-challenger-role-and-orgs.sql"
    - "packages/server/drizzle/meta/0002_snapshot.json"
  modified:
    - "packages/server/src/db/schema.ts"
    - "packages/shared/src/types/auth.ts"
    - "packages/shared/src/constants.ts"
decisions:
  - "Migration applied manually (targeted SQL) because Drizzle migration journal was empty while DB had all prior tables — drizzle-kit migrate would have re-created already-existing tables. Applied only ALTER TYPE + CREATE TABLEs + FKs, then marked 0002 as applied in drizzle.__drizzle_migrations."
metrics:
  duration: "5 min"
  completed: "2026-03-16"
---

# Phase 9 Plan 01: Schema Migration — Challenger Role, API Keys, Challenger Orgs Summary

**One-liner:** Postgres enum extended with `challenger` value plus `api_keys` and `challenger_organisations` tables created, with TypeScript types and zod schemas updated to match.

## What Was Built

### Task 1 — Shared types and constants (commit `9a5079c`)

- `ContributorRole` union type: added `"challenger"` (packages/shared/src/types/auth.ts)
- `CONTRIBUTOR_ROLES` constant: added `"challenger"` (packages/shared/src/constants.ts)
- `contributor.schemas.ts` requires no change — it derives from `CONTRIBUTOR_ROLES` via `z.enum()` and picks up the new value automatically

### Task 2 — Server schema + migration (commit `41dd6b9`)

- `contributorRoleEnum` in schema.ts extended with `"challenger"`
- `apiKeys` table added: id, name, key_hash (unique), scopes (jsonb), is_active, expires_at, last_used_at, created_at, created_by (FK → contributors)
- `challengerOrganisations` table added: id, name, contact_email, api_key_id (FK → api_keys), created_at, updated_at
- Migration `0002_add-challenger-role-and-orgs.sql` generated via `drizzle-kit generate`
- Migration applied directly via targeted SQL script (see deviation below)
- Drizzle migration journal updated to reflect 0002 as applied

## Verification

```
contributor_role enum: ['contributor', 'community_manager', 'admin', 'challenger']
New tables present: ['api_keys', 'challenger_organisations']
api_keys unique constraints: ['api_keys_key_hash_unique']
packages/shared: npx tsc --noEmit — PASS
packages/server: npx tsc --noEmit — PASS
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] drizzle-kit migrate failed due to empty migration journal**

- **Found during:** Task 2 — `npx drizzle-kit migrate` exited with code 1
- **Issue:** The Drizzle migration journal (`drizzle.__drizzle_migrations`) was empty — no prior migrations had been applied via `drizzle-kit migrate`. All existing DB tables were created outside the Drizzle tracking system. The generated 0002 migration included `CREATE TYPE` and `CREATE TABLE` statements for all 15 tables already in the DB, causing `type "auth_provider" already exists` errors on first statement.
- **Fix:** Applied only the three new additions directly with targeted SQL (ALTER TYPE + CREATE TABLE api_keys + CREATE TABLE challenger_organisations + FK constraints), then inserted the 0002 hash into `drizzle.__drizzle_migrations` to mark it applied. The generated migration file and snapshot are preserved as the canonical Drizzle record.
- **Files modified:** Applied via temporary script (deleted after use); no source files changed by this fix
- **Commit:** 41dd6b9 (schema and migration generation)

## Self-Check: PASSED

All key files exist:
- packages/shared/src/types/auth.ts — FOUND
- packages/shared/src/constants.ts — FOUND
- packages/server/src/db/schema.ts — FOUND
- packages/server/drizzle/0002_add-challenger-role-and-orgs.sql — FOUND
- .planning/phases/09-server-foundation-and-vantage/09-01-SUMMARY.md — FOUND

Commits verified:
- 9a5079c feat(09-01): add challenger to ContributorRole type and CONTRIBUTOR_ROLES constant — FOUND
- 41dd6b9 feat(09-01): add api_keys and challenger_organisations tables to schema and migration — FOUND
