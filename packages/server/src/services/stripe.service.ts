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
