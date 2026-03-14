---
phase: 05-payments-and-impact
verified: 2026-03-14T14:39:04Z
status: gaps_found
score: 9/10 must-haves verified
re_verification: false
gaps:
  - truth: "Hours can be logged from the impact dashboard"
    status: failed
    reason: "Frontend logHours() calls POST /api/impact/hours but the endpoint is on paymentRoutes mounted at /api/payments, making the correct URL POST /api/payments/hours. The impactRoutes router has no POST routes. Hours logging will 404."
    artifacts:
      - path: "packages/web/src/api/payments.ts"
        issue: "logHours() calls /api/impact/hours (line 24) wrong base path"
      - path: "packages/server/src/routes/payments.ts"
        issue: "POST /hours handler on paymentRoutes (line 235), mounted at /api/payments in express-app.ts"
      - path: "packages/server/src/routes/impact.ts"
        issue: "No POST /hours route only GET /summary and GET /challenger"
    missing:
      - "Change /api/impact/hours to /api/payments/hours in packages/web/src/api/payments.ts line 24, OR move POST /hours from payments.ts to impact.ts"
human_verification:
  - test: "Visual layout of impact dashboard"
    expected: "5 sections visible with correct styling, responsive grid, muted wellbeing card"
    why_human: "Visual appearance cannot be verified from source"
  - test: "Stripe Connect onboarding end-to-end"
    expected: "stripeAccountId stored on profile, stripeStatus=complete after OAuth redirect"
    why_human: "Requires live Stripe test credentials and real browser OAuth redirect"
  - test: "Retainer subscription with webhook"
    expected: "invoice.paid inserts paymentTransaction status=transferred with 75% amountPence"
    why_human: "Requires Stripe test mode with stripe listen webhook forwarding"
  - test: "Stipend hold and release"
    expected: "Stipend charged (held), release Transfer uses source_transaction=ch_..."
    why_human: "Requires real Stripe PaymentIntent to get actual ch_... charge ID"
---

# Phase 5: Payments and Impact Verification Report

**Phase Goal:** Contributors earn income through the platform and can see the full picture of their paid and unpaid contributions
**Verified:** 2026-03-14T14:39:04Z
**Status:** gaps_found (1 gap)
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Contributor can onboard to Stripe Connect and receive payouts | VERIFIED | createConnectAccount, createAccountLink, getAccountStatus wired in onboarding.ts lines 357-408 |
| 2 | Retainer payments process monthly with 75/25 split | VERIFIED | createRetainerSubscription uses application_fee_percent:25 and transfer_data.destination; POST /retainer inserts transaction |
| 3 | Stipend held via PaymentIntent and released with 75/25 split | VERIFIED | chargeStipend immediate capture; stripeChargeId stored and used as source_transaction in releaseStipendTransfer |
| 4 | SME subscription payments process monthly/annually | VERIFIED | createSmeSubscription with interval param; POST /sme-subscription functional |
| 5 | Dashboard shows challenges participated in | VERIFIED | ChallengesSection renders from summary.challengesParticipated via useImpactSummary |
| 6 | Dashboard shows hours with paid/unpaid breakdown | VERIFIED | HoursSection displays totalHours, paidHours, unpaidHours; Log Hours form present |
| 7 | Dashboard shows total earnings in GBP | VERIFIED | EarningsSection uses Intl.NumberFormat(en-GB) with GBP currency on totalEarningsPence |
| 8 | Dashboard shows unpaid contribution recognised | VERIFIED | UnpaidRecognitionSection with affirming language |
| 9 | Dashboard shows wellbeing trajectory placeholder | VERIFIED | WellbeingSection renders Coming Soon badge with opacity-60 bg-neutral-50; no fake data |
| 10 | Hours can be logged from the impact dashboard | FAILED | logHours() posts to /api/impact/hours (line 24) but endpoint is /api/payments/hours -- 404 |

