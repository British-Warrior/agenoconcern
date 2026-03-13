# Phase 5: Payments and Impact - Research

**Researched:** 2026-03-13
**Domain:** Stripe Connect marketplace payments (subscriptions, transfers, webhooks) + contributor impact dashboard
**Confidence:** HIGH (Stripe patterns verified against official docs; codebase patterns derived directly from existing Phase 1-4 code; all charge/transfer/hold approaches confirmed)

---

## Summary

Phase 5 adds three payment flows and an impact dashboard on top of a fully working Phases 1-4 platform. The Stripe Connect Express accounts from Phase 2 onboarding are already created and stored in `contributorProfiles.stripeAccountId`. The platform now needs to: (1) charge challengers (Customers) for retainers and SME subscriptions via Stripe Billing, (2) hold and release stipend fees for premium challenges via immediate charge + deferred Transfer, (3) route 75% of each charge to the relevant contributor's connected account using destination charges with `application_fee_amount`, and (4) receive confirmation via webhooks.

The critical architectural decision for stipend holding: **do not use `capture_method=manual`** (7-day card authorization limit). Instead, charge the challenger immediately (normal capture), hold the 75% contributor share in the platform's Stripe balance, and create a Transfer to the contributor's connected account only when the circle resolution is rated. UK Stripe accounts can hold funds up to 90 days — sufficient for a typical challenge lifecycle.

For subscriptions (retainers and SME), the correct model is destination charges with `transfer_data.destination` + `application_fee_percent=25`. Stripe automatically routes 75% to the contributor's connected account on each billing cycle. The webhook `invoice.paid` triggers any post-payment logic (recording earnings, sending notifications).

The impact dashboard aggregates data already present in the database: `challengeInterests` (challenges participated in), a new `contributorHours` table (self-reported hours per circle), `paymentTransactions` table (earnings history), and wellbeing scores. Since wellbeing check-ins are built in Phase 6, the wellbeing trajectory section of the dashboard is a placeholder in Phase 5 (shows empty state / "coming soon") — not a blocking dependency.

**Primary recommendation:** Use destination charges for subscriptions (simplest, automatic 75/25), separate charges + manual transfers for stipends (required for deferred release), and aggregate existing DB data for the impact dashboard. Add two new tables: `contributorHours` and `paymentTransactions`.

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.1 | Subscriptions, PaymentIntents, Transfers, Customers, Webhooks | Already in server package.json; Connect accounts already in use |
| drizzle-orm | ^0.38.0 | New tables: contributorHours, paymentTransactions | Already in use for all tables |
| zod | ^3.24.0 | Schemas for hours submission, payment admin inputs | Already in use for all validation |
| @tanstack/react-query | ^5.62.0 | useQuery/useMutation hooks for impact dashboard | Already in use |
| tailwindcss | ^4.0.0 | Dashboard styling with existing @theme tokens | Already in use |

### No New Library Installations Required

All Phase 5 features are achievable with the current server and web package.json. Do NOT add new libraries.

**New env vars needed:**
```
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...  # if frontend payment forms are added
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
packages/shared/src/
├── types/payments.ts          # PaymentTransaction, ContributorHours, PaymentType enum
├── types/impact.ts            # ImpactSummary, ContributorImpactResponse types
├── schemas/payments.ts        # Zod: logHoursSchema, createRetainerSchema (CM-only)
└── index.ts                   # Re-export new types and schemas

packages/server/src/
├── db/schema.ts               # Add: paymentTransactions, contributorHours tables + enums
├── routes/payments.ts         # New router: /api/payments/* — Stripe charge initiation, webhook
├── routes/impact.ts           # New router: /api/impact/* — dashboard data aggregation
├── services/stripe.service.ts # Extend: createDestinationCharge, createSubscription,
│                              #   createTransfer, constructWebhookEvent
└── express-app.ts             # Register new routers; add raw body middleware BEFORE express.json()

packages/web/src/
├── api/payments.ts            # API calls: logHours, getImpact
├── hooks/useImpact.ts         # useImpactSummary, useLogHours hook
└── pages/impact/
    └── ImpactDashboard.tsx    # Contributor impact page
```

### Pattern 1: Destination Charge (Retainer / SME Subscription)

**What:** Challenger is billed monthly. Stripe sends 75% to contributor's connected account automatically. Platform receives 25% as application fee.

