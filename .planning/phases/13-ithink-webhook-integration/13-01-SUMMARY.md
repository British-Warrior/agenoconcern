---
phase: 13
plan: "01"
subsystem: ithink-webhook
tags: [webhook, database, schema, zod, env]
dependency_graph:
  requires: [12-01, 12-02, 12-03]
  provides: [webhook_deliveries table, ithink_attention_flags table, ithinkWebhookPayloadSchema, ITHINK_WEBHOOK_SECRET env contract]
  affects: [13-02, 13-03]
tech_stack:
  added: []
  patterns: [drizzle-sql-migration, zod-schema-shared-package, env-required-no-default]
key_files:
  created:
    - packages/server/scripts/create-webhook-tables.mjs
    - packages/shared/src/schemas/ithink-webhook.ts
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/src/config/env.ts
    - packages/shared/src/index.ts
decisions:
  - "ithink_signal_type enum created via DO $$ IF NOT EXISTS block — CREATE TYPE IF NOT EXISTS is invalid PostgreSQL"
  - "ITHINK_WEBHOOK_SECRET has no .default() — server refuses to start without it"
  - "ITHINK_WEBHOOK_SECRET_PREV is optional — supports dual-secret rotation in Plan 13-02"
metrics:
  duration: "~15 min"
  completed: "2026-03-23"
---

# Phase 13 Plan 01: iThink Webhook Foundation Summary

PostgreSQL tables, Drizzle ORM schema, required env secret, and shared Zod payload schema for iThink webhook ingestion — with delivery_id UNIQUE constraint for idempotency.

## What Was Built

### webhook_deliveries table
Idempotency log for all inbound webhook events. `delivery_id VARCHAR(255) UNIQUE` prevents duplicate processing at the database layer regardless of upstream retry behaviour.

### ithink_attention_flags table
One row per processed signal event. FKs to contributors (ON DELETE CASCADE) and institutions (ON DELETE CASCADE). `cleared_by` FK uses ON DELETE SET NULL. `signal_type` is constrained to the `ithink_signal_type` enum (only `attention_flag` accepted).

### Drizzle schema exports
`webhookDeliveries` and `ithinkAttentionFlags` added to `packages/server/src/db/schema.ts`, following exact FK/enum patterns from Phase 12 tables.

### ITHINK_WEBHOOK_SECRET env contract
Added to `packages/server/src/config/env.ts` with `z.string().min(32)` and no `.default()`. Server will throw a Zod parse error at startup if the secret is absent or too short. `ITHINK_WEBHOOK_SECRET_PREV` is optional (`.optional()`) for zero-downtime secret rotation.

### Shared Zod schema
`ithinkWebhookPayloadSchema` exported from `packages/shared` with fields: `deliveryId` (uuid), `timestamp` (int, unix epoch seconds), `contributorEmail` (email), `institutionSlug` (min 1), `signalType` (enum: `attention_flag`), `cohortSize` (optional int >= 1), `flaggedCount` (optional int >= 0). Re-exported from `packages/shared/src/index.ts`.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 2 | Webhook tables migration and Drizzle schema | 7212b11 | create-webhook-tables.mjs, schema.ts |
| 3 | Env vars and shared Zod payload schema | fe22b2a | env.ts, ithink-webhook.ts, index.ts |

## Verification Results

- Migration runs idempotently (ON CONFLICT DO NOTHING on migration record, CREATE TABLE IF NOT EXISTS)
- `webhook_deliveries` UNIQUE constraint on delivery_id confirmed
- `ithink_attention_flags` UNIQUE constraint on delivery_id confirmed
- All three FKs present: contributor_id (cascade), institution_id (cascade), cleared_by (set null)
- `npx tsc --noEmit` passes in both `packages/server` and `packages/shared`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `packages/server/scripts/create-webhook-tables.mjs` exists
- [x] `packages/server/src/db/schema.ts` exports `webhookDeliveries` and `ithinkAttentionFlags`
- [x] `packages/server/src/config/env.ts` contains `ITHINK_WEBHOOK_SECRET` with no default
- [x] `packages/shared/src/schemas/ithink-webhook.ts` exports `ithinkWebhookPayloadSchema` and `IThinkWebhookPayload`
- [x] `packages/shared/src/index.ts` re-exports both
- [x] Commits 7212b11 and fe22b2a exist in git log
- [x] Both tables confirmed in PostgreSQL with correct constraints
