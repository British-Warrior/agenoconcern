---
phase: 05-payments-and-impact
plan: "02"
subsystem: payments-api
tags: [payments, stripe, webhook, impact, express]
dependency_graph:
  requires: ["05-01"]
  provides: ["payment-endpoints", "impact-endpoints", "webhook-handler"]
  affects: ["express-app"]
tech_stack:
  added: []
  patterns:
    - "express.raw() for webhook raw body before express.json()"
    - "Separate webhookHandler export for app-level registration"
    - "Promise.all parallel queries in impact summary"
    - "Idempotency via stripeEventId unique column check"
key_files:
  created:
    - packages/server/src/routes/payments.ts
    - packages/server/src/routes/impact.ts
  modified:
    - packages/server/src/express-app.ts
decisions:
  - id: "05-02-A"
    decision: "stipend route accepts contributorId in body (not in shared schema)"
    rationale: "chargeStipendSchema doesn't include contributorId (it's a service-level concern), but paymentTransactions needs it; added body extraction alongside schema parse"
    alternatives: ["extend chargeStipendSchema with contributorId"]
metrics:
  duration: "8 min"
  completed: "2026-03-13"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 5 Plan 2: Payment Routes and Impact API Summary

**One-liner:** Six payment endpoints (CM-initiated retainer/stipend/SME-subscription/release + contributor hours/transactions) and two impact endpoints, with webhook handler using express.raw() registered before express.json() for Stripe signature verification.

## What Was Built

### Payment Routes (`packages/server/src/routes/payments.ts`)

Six endpoints on the `/api/payments` router plus a separately exported `webhookHandler`:

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /retainer` | CM only | Create monthly retainer subscription; inserts paymentTransaction with status=held |
| `POST /stipend` | CM only | Charge stipend immediately; stores stripeChargeId for deferred release transfer |
| `POST /stipend/release` | CM only | Release held stipend to contributor Connect account using stored stripeChargeId as source_transaction |
| `POST /sme-subscription` | CM only | Create monthly/annual SME subscription |
| `POST /hours` | Contributor (circle member) | Log hours against a circle with membership guard |
| `GET /my-transactions` | Contributor | List all payment transactions for authenticated user |

**Webhook handler:**
- Verifies Stripe signature via `constructWebhookEvent` (throws 400 on failure)
- Idempotency guard: queries `paymentTransactions` WHERE `stripeEventId = event.id` before processing
- Handles `invoice.paid` (insert transferred transaction), `invoice.payment_failed` (update status to failed), `customer.subscription.deleted` (log only, no action for MVP)
- Exported separately as `webhookHandler` (not on the router) so it can be registered with `express.raw()`

### Impact Routes (`packages/server/src/routes/impact.ts`)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /summary` | Contributor | ImpactSummary with challenges participated, hours totals, earnings from transferred transactions, wellbeingTrajectory: [] |
| `GET /challenger` | Contributor | ChallengerImpact with challenges created by user, nested resolution and rating if they exist |

`GET /summary` uses `Promise.all` for three parallel queries (challenges, hours, earnings).

### express-app.ts Changes

Critical ordering: webhook route with `express.raw()` registered at line 27, `express.json()` at line 30.

```
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), webhookHandler);
app.use(express.json());
// ...existing routes...
app.use("/api/payments", paymentRoutes);
app.use("/api/impact", impactRoutes);
app.use(errorHandler); // remains last
```

## Commits

| Hash | Message |
|------|---------|
| `82c2f28` | feat(05-02): add payment routes and webhook handler |
| `706eee9` | feat(05-02): add impact routes and wire payment/impact into express-app |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed circleResolutions timestamp field name**
- **Found during:** Task 2 (creating impact.ts)
- **Issue:** Plan referenced `resolution.createdAt` but the schema column is `submittedAt` (from DB schema `submitted_at`)
- **Fix:** Used `resolution.submittedAt.toISOString()` to match actual schema
- **Files modified:** `packages/server/src/routes/impact.ts`
- **Commit:** `706eee9`

**2. [Rule 2 - Missing critical functionality] Added contributorId extraction for stipend route**
- **Found during:** Task 1 (creating payments.ts)
- **Issue:** `chargeStipendSchema` doesn't include `contributorId`, but `paymentTransactions` requires it as a NOT NULL foreign key
- **Fix:** Added body extraction of `contributorId` alongside schema parse with 400 guard if missing
- **Commit:** `82c2f28`

**3. [Rule 2 - Missing critical functionality] Added stripeChargeId null guard for stipend release**
- **Found during:** Task 1 (creating payments.ts)
- **Issue:** `txn.stripeChargeId` could be null if record is corrupt; calling `releaseStipendTransfer` with null would send null to Stripe API
- **Fix:** Added 400 guard: if `!txn.stripeChargeId` return "No charge ID on record for this stipend"
- **Commit:** `82c2f28`

## Self-Check

**Files exist:**
- [x] `packages/server/src/routes/payments.ts`
- [x] `packages/server/src/routes/impact.ts`
- [x] `packages/server/src/express-app.ts` (modified)

**Commits exist:**
- [x] `82c2f28` — payment routes
- [x] `706eee9` — impact routes + express-app wiring

**TypeScript:** `npx tsc --noEmit` passes with no errors.

**Key invariants verified:**
- Webhook at line 27, express.json() at line 30 — correct ordering
- `stripeChargeId` stored on stipend creation and used as `sourceChargeId` in release
- `stripeEventId` idempotency guard present
- `wellbeingTrajectory: []` in ImpactSummary response
- All CM endpoints use `requireRole("community_manager")`

## Self-Check: PASSED
