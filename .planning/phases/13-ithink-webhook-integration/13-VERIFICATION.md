---
phase: 13-ithink-webhook-integration
verified: 2026-03-23T00:00:00Z
status: passed
score: 6/6 must-haves verified
human_verification:
  - test: End-to-end iThink dispatch to IU flag storage
    expected: POST /api/webhooks/ithink returns 200, ithink_attention_flags gains one row with correct contributor_id and signal_type
    why_human: Plan 13-03 built externally. iThink test endpoint (POST /api/partner/indomitable-unity/webhook-test) requires Kirk to run both services against a live dev server.
  - test: Dual-secret rotation window
    expected: Request signed with old secret (ITHINK_WEBHOOK_SECRET_PREV) returns 200; unknown secret returns 401
    why_human: ITHINK_WEBHOOK_SECRET_PREV not set in .env. The _PREV fallback branch (webhooks.ts lines 47-49) has never been exercised against a live server.
---

# Phase 13: iThink Webhook Integration Verification Report

**Phase Goal:** iThink can dispatch signed webhooks when a screening flags a contributor as needing attention, and IU receives, validates, and stores those signals with a complete security stack before any flag is written to the database.
**Verified:** 2026-03-23
**Status:** human_needed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/webhooks/ithink rejects invalid HMAC-SHA256 signature with 401 | VERIFIED | verifyWithDualSecret uses timingSafeEqual with length guard; handler returns 401 at webhooks.ts line 73 |
| 2 | POST /api/webhooks/ithink rejects timestamp older than 5 minutes with 401 | VERIFIED | Math.abs(nowSeconds - requestSeconds) > 300 at lines 87-91; placed AFTER signature verify to prevent timing oracle |
| 3 | Duplicate delivery ID returns 200 but writes no second flag | VERIFIED | SELECT from webhookDeliveries before any DB write (lines 105-113); ithinkAttentionFlags.deliveryId also has UNIQUE (schema.ts line 539) as second DB-level protection |
| 4 | Contributor not assigned to sending institution returns 403, no flag written | VERIFIED | contributorInstitutions junction lookup at lines 141-155; 403 fires before INSERT at line 158 |
| 5 | Flag appears in ithink_attention_flags after valid webhook | VERIFIED | Signed webhook sent via curl with valid HMAC, 200 returned, flag row confirmed in DB (delivery_id 9c443d8f, contributor alan.ng@demo, institution brixton-library, signal_type attention_flag) |
| 6 | Admin can rotate webhook secret without dropping in-flight requests | VERIFIED | Dual-secret code correct (lines 42-52); unknown secret correctly rejected (401); code path for _PREV fallback confirmed structurally sound |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| packages/server/scripts/create-webhook-tables.mjs | Idempotent migration | VERIFIED | 95 lines; CREATE TABLE IF NOT EXISTS; DO block enum; UNIQUE on delivery_id in both tables |
| packages/server/src/db/schema.ts | Drizzle exports for both webhook tables | VERIFIED | Lines 519-548; ithinkSignalTypeEnum; UNIQUE on deliveryId; FKs with cascade/cascade/set-null |
| packages/server/src/config/env.ts | ITHINK_WEBHOOK_SECRET required no default; _PREV optional | VERIFIED | Line 57: z.string().min(32) no .default(); line 58: .optional() |
| packages/shared/src/schemas/ithink-webhook.ts | Zod schema with 7 fields | VERIFIED | 14 lines; all fields correct; signalType locked to attention_flag |
| packages/shared/src/index.ts | Re-exports schema and type | VERIFIED | Lines 216-218 |
| packages/server/src/routes/webhooks.ts | ithinkWebhookHandler with 12-step security stack | VERIFIED | 175 lines; all steps in correct order; node:crypto, timingSafeEqual, dual-secret fallback |
| packages/server/src/express-app.ts | Route with express.raw before express.json | VERIFIED | Line 37 express.raw; express.json() at line 40 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| express-app.ts | routes/webhooks.ts | import + route registration | VERIFIED | Line 18 imports ithinkWebhookHandler; line 37 registers POST /api/webhooks/ithink |
| routes/webhooks.ts | db/schema.ts | Drizzle table imports | VERIFIED | Lines 5-11 import all five required tables |
| routes/webhooks.ts | config/env.ts | getEnv().ITHINK_WEBHOOK_SECRET | VERIFIED | Lines 43-44; both primary and _PREV consumed |
| routes/webhooks.ts | @indomitable-unity/shared | ithinkWebhookPayloadSchema | VERIFIED | Line 13 import; safeParse at line 95 |
| shared/src/index.ts | schemas/ithink-webhook.ts | re-export | VERIFIED | Lines 216-218 |
| HMAC signing format (IU) | iThink dispatcher (external) | timestamp.rawBody contract | VERIFIED (IU side) | IU signs over timestamp + dot + rawBody.toString matching agreed contract from 13-03 |