**When to use:** Knowledge Transition retainer (PAY-02) and SME subscription (PAY-04).

**How it works:**
1. CM creates a Stripe `Customer` for the challenger (stored in `challenges.stripeCustomerId`)
2. CM creates a `Price` (monthly/annual, fixed amount) linked to a `Product`
3. CM creates a `Subscription` with `transfer_data.destination` = contributor's Stripe account ID and `application_fee_percent=25`
4. Stripe charges automatically each billing period; fires `invoice.paid` webhook
5. Webhook handler records a `paymentTransaction` row

```typescript
// Source: https://docs.stripe.com/connect/subscriptions
const subscription = await stripe.subscriptions.create({
  customer: challengerStripeCustomerId,
  items: [{ price: priceId }],
  application_fee_percent: 25, // Platform keeps 25%
  transfer_data: {
    destination: contributorStripeAccountId, // Contributor gets 75%
  },
  expand: ['latest_invoice.confirmation_secret'],
  metadata: {
    challengeId,
    contributorId,
    paymentType: 'retainer', // or 'sme_subscription'
  },
});
```

### Pattern 2: Stipend Hold Then Release

**What:** Challenger is charged a fixed project fee upfront. The 75% contributor share is held in the platform balance. On circle resolution rating (challenge complete), a Transfer is created to the contributor's connected account.

**When to use:** Premium challenge stipend (PAY-03). Do NOT use `capture_method=manual` — authorization expires in 7 days. Charge immediately, then transfer on condition.

**How it works:**
1. CM charges challenger via `PaymentIntent` with `transfer_group` = circleId
2. Normal capture (automatic) — funds land in platform balance as pending, then available
3. Platform holds the 75% portion (no Transfer created yet)
4. On `resolutionRatings` insert (challenger rates), server creates Transfer to contributor
5. Record `paymentTransaction` row for contributor's earnings

```typescript
// Step 1: Charge challenger (in CM-triggered endpoint)
// Source: https://docs.stripe.com/connect/separate-charges-and-transfers
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmountCents, // e.g. 200000 = £2000
  currency: 'gbp',
  customer: challengerStripeCustomerId,
  payment_method: challengerPaymentMethodId,
  confirm: true,
  transfer_group: circleId, // Links charge to future transfer
  metadata: { circleId, challengeId, paymentType: 'stipend' },
});

// Step 2: On resolution rated — release 75% to contributor
// Source: https://docs.stripe.com/connect/separate-charges-and-transfers
const contributorAmount = Math.floor(totalAmountCents * 0.75);
const transfer = await stripe.transfers.create({
  amount: contributorAmount,
  currency: 'gbp',
  destination: contributorStripeAccountId,
  transfer_group: circleId,
  source_transaction: paymentIntent.latest_charge as string, // Waits for funds to settle
  metadata: { circleId, contributorId },
});
```

### Pattern 3: Webhook Handler (Raw Body Required)

**What:** Stripe sends signed POST events to `/api/payments/webhook`. Signature must be verified before processing. Express global `express.json()` must NOT process this route — use `express.raw()` on the webhook route only.

**Critical:** The webhook route registration MUST come before `express.json()` in `express-app.ts`, or the raw body will be consumed before `constructWebhookEvent` can verify it.