**Score:** 9/10 truths verified

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| packages/server/src/db/schema.ts | VERIFIED | paymentTransactions (line 360), contributorHours (line 385), stripeChargeId (line 375), stripeCustomerId on challenges (line 188), stripeEventId unique (line 378) |
| packages/server/src/services/stripe.service.ts | VERIFIED | 5 functions: createRetainerSubscription, createSmeSubscription, chargeStipend, releaseStipendTransfer, constructWebhookEvent |
| packages/shared/src/types/payments.ts | VERIFIED | PaymentType, PaymentStatus, PaymentTransaction, ContributorHours |
| packages/shared/src/schemas/payments.ts | VERIFIED | 5 Zod schemas with inferred types |
| packages/shared/src/types/impact.ts | VERIFIED | ImpactChallenge, ImpactEarning, ImpactSummary, ChallengerChallenge, ChallengerImpact |
| packages/shared/src/index.ts | VERIFIED | All payment and impact types/schemas re-exported (lines 121-152) |
| packages/server/src/config/env.ts | VERIFIED | STRIPE_WEBHOOK_SECRET added (line 49) |
| packages/server/src/routes/payments.ts | VERIFIED | 6 endpoints plus webhookHandler exported separately; idempotency guard; stripeChargeId stored on stipend |
| packages/server/src/routes/impact.ts | VERIFIED | GET /summary (Promise.all 3 queries), GET /challenger (challenges+resolutions+ratings) |
| packages/server/src/express-app.ts | VERIFIED | Webhook line 27 with express.raw() before express.json() line 30 |
| packages/web/src/api/payments.ts | PARTIAL | getImpactSummary and getChallengerImpact correct; logHours has wrong path |
| packages/web/src/hooks/useImpact.ts | VERIFIED | useImpactSummary, useChallengerImpact, useLogHours with cache invalidation |
| packages/web/src/pages/impact/ImpactDashboard.tsx | VERIFIED | 374 lines, 5 sections, Intl.NumberFormat, no stubs |
| packages/web/src/pages/impact/ChallengerView.tsx | VERIFIED | 158 lines, resolution and rating display, truncation at 200 chars |
| packages/web/src/App.tsx | VERIFIED | Routes /impact and /impact/challenger defined (lines 66-67) |
| packages/web/src/components/layout/Navbar.tsx | VERIFIED | My Impact link to /impact (lines 41-45), after My Circles, authenticated users only |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| express-app.ts | webhookHandler | express.raw() before express.json() | WIRED | Line 27 before line 30 |
| payments.ts | stripe.service.ts | createRetainerSubscription, chargeStipend, releaseStipendTransfer | WIRED | All imported and called in handlers |
| payments.ts | paymentTransactions | Insert on retainer/stipend/SME, update on release | WIRED | All payment routes insert/update correctly |
| impact.ts | schema tables | challengeInterests, contributorHours, paymentTransactions | WIRED | GET /summary uses Promise.all with 3 parallel queries |
| ImpactDashboard.tsx | /api/impact/summary | useImpactSummary hook | WIRED | Data fetched and all 5 sections rendered |
| ChallengerView.tsx | /api/impact/challenger | useChallengerImpact hook | WIRED | Challenges mapped to ChallengeOutcomeCard |
| LogHoursForm in ImpactDashboard.tsx | /api/impact/hours | useLogHours then logHours() | BROKEN | Frontend path wrong; actual endpoint is /api/payments/hours |
| App.tsx | ImpactDashboard.tsx | React Router /impact | WIRED | Line 66 |
| chargeStipend return | releaseStipendTransfer source_transaction | stripeChargeId in paymentTransactions | WIRED | Stored at stipend creation (line 110), retrieved for release (line 168) |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|---------|
| packages/web/src/api/payments.ts | 24 | Wrong API path: /api/impact/hours instead of /api/payments/hours | Blocker | Hours logging 404s on every submission |

### Human Verification Required

#### 1. Visual layout of impact dashboard

**Test:** Navigate to /impact as an authenticated active contributor
**Expected:** 5 card sections in a responsive 2-column grid; Wellbeing card visually muted with Coming Soon badge; domain badge chips on challenges; GBP formatted earnings
**Why human:** Visual appearance, responsive layout, and colour accuracy cannot be verified from source

#### 2. Stripe Connect onboarding completion

**Test:** Complete onboarding through /onboarding/stripe; complete Stripe Express onboarding; return to app
**Expected:** stripeAccountId stored on contributor profile, stripeStatus=complete
**Why human:** Requires live Stripe test credentials and real browser OAuth redirect flow

#### 3. Payment processing - retainer subscription with webhook

**Test:** As CM, POST /api/payments/retainer with valid test customer and contributor with Connect account; trigger invoice.paid webhook via stripe trigger
**Expected:** Subscription created; webhook inserts paymentTransaction status=transferred, amountPence=75% of total, stripeEventId set
**Why human:** Requires Stripe test mode with stripe listen forwarding

#### 4. Stipend hold and release flow

**Test:** POST /api/payments/stipend with test customer; POST /api/payments/stipend/release for that circleId
**Expected:** Transfer to contributor Connect account using source_transaction=ch_...; transaction status=transferred with stripeTransferId
**Why human:** Requires real Stripe PaymentIntent to get actual ch_... charge ID from confirmed payment

## Gaps Summary

One gap blocks full goal achievement: **the hours logging form will always 404.**

The frontend logHours() in packages/web/src/api/payments.ts (line 24) calls POST /api/impact/hours. But POST /hours is defined on paymentRoutes in packages/server/src/routes/payments.ts (line 235), which express-app.ts mounts at /api/payments. The correct URL is POST /api/payments/hours. The impactRoutes router (mounted at /api/impact) has no POST routes.

Fix: change /api/impact/hours to /api/payments/hours in packages/web/src/api/payments.ts line 24, or move POST /hours from payments.ts to impact.ts.

All other success criteria are fully implemented and wired: DB schema, Stripe service (no manual capture, ch_... source_transaction, 25% application_fee_percent), payment routes, webhook with raw body ordering and idempotency, impact API aggregation, all 5 dashboard sections, challenger view, routing, and navigation.

_Verified: 2026-03-14T14:39:04Z_
_Verifier: Claude (gsd-verifier)_
---
_Verified: 2026-03-14T14:39:04Z_
_Verifier: Claude (gsd-verifier)_
