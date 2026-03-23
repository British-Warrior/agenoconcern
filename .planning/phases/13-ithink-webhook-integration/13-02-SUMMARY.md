---
phase: 13
plan: 02
subsystem: server/webhooks
tags: [webhook, hmac, security, idempotency, dual-secret]
dependency_graph:
  requires: ["13-01"]
  provides: ["13-03"]
  affects: ["packages/server/src/express-app.ts", "packages/server/src/routes/webhooks.ts"]
tech_stack:
  added: []
  patterns: ["HMAC-SHA256 dual-secret rotation", "express.raw() before express.json()", "idempotency via delivery log"]
key_files:
  created:
    - packages/server/src/routes/webhooks.ts
  modified:
    - packages/server/src/express-app.ts
decisions:
  - "Sign over timestamp.rawBody (not rawBody alone) — matches iThink's actual signing format per CRITICAL_UPDATE"
  - "Dual-secret fallback: try ITHINK_WEBHOOK_SECRET first, then ITHINK_WEBHOOK_SECRET_PREV if set"
  - "Idempotency check before any DB writes — duplicate deliveryId returns 200 immediately"
  - "Contributor/institution lookup returns same 422 for both missing cases — avoids enumeration"
  - "Timestamp window check placed AFTER signature verification to prevent timing oracle on expired-but-signed requests"
metrics:
  duration: "~8 min"
  completed: "2026-03-23"
---

# Phase 13 Plan 02: iThink Webhook Handler Summary

HMAC-SHA256 webhook handler with dual-secret rotation, 5-minute replay protection, idempotency guard, and contributor-institution assignment enforcement.

## What Was Built

### Task 1: `packages/server/src/routes/webhooks.ts` (175 lines)

Three-layer security stack implemented as a single handler function exported as `ithinkWebhookHandler`:

1. **Signature extraction** — 401 if `X-IThink-Signature` header is missing or non-string
2. **Timestamp extraction** — 401 if `X-IThink-Timestamp` header is missing or non-string
3. **HMAC verification** — Signs `timestamp + "." + rawBody.toString("utf8")` using `node:crypto` `createHmac`; falls back to `ITHINK_WEBHOOK_SECRET_PREV` for zero-downtime rotation; uses `timingSafeEqual` with length guard to prevent throw
4. **JSON parse** — 400 on malformed JSON
5. **Timestamp window** — 401 if `|now - requestTs| > 300` seconds
6. **Zod validation** — 400 with flattened errors on schema failure
7. **Idempotency** — SELECT from `webhookDeliveries`; if found, return 200 immediately (no second flag written)
8. **Contributor lookup** — 422 if email not found
9. **Institution lookup** — 422 if slug not found
10. **Assignment check** — 403 if contributor not in `contributorInstitutions` junction for that institution
11. **INSERT `ithinkAttentionFlags`** — contributorId, institutionId, deliveryId, signalType, cohortSize (nullable), flaggedCount (nullable)
12. **INSERT `webhookDeliveries`** — deliveryId, source "ithink"
13. **200 `{ received: true }`**

### Task 2: `packages/server/src/express-app.ts`

- Imported `ithinkWebhookHandler` from `./routes/webhooks.js`
- Registered `POST /api/webhooks/ithink` with `express.raw({ type: "application/json" })` — placed immediately after the Stripe webhook registration, before `app.use(express.json())`

## Curl Verification Results

All 5 tests passed against the live dev server:

| Test | Condition | Expected | Got |
|------|-----------|----------|-----|
| 1 | No `X-IThink-Signature` header | 401 | 401 |
| 2 | Invalid/wrong signature | 401 | 401 |
| 3 | Valid sig, timestamp=0 (expired) | 401 | 401 |
| 4 | Valid sig, `deliveryId` not UUID | 400 | 400 |
| 5 | Valid sig, valid schema, unknown contributor | 422 | 422 |

## Deviations from Plan

None — plan executed exactly as written.

Note: The `CRITICAL_UPDATE` in the plan confirmed the signing format (`timestamp.rawBody`) which was already the specified approach. No deviation was required.

## Self-Check

- [x] `packages/server/src/routes/webhooks.ts` exists (175 lines, > 80 minimum)
- [x] `packages/server/src/express-app.ts` contains `webhooks/ithink`
- [x] `packages/server/src/express-app.ts` contains `ithinkWebhookHandler`
- [x] Task 1 commit: `1201498`
- [x] Task 2 commit: `282000f`
- [x] TypeScript: `npx tsc --noEmit` passes with zero errors
- [x] All 5 curl security tests return expected status codes