```typescript
// In express-app.ts — ORDER MATTERS
// Source: https://docs.stripe.com/webhooks/signature

// 1. Webhook route with raw body parser (BEFORE express.json())
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  webhookHandler
);

// 2. JSON middleware for all other routes
app.use(express.json());

// In the webhook route handler:
const sig = req.headers['stripe-signature'] as string;
const event = stripe.webhooks.constructEvent(
  req.body, // Buffer — raw bytes
  sig,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

### Pattern 4: Impact Dashboard Data Aggregation

**What:** Single API endpoint `/api/impact/summary` returns a denormalized summary for the contributor dashboard. All data is already in the DB — this is a JOIN query, not a new data source.

**Data sources:**
- Challenges participated in: `challengeInterests` joined to `challenges` (filter: contributorId, status=active or has circle)
- Hours contributed: `contributorHours` table (self-reported per circle, new in Phase 5)
- Earnings: `paymentTransactions` table (new in Phase 5, populated by webhook handler)
- Unpaid contribution: `contributorHours` rows where payment_type is null / free challenge
- Wellbeing trajectory: placeholder/empty array in Phase 5 (Phase 6 adds the data)

### Anti-Patterns to Avoid

- **`capture_method=manual` for stipends:** Card authorizations expire in 7 days (most networks). Challenges run for weeks. Charge immediately and defer the Transfer instead.
- **Piping Stripe webhook through express.json():** Breaks signature verification. Raw bytes are required.
- **Storing card numbers:** Never. All payment methods are created client-side via Stripe.js / saved as Stripe PaymentMethod IDs.
- **Initiating transfers before `charge.succeeded`:** For async payment methods (ACH, SEPA), wait for the webhook event before creating a Transfer. Stripe does NOT auto-reverse a Transfer if the underlying charge fails for separate charges.
- **Creating Stripe Customers per contributor:** Challengers are the paying customers (Stripe Customers). Contributors are the recipients (Stripe Connect accounts). Don't confuse the two.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment split calculation | Custom split logic | `application_fee_percent: 25` on Subscription / `application_fee_amount` on PaymentIntent | Stripe calculates fee from final invoice amount including discounts |
| Fund holding for milestones | Complex escrow state machine | Immediate charge + deferred Transfer on condition | Stripe holds funds in platform balance up to 90 days (UK) |
| Subscription billing cycle | Cron jobs, manual invoicing | Stripe Billing with `stripe.subscriptions.create` | Stripe handles renewal, retry, dunning, and prorating |
| Payout scheduling | Custom payout scheduler | Stripe's standard payout schedule (typically T+2) | Stripe manages bank transfer to contributor bank account |
| Webhook signature verification | Custom HMAC | `stripe.webhooks.constructEvent()` | Timing-safe comparison, handles tolerance window |
| Idempotent retry handling | Custom retry table | Stripe idempotency keys (`idempotencyKey` option) | Prevents duplicate charges on network retry |

**Key insight:** Stripe Billing + Connect handles the entire subscription lifecycle, split, and payout chain. The platform's job is to initiate correctly and react to webhook events.

---

## Common Pitfalls

### Pitfall 1: Wrong Route Order for Webhooks
**What goes wrong:** Webhook signature verification fails with "No signatures found matching the expected signature."
**Why it happens:** `express.json()` middleware runs before the webhook handler and consumes the raw body. `constructWebhookEvent` receives a parsed JS object instead of a Buffer.
**How to avoid:** Register `POST /api/payments/webhook` with `express.raw({ type: 'application/json' })` BEFORE calling `app.use(express.json())` in `express-app.ts`.
**Warning signs:** `WebhookSignatureVerificationError` in logs; events arrive but are immediately rejected.

### Pitfall 2: Using capture_method=manual for Long-Running Holds
**What goes wrong:** PaymentIntent transitions to `canceled` automatically after 7 days (Visa CNP) if not captured. The stipend hold disappears without funds being transferred.
**Why it happens:** Card network rules limit authorization validity to 5-7 days for online transactions.
**How to avoid:** Charge immediately on stipend creation. Hold in platform balance. Transfer on resolution. UK 90-day hold window is sufficient.
**Warning signs:** PaymentIntents disappearing from requires_capture status; no-shows in webhook logs.

### Pitfall 3: Async Payment Methods Before charge.succeeded
**What goes wrong:** Transfer is created before the underlying payment succeeds. If the payment later fails (ACH/SEPA bounce), the Transfer is NOT auto-reversed. Platform balance goes negative.
**Why it happens:** Separate charges and transfers decouple the charge from the transfer — Stripe doesn't enforce linkage.
**How to avoid:** In the webhook handler for `invoice.paid` or `payment_intent.succeeded`, verify the charge status is `succeeded` before creating a Transfer. Use `source_transaction` on the Transfer to make it wait for settlement.
**Warning signs:** Negative platform balance; unexpected transfer reversals.

### Pitfall 4: Idempotency on Webhook Retry
**What goes wrong:** Stripe retries a webhook event if it doesn't receive a 200 response quickly. If the handler creates a Transfer on each delivery, duplicate transfers are created.
**Why it happens:** Webhook delivery guarantees "at least once" not "exactly once."
**How to avoid:** Check for an existing `paymentTransaction` row with the Stripe event ID before creating a Transfer. If it exists, return 200 immediately (idempotency guard).
**Warning signs:** Duplicate paymentTransaction rows; contributor sees doubled earnings.

### Pitfall 5: Stripe Customer vs Stripe Connect Account Confusion
**What goes wrong:** Code tries to charge a contributor (recipient) or create a Subscription against a connected account ID.
**Why it happens:** Both challengers and contributors have Stripe identifiers; terminology confusion.
**How to avoid:** Challengers have `stripeCustomerId` (payer). Contributors have `stripeAccountId` (payee). These are distinct objects. A Subscription has `customer` = challenger's Customer ID and `transfer_data.destination` = contributor's Connect account ID.
**Warning signs:** "No such customer" errors when passing an account ID as `customer`.

### Pitfall 6: Missing STRIPE_WEBHOOK_SECRET in env
**What goes wrong:** `constructWebhookEvent` throws because the secret is undefined. All webhooks fail silently or crash the handler.
**Why it happens:** The env schema in `packages/server/src/config/env.ts` doesn't include `STRIPE_WEBHOOK_SECRET` yet.
**How to avoid:** Add `STRIPE_WEBHOOK_SECRET` to the zod env schema immediately. Register a webhook endpoint in Stripe Dashboard or via CLI before testing.
**Warning signs:** `undefined` passed to `constructWebhookEvent`; TypeScript error on env access.

---

## Database Schema (New Tables)

Two new tables are required. Both follow existing Drizzle patterns.

### `paymentTransactions` table

Tracks all money movements affecting contributors. Populated by webhook handler.

```typescript
// Enums
export const paymentTypeEnum = pgEnum('payment_type', [
  'retainer',       // PAY-02: monthly KT retainer
  'stipend',        // PAY-03: premium challenge one-time fee
  'sme_subscription', // PAY-04: SME monthly/annual
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'held',           // Charged, transfer not yet created
  'transferred',    // Transfer created to contributor
  'failed',         // Payment or transfer failed
  'refunded',       // Refunded to challenger
]);