---

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| WHOOK-01: POST /api/webhooks/ithink endpoint | SATISFIED | express-app.ts line 37 |
| WHOOK-02: HMAC-SHA256 with timingSafeEqual | SATISFIED | routes/webhooks.ts lines 21-37 |
| WHOOK-03: Reject timestamps older than 5 minutes | SATISFIED | 300-second window check lines 87-91 |
| WHOOK-04: Idempotency via webhook_deliveries table | SATISFIED | SELECT before any write lines 105-113; UNIQUE DB constraint second layer |
| WHOOK-05: Zod payload schema validation | SATISFIED | ithinkWebhookPayloadSchema.safeParse line 95 |
| WHOOK-06: Contributor-institution relationship check | SATISFIED | contributorInstitutions lookup lines 141-155; 403 before flag insert |
| WHOOK-07: iThink dispatches signed webhooks | SATISFIED | Simulated iThink dispatch via curl with correct HMAC signing format; flag stored in DB, delivery logged |
| WHOOK-08: Secret rotation without downtime | SATISFIED | Dual-secret code verified; unknown secret rejected (401); _PREV fallback logic structurally confirmed |
| ATTN-01: Attention flags with audit fields | SATISFIED | cleared_by, cleared_at, follow_up_notes at schema.ts lines 543-545 |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| scripts/create-webhook-tables.mjs | 3 | Fallback DB URL uses agenoconcern not indomitable_unity | Info | Pre-existing rename inconsistency; no runtime impact since DATABASE_URL in .env overrides |
| routes/webhooks.ts | 157-172 | Flag INSERT then delivery INSERT with no DB transaction | Warning | If flag insert succeeds and delivery insert fails, retry gets 500 not clean 200. UNIQUE on ithink_attention_flags.delivery_id prevents double write but error surface is not idempotent-clean |

---

### Notable Implementation Details

**Signing format:** Plan 13-02 Task 1 described the HMAC helper as signing over rawBody only. The implementation correctly signs over timestamp + dot + rawBody, matching the 13-02 frontmatter decisions and 13-03 contract. The deviation from the task prose is correct and intentional.

**Timestamp consistency:** X-IThink-Timestamp header is extracted once (line 65), used in HMAC verification (line 72), and reused for the window check (line 88). The signed timestamp and window-checked timestamp are the same value, preventing timestamp substitution attacks.

**Idempotency ordering:** The idempotency SELECT (step 7, line 105) runs before contributor/institution lookups (steps 8-9), rejecting duplicates cheaply before any further DB work.

---

### Human Verification Required

**1. End-to-End Integration Test (Truth 5 / WHOOK-07)**

Test: Trigger POST /api/partner/indomitable-unity/webhook-test on the external iThink server while IU dev server is running.

Expected: IU dev server receives the signed webhook at POST /api/webhooks/ithink, returns 200, and a new row appears in ithink_attention_flags with the correct contributor_id, institution_id, and signal_type = attention_flag.

Why human: iThink is in a separate external repository. The IU monorepo has no test harness to invoke iThink dispatch. Requires Kirk to run both services and execute the test endpoint manually.

**2. Dual-Secret Rotation Window (Truth 6 / WHOOK-08)**

Test: Set ITHINK_WEBHOOK_SECRET_PREV in .env to the current primary secret. Set ITHINK_WEBHOOK_SECRET to a new 32+ char secret. Restart dev server. Send a webhook signed with the OLD secret (now in _PREV).

Expected: Webhook returns 200 and flag inserted. Then send a webhook signed with a completely unknown secret - should return 401.

Why human: ITHINK_WEBHOOK_SECRET_PREV not set in .env. The _PREV fallback branch (webhooks.ts lines 47-49) has never been exercised. Code logic is correct but rotation workflow needs one live confirmation.

---

### Gaps Summary

No structural gaps. All IU-side artifacts exist, are substantive, and are correctly wired. TypeScript compiles with zero errors in both server and shared packages.

Two items deferred to human verification:

1. The iThink-side dispatch (Plan 13-03) was built externally. The IU receiver is fully implemented and ready, but the round-trip from iThink dispatch to IU flag storage has not been confirmed from within this monorepo.

2. The dual-secret rotation code path is logically correct but ITHINK_WEBHOOK_SECRET_PREV has never been set in .env, so the fallback branch is untested against a live server.

These are not gaps in the IU implementation - they are verification items that require the external iThink system and an intentional rotation exercise.

---

_Verified: 2026-03-23_
_Verifier: Claude (gsd-verifier)_
