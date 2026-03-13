---
phase: 05-payments-and-impact
plan: 01
subsystem: payments
tags: [stripe, postgres, drizzle, zod, typescript]

# Dependency graph
requires:
  - phase: 04-circles-and-collaboration
    provides: circles table and circleId FK references used in paymentTransactions and contributorHours
  - phase: 03-challenges-and-matching
    provides: challenges table extended with stripeCustomerId column
provides:
  - paymentTransactions DB table tracking all money movements with stripeChargeId for Transfer source_transaction
  - contributorHours DB table for self-reported hours per circle
  - stripeCustomerId column on challenges table
  - Stripe service functions for retainer/SME subscriptions (destination charges, 75/25 split) and stipend (separate charge + deferred transfer)
  - constructWebhookEvent for stripe webhook signature verification
  - Shared PaymentTransaction, ContributorHours, ImpactSummary, ChallengerImpact types
  - Zod schemas for all payment and hours operations
affects: [05-02-payment-routes, 05-03-impact-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate charges + transfers pattern for stipends: immediate PaymentIntent capture, deferred Transfer using source_transaction=ch_..."
    - "Destination charge subscriptions for retainers/SME: application_fee_percent=25 with transfer_data.destination"
    - "stripeChargeId (ch_...) stored separately from stripePaymentIntentId (pi_...) — required for source_transaction in Transfer"
    - "stripeEventId unique column for webhook idempotency deduplication"

key-files:
  created:
    - packages/shared/src/types/payments.ts
    - packages/shared/src/schemas/payments.ts
    - packages/shared/src/types/impact.ts
  modified:
    - packages/server/src/db/schema.ts
    - packages/server/src/config/env.ts
    - packages/server/src/services/stripe.service.ts
    - packages/shared/src/index.ts

key-decisions:
  - "No capture_method=manual for stipends — immediate capture avoids 7-day card auth expiry, Transfer is deferred to resolution approval"
  - "source_transaction in Transfer uses ch_... Charge ID (from latest_charge), NOT pi_... PaymentIntent ID"
  - "stripeEventId unique constraint enforces webhook idempotency at DB level"
  - "wellbeingTrajectory typed as never[] in ImpactSummary — placeholder for future Phase 6 feature"

patterns-established:
  - "Payment split: amountPence = contributor 75%, totalAmountPence = full charge; platform keeps 25%"
  - "contributorHours unique on (contributorId, circleId, loggedAt) to prevent duplicate hour logging"

# Metrics
duration: 8min
completed: 2026-03-13
---

# Phase 5 Plan 01: Payment Schema, Types, and Stripe Service Summary

**Drizzle schema with paymentTransactions (stripeChargeId for Transfer) and contributorHours tables, Stripe service covering destination charge subscriptions (75/25) and separate charge + deferred transfer stipend pattern**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-13T17:41:00Z
- **Completed:** 2026-03-13T17:49:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Two new DB tables: paymentTransactions (with critical stripeChargeId column for Transfer source_transaction) and contributorHours (with unique constraint on contributorId+circleId+loggedAt)
- stripeCustomerId column added to challenges table; STRIPE_WEBHOOK_SECRET added to env config
- Five new Stripe service functions covering all Phase 5 payment flows with correct architecture (no manual capture, ch_... charge IDs for transfers)
- Shared types and Zod schemas for all payment operations and impact dashboard responses

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema, env config, shared types and schemas** - `2ed7633` (feat)
2. **Task 2: Stripe service extensions for all payment flows** - `e1e4695` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `packages/server/src/db/schema.ts` - Added paymentTypeEnum, paymentStatusEnum, paymentTransactions table, contributorHours table, stripeCustomerId on challenges
- `packages/server/src/config/env.ts` - Added STRIPE_WEBHOOK_SECRET
- `packages/server/src/services/stripe.service.ts` - Added createRetainerSubscription, createSmeSubscription, chargeStipend, releaseStipendTransfer, constructWebhookEvent
- `packages/shared/src/types/payments.ts` - PaymentType, PaymentStatus, PaymentTransaction, ContributorHours types
- `packages/shared/src/schemas/payments.ts` - Zod schemas for createRetainer, chargeStipend, createSmeSubscription, logHours, releaseStipend
- `packages/shared/src/types/impact.ts` - ImpactChallenge, ImpactEarning, ImpactSummary, ChallengerChallenge, ChallengerImpact types
- `packages/shared/src/index.ts` - Re-exported all new payment and impact types/schemas

## Decisions Made
- No `capture_method: 'manual'` on stipend PaymentIntents — immediate capture avoids the 7-day card authorization expiry; the Transfer to the contributor is deferred until circle resolution approval
- `source_transaction` in the Transfer call uses `ch_...` Charge ID extracted from `paymentIntent.latest_charge`, not the `pi_...` PaymentIntent ID (Stripe requirement)
- `stripeEventId` has a unique constraint for webhook idempotency deduplication at the DB level
- `wellbeingTrajectory` typed as `never[]` in ImpactSummary as a typed placeholder for Phase 6

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before payment routes can process webhooks:**
- `STRIPE_WEBHOOK_SECRET`: Run `stripe listen --forward-to localhost:3000/api/payments/webhook` in dev (CLI prints `whsec_test_...`) OR create an endpoint in Stripe Dashboard -> Developers -> Webhooks for production.

## Next Phase Readiness
- All DB tables, shared types, and Stripe service functions are ready for 05-02 (payment API routes)
- 05-03 (impact dashboard) can use ImpactSummary and ChallengerImpact types immediately
- No DB migration run yet — migration required before routes go live (handled in 05-02)
- Blocker: Employment Agencies Act 1973 classification still needs legal advice before payments go live (carried from STATE.md)

## Self-Check: PASSED

All 6 created/modified files present. Both task commits (2ed7633, e1e4695) verified in git log.

---
*Phase: 05-payments-and-impact*
*Completed: 2026-03-13*
