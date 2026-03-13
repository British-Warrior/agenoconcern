import Stripe from "stripe";
import { getEnv } from "../config/env.js";

function getStripeClient(): Stripe {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe not configured: STRIPE_SECRET_KEY is required");
  }
  return new Stripe(env.STRIPE_SECRET_KEY);
}

/**
 * Create a Stripe Connect Express account for a contributor.
 * Returns the Stripe account ID.
 */
export async function createConnectAccount(
  contributorId: string,
  email?: string,
): Promise<string> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.create({
    type: "express",
    email,
    metadata: { contributorId },
    capabilities: {
      transfers: { requested: true },
    },
  });

  return account.id;
}

/**
 * Generate an account onboarding link for a Stripe Connect Express account.
 */
export async function createAccountLink(
  stripeAccountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripeClient();

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Retrieve the status of a Stripe Connect account.
 */
export async function getAccountStatus(stripeAccountId: string): Promise<{
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    detailsSubmitted: account.details_submitted,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
  };
}

/**
 * Create a monthly destination charge subscription for the Knowledge Transition Retainer.
 * 75% goes to the contributor via transfer_data; 25% is the platform fee (application_fee_percent).
 */
export async function createRetainerSubscription(params: {
  challengerCustomerId: string;
  retainerAmountPence: number;
  contributorAccountId: string;
  challengeId: string;
  contributorId: string;
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  const price = await stripe.prices.create({
    unit_amount: params.retainerAmountPence,
    currency: 'gbp',
    recurring: { interval: 'month' },
    product_data: { name: 'Knowledge Transition Retainer - Challenge ' + params.challengeId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: params.challengerCustomerId,
    items: [{ price: price.id }],
    application_fee_percent: 25,
    transfer_data: { destination: params.contributorAccountId },
    metadata: {
      challengeId: params.challengeId,
      contributorId: params.contributorId,
      paymentType: 'retainer',
    },
  });

  return subscription;
}

/**
 * Create an SME subscription (monthly or annual) with 75/25 destination charge split.
 */
export async function createSmeSubscription(params: {
  challengerCustomerId: string;
  amountPence: number;
  contributorAccountId: string;
  challengeId: string;
  contributorId: string;
  interval: 'month' | 'year';
}): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  const price = await stripe.prices.create({
    unit_amount: params.amountPence,
    currency: 'gbp',
    recurring: { interval: params.interval },
    product_data: { name: 'SME Subscription - Challenge ' + params.challengeId },
  });

  const subscription = await stripe.subscriptions.create({
    customer: params.challengerCustomerId,
    items: [{ price: price.id }],
    application_fee_percent: 25,
    transfer_data: { destination: params.contributorAccountId },
    metadata: {
      challengeId: params.challengeId,
      contributorId: params.contributorId,
      paymentType: 'sme_subscription',
    },
  });

  return subscription;
}

/**
 * Charge a stipend immediately using the separate charges + transfers pattern.
 * Returns the PaymentIntent ID and the Charge ID (ch_...) needed for the deferred Transfer.
 *
 * Note: No capture_method=manual — immediate capture avoids 7-day auth expiry.
 * The transfer_group links this charge to future Transfer calls.
 */
export async function chargeStipend(params: {
  totalAmountPence: number;
  challengerCustomerId: string;
  paymentMethodId: string;
  circleId: string;
  challengeId: string;
}): Promise<{ paymentIntentId: string; chargeId: string }> {
  const stripe = getStripeClient();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.totalAmountPence,
    currency: 'gbp',
    customer: params.challengerCustomerId,
    payment_method: params.paymentMethodId,
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    transfer_group: params.circleId,
    metadata: {
      circleId: params.circleId,
      challengeId: params.challengeId,
      paymentType: 'stipend',
    },
  });

  // latest_charge is the ch_... Charge ID required for source_transaction in Transfer
  const chargeId = paymentIntent.latest_charge as string;

  return { paymentIntentId: paymentIntent.id, chargeId };
}

/**
 * Release a stipend Transfer to a contributor's Connect account.
 * Must be called after circle resolution is approved.
 *
 * source_transaction MUST be the Charge ID (ch_...) from the original stipend charge,
 * NOT the PaymentIntent ID (pi_...). This is stored in paymentTransactions.stripeChargeId.
 */
export async function releaseStipendTransfer(params: {
  amountPence: number;
  contributorAccountId: string;
  circleId: string;
  sourceChargeId: string;
}): Promise<Stripe.Transfer> {
  const stripe = getStripeClient();

  const transfer = await stripe.transfers.create({
    amount: params.amountPence,
    currency: 'gbp',
    destination: params.contributorAccountId,
    transfer_group: params.circleId,
    source_transaction: params.sourceChargeId,
    metadata: { circleId: params.circleId },
  });

  return transfer;
}

/**
 * Construct and verify a Stripe webhook event from raw request body and signature header.
 * Throws if the signature is invalid — caller should return 400.
 */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, getEnv().STRIPE_WEBHOOK_SECRET);
}