export const paymentTransactions = pgTable('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
  challengeId: uuid('challenge_id').references(() => challenges.id),
  circleId: uuid('circle_id').references(() => circles.id),
  paymentType: paymentTypeEnum('payment_type').notNull(),
  status: paymentStatusEnum('status').notNull().default('held'),
  amountPence: integer('amount_pence').notNull(),     // Contributor's 75% share in pence
  totalAmountPence: integer('total_amount_pence').notNull(), // Full charge amount
  currency: varchar('currency', { length: 3 }).notNull().default('gbp'),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  stripeEventId: varchar('stripe_event_id', { length: 255 }).unique(), // Idempotency guard
  transferredAt: timestamp('transferred_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### `contributorHours` table

Self-reported hours per circle. Enables "hours contributed" metric (IMPT-02) and recognition of unpaid work (IMPT-04).

```typescript
export const contributorHours = pgTable(
  'contributor_hours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contributorId: uuid('contributor_id').notNull().references(() => contributors.id),
    circleId: uuid('circle_id').notNull().references(() => circles.id),
    hoursLogged: smallint('hours_logged').notNull(),
    description: text('description'),
    isPaid: boolean('is_paid').notNull().default(false),
    loggedAt: timestamp('logged_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('contributor_hours_unique').on(table.contributorId, table.circleId, table.loggedAt)],
);
```

---

## Code Examples

### Create retainer subscription (CM-triggered)

```typescript
// Source: https://docs.stripe.com/connect/subscriptions
async function createRetainerSubscription(
  stripe: Stripe,
  challengerCustomerId: string,
  retainerAmountPence: number,
  contributorAccountId: string,
  challengeId: string,
  contributorId: string,
): Promise<Stripe.Subscription> {
  // Create a one-off Price (or reuse if product exists)
  const price = await stripe.prices.create({
    unit_amount: retainerAmountPence,
    currency: 'gbp',
    recurring: { interval: 'month' },
    product_data: { name: `Knowledge Transition Retainer — Challenge ${challengeId}` },
  });

  return stripe.subscriptions.create({
    customer: challengerCustomerId,
    items: [{ price: price.id }],
    application_fee_percent: 25,
    transfer_data: { destination: contributorAccountId },
    metadata: { challengeId, contributorId, paymentType: 'retainer' },
  });
}
```

### Release stipend on resolution rating

```typescript
// Source: https://docs.stripe.com/connect/separate-charges-and-transfers
async function releaseStipend(
  stripe: Stripe,
  db: ReturnType<typeof getDb>,
  circleId: string,
): Promise<void> {
  const txn = await db.query.paymentTransactions.findFirst({
    where: and(
      eq(paymentTransactions.circleId, circleId),
      eq(paymentTransactions.paymentType, 'stipend'),
      eq(paymentTransactions.status, 'held'),
    ),
  });
  if (!txn) return; // Free challenge — no stipend

  const contributorProfile = await db.query.contributorProfiles.findFirst({
    where: eq(contributorProfiles.contributorId, txn.contributorId),
  });

  const transfer = await stripe.transfers.create({
    amount: txn.amountPence,
    currency: txn.currency,
    destination: contributorProfile!.stripeAccountId!,
    transfer_group: circleId,
    source_transaction: txn.stripePaymentIntentId!, // Waits for settlement
    metadata: { circleId, contributorId: txn.contributorId },
  });

  await db.update(paymentTransactions)
    .set({ status: 'transferred', stripeTransferId: transfer.id, transferredAt: new Date() })
    .where(eq(paymentTransactions.id, txn.id));
}
```

### Webhook handler skeleton

```typescript
// Source: https://docs.stripe.com/webhooks/signature
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  // Idempotency guard
  const existing = await db.query.paymentTransactions.findFirst({
    where: eq(paymentTransactions.stripeEventId, event.id),
  });
  if (existing) { res.json({ received: true }); return; }

  switch (event.type) {
    case 'invoice.paid': {
      // Record subscription payment for retainer / SME subscription
      const invoice = event.data.object as Stripe.Invoice;
      // ... insert paymentTransaction with status='transferred'
      break;
    }
    case 'invoice.payment_failed': {
      // Notify CM; mark transaction as failed
      break;
    }
    case 'customer.subscription.deleted': {
      // Mark retainer/subscription as ended in DB
      break;
    }
  }

  res.json({ received: true });
});
```

### Impact summary query

```typescript
// GET /api/impact/summary — aggregate for current contributor
async function getImpactSummary(contributorId: string) {
  const db = getDb();

  const [challengesParticipated, hoursRows, earningsRows] = await Promise.all([
    // Challenges participated (active interests + circles)
    db.select({ challenge: challenges })
      .from(challengeInterests)
      .innerJoin(challenges, eq(challengeInterests.challengeId, challenges.id))
      .where(eq(challengeInterests.contributorId, contributorId)),

    // Hours logged
    db.select()
      .from(contributorHours)
      .where(eq(contributorHours.contributorId, contributorId)),

    // Earnings (transferred payments only)
    db.select()
      .from(paymentTransactions)
      .where(and(
        eq(paymentTransactions.contributorId, contributorId),
        eq(paymentTransactions.status, 'transferred'),
      )),
  ]);

  const totalHours = hoursRows.reduce((sum, r) => sum + r.hoursLogged, 0);
  const paidHours = hoursRows.filter(r => r.isPaid).reduce((sum, r) => sum + r.hoursLogged, 0);
  const unpaidHours = totalHours - paidHours;
  const totalEarningsPence = earningsRows.reduce((sum, r) => sum + r.amountPence, 0);

  return {
    challengesParticipated: challengesParticipated.map(r => r.challenge),
    totalHours,
    paidHours,
    unpaidHours,
    totalEarningsPence,
    earnings: earningsRows,
    wellbeingTrajectory: [], // Placeholder — Phase 6 populates this
  };
}
```

---

## Env Changes Required

Add to `packages/server/src/config/env.ts` zod schema:

```typescript
STRIPE_WEBHOOK_SECRET: z.string().default(''),
STRIPE_PUBLISHABLE_KEY: z.string().default(''), // needed if frontend checkout forms added
```

The webhook secret is obtained by:
- **Dev:** `stripe listen --forward-to localhost:3000/api/payments/webhook` — CLI prints `whsec_test_...`
- **Prod:** Create a webhook endpoint in Stripe Dashboard pointing to `https://your-domain.com/api/payments/webhook`, register events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

---

## State of the Art

| Old Approach | Current Approach | Impact |
|---|---|---|
| `capture_method=manual` for holds | Immediate charge + deferred Transfer | 90-day hold window instead of 7-day limit |
| Custom cron for subscription billing | Stripe Billing subscriptions | Stripe handles retry, dunning, prorate |
| Manual payout calculation | `application_fee_percent` on Subscription | Automatic at billing time |
| Raw charge API | PaymentIntents API | Required for Connect destination charges |

**Deprecated/outdated:**
- Charges API: Use PaymentIntents. The Charges API is legacy — Stripe documentation now directs all new integrations to PaymentIntents.
- `stripe.charges.create()` with `destination`: Replaced by `stripe.paymentIntents.create()` with `transfer_data`.

---

## Open Questions

1. **Challenger payment method collection**
   - What we know: Challengers need to be charged (Stripe Customers). No challenger-facing web UI exists (manual challenge intake via CM for first 100).
   - What's unclear: How does the CM capture challenger payment details? Stripe's Payment Links could allow a CM to send a one-time payment URL; alternatively, the CM enters card details via Stripe Dashboard.
   - Recommendation: For MVP pilot (20-30 challenges), CM uses Stripe Dashboard to create Customers and attach payment methods manually. The system just stores `challengerStripeCustomerId` in the challenges table. This unblocks Phase 5 without building a challenger portal.

2. **Wellbeing trajectory in impact dashboard**
   - What we know: IMPT-05 requires wellbeing trajectory. The wellbeing check-in table (UCLA + WEMWBS scores) doesn't exist until Phase 6.
   - What's unclear: Whether to block the dashboard on Phase 6 data or ship with a placeholder.
   - Recommendation: Ship impact dashboard with `wellbeingTrajectory: []` and an empty/coming-soon panel. The Phase 6 plan adds the data source and wires it in.

3. **Challenger Stripe Customer ID storage**
   - What we know: The `challenges` table has no `stripeCustomerId` column yet.
   - What's unclear: Should it be on `challenges` (one-time relationship) or on a new `challengers` entity?
   - Recommendation: Add `stripeCustomerId` and `stripePaymentMethodId` nullable columns to the `challenges` table. For MVP pilot with manual challenge intake, the CM populates these via a new CM-only PATCH endpoint.

4. **Employment Agencies Act 1973 (UK) legal blocker**
   - What we know: Prior plan noted a legal advice blocker before Phase 5 payments go live. The act may classify the platform as an employment agency depending on how contributor work is structured.
   - What's unclear: Whether this blocks technical build or just production deployment.
   - Recommendation: Build Phase 5 technically in full. Wire payments behind a feature flag or keep "paid" challenge type as `disabled` in production until legal advice is received. The code is ready; the switch is configuration.

---

## Sources

### Primary (HIGH confidence)
- [Stripe Connect — Separate Charges and Transfers](https://docs.stripe.com/connect/separate-charges-and-transfers) — transfer_group, source_transaction patterns
- [Stripe Connect — Destination Charges](https://docs.stripe.com/connect/destination-charges) — application_fee_amount, transfer_data
- [Stripe Connect — Subscriptions](https://docs.stripe.com/connect/subscriptions) — application_fee_percent, transfer_data.destination
- [Stripe — Place a Hold](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method) — capture_method=manual, 7-day limit confirmed
- [Stripe Connect — Manual Payouts](https://docs.stripe.com/connect/manual-payouts) — 90-day hold limit for UK confirmed
- [Stripe — Webhooks](https://docs.stripe.com/webhooks) — constructEvent, raw body requirement
- [Stripe — Subscription Webhooks](https://docs.stripe.com/billing/subscriptions/webhooks) — invoice.paid, invoice.payment_failed lifecycle
- Existing codebase: `packages/server/src/services/stripe.service.ts`, `packages/server/src/db/schema.ts`, `packages/server/src/express-app.ts`, `packages/web/src/App.tsx`

### Secondary (MEDIUM confidence)
- [Stripe Connect — Integration Recommendations](https://docs.stripe.com/connect/integration-recommendations) — charge type selection guidance
- [Stripe — Webhook Signature Verification Errors](https://docs.stripe.com/webhooks/signature) — express.raw() pattern for Express

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stripe@20.4.1 already installed and verified; all patterns derived from official Stripe docs
- Architecture patterns: HIGH — separation of subscription vs stipend flows verified against official Stripe docs; webhook raw body requirement verified
- Database schema: HIGH — follows identical Drizzle patterns used in phases 1-4
- Pitfalls: HIGH — 7-day auth limit confirmed from official docs; webhook raw body pitfall confirmed from multiple sources
- Impact dashboard queries: HIGH — all data already exists in DB from prior phases; pure aggregation

**Research date:** 2026-03-13
**Valid until:** 2026-06-13 (Stripe API versions are stable; 90-day hold limit unlikely to change)
