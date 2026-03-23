---
phase: 13
plan: "03"
subsystem: ithink-webhook-dispatch
tags: [webhook, ithink, hmac, dispatch, external]
dependency_graph:
  requires: [13-01, 13-02]
  provides: [iThink webhook dispatch, HMAC signing, test endpoint, webhook-info endpoint]
  affects: []
tech_stack:
  added: []
  patterns: [hmac-sha256-signing, fire-and-forget-dispatch, exponential-backoff-retry]
key_files:
  created: []
  modified: []
decisions:
  - "iThink side built externally by Kirk — not in this monorepo"
  - "Signing format: HMAC-SHA256 of timestamp.rawBody (not rawBody alone)"
  - "Retry policy: 3 attempts with 1s/3s/9s exponential backoff"
  - "Shared secret: whsec_ prefixed, 64 hex chars, stored as ITHINK_WEBHOOK_SECRET on both sides"
metrics:
  duration: "external"
  completed: "2026-03-23"
---

# Phase 13 Plan 03: iThink Webhook Dispatch Summary

iThink-side webhook dispatch service built externally by Kirk. Sends signed POST requests to IU's /api/webhooks/ithink endpoint when a screening flags a contributor as needing attention.

## What Was Built (External)

### Webhook dispatcher service
HMAC-SHA256 signing over `<timestamp>.<rawBody>` format. Fire-and-forget from the screening handler with 3-attempt retry (1s → 3s → 9s exponential backoff on non-2xx).

### Headers sent on every webhook
- `X-IThink-Signature` — HMAC-SHA256 hex digest
- `X-IThink-Timestamp` — Unix epoch seconds
- `X-IThink-Delivery` — deliveryId (idempotency key)

### Supporting endpoints
- `GET /api/partner/indomitable-unity/webhook-info` — returns signing contract and algorithm
- `POST /api/partner/indomitable-unity/webhook-test` — triggers synthetic attention_flag webhook for end-to-end testing

### Secret rotation (WHOOK-08)
Supported via dual-secret pattern on IU side (ITHINK_WEBHOOK_SECRET + ITHINK_WEBHOOK_SECRET_PREV). iThink signs with current secret; IU accepts either.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Checkpoint: iThink repo structure | N/A | Resolved — built externally |
| 2 | Webhook dispatch service | N/A | Built externally by Kirk |

## Verification Results

- iThink dispatches signed webhooks matching the agreed payload contract
- Signing format (`timestamp.body`) matches IU receiver's verification logic
- Test endpoint available for end-to-end verification
- Retry policy provides resilience for transient failures

## Deviations from Plan

- Plan assumed iThink was in `packages/ithink/` monorepo — it is a separate project
- Implementation done externally rather than by executor agent
- Retry logic added (3 attempts, exponential backoff) — plan specified fire-and-forget only

## Self-Check: PASSED

- [x] iThink can sign and dispatch webhook payloads (confirmed by user)
- [x] Signing format matches IU receiver (timestamp.body verified via curl tests in 13-02)
- [x] Secret rotation supported (dual-secret on IU side)
- [x] Test endpoint available for connectivity verification
