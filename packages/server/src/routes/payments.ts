import type { Request, Response } from "express";
import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  paymentTransactions,
  contributorHours,
  contributorProfiles,
  circleMembers,
} from "../db/schema.js";
import { authMiddleware, requireRole } from "../middleware/auth.js";
import {
  createRetainerSubscription,
  createSmeSubscription,
  chargeStipend,
  releaseStipendTransfer,
  constructWebhookEvent,
} from "../services/stripe.service.js";
import {
  createRetainerSchema,
  chargeStipendSchema,
  releaseStipendSchema,
  createSmeSubscriptionSchema,
  logHoursSchema,
} from "@agenoconcern/shared";

const router = Router();

// ─── POST /retainer — Create retainer subscription (CM only) ─────────────────
router.post("/retainer", authMiddleware, requireRole("community_manager"), async (req, res) => {
  const result = createRetainerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { challengeId, contributorId, amountPence, challengerCustomerId } = result.data;
  const db = getDb();

  const [profile] = await db
    .select({ stripeAccountId: contributorProfiles.stripeAccountId })
    .from(contributorProfiles)
    .where(eq(contributorProfiles.contributorId, contributorId))
    .limit(1);

  if (!profile?.stripeAccountId) {
    res.status(400).json({ error: "Contributor has no Stripe Connect account" });
    return;
  }

  const subscription = await createRetainerSubscription({
    challengerCustomerId,
    retainerAmountPence: amountPence,
    contributorAccountId: profile.stripeAccountId,
    challengeId,
    contributorId,
  });

  await db.insert(paymentTransactions).values({
    contributorId,
    challengeId,
    paymentType: "retainer",
    status: "held",
    amountPence: Math.floor(amountPence * 0.75),
    totalAmountPence: amountPence,
    stripeSubscriptionId: subscription.id,
  });

  res.status(201).json({ subscriptionId: subscription.id });
});

// ─── POST /stipend — Charge a stipend (CM only) ───────────────────────────────
router.post("/stipend", authMiddleware, requireRole("community_manager"), async (req, res) => {
  const result = chargeStipendSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { circleId, challengeId, amountPence, challengerCustomerId, paymentMethodId } = result.data;
  const db = getDb();

  // We need a contributorId for the transaction — get it from the body or resolve it.
  // The chargeStipend service doesn't take contributorId; the transaction needs one.
  // For stipends, contributorId is passed in body alongside circleId.
  const { contributorId } = req.body as { contributorId?: string };
  if (!contributorId) {
    res.status(400).json({ error: "contributorId is required" });
    return;
  }

  const stipendResult = await chargeStipend({
    totalAmountPence: amountPence,
    challengerCustomerId,
    paymentMethodId,
    circleId,
    challengeId,
  });

  // stripeChargeId MUST be stored here — it is required for the release transfer
  await db.insert(paymentTransactions).values({
    contributorId,
    challengeId,
    circleId,
    paymentType: "stipend",
    status: "held",
    amountPence: Math.floor(amountPence * 0.75),
    totalAmountPence: amountPence,
    stripePaymentIntentId: stipendResult.paymentIntentId,
    stripeChargeId: stipendResult.chargeId,
  });

  res.status(201).json({ paymentIntentId: stipendResult.paymentIntentId });
});

// ─── POST /stipend/release — Release held stipend to contributor (CM only) ───
router.post(
  "/stipend/release",
  authMiddleware,
  requireRole("community_manager"),
  async (req, res) => {
    const result = releaseStipendSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    const { circleId } = result.data;
    const db = getDb();

    const [txn] = await db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.circleId, circleId),
          eq(paymentTransactions.paymentType, "stipend"),
          eq(paymentTransactions.status, "held"),
        ),
      )
      .limit(1);

    if (!txn) {
      res.status(404).json({ error: "No held stipend for this circle" });
      return;
    }

    const [profile] = await db
      .select({ stripeAccountId: contributorProfiles.stripeAccountId })
      .from(contributorProfiles)
      .where(eq(contributorProfiles.contributorId, txn.contributorId))
      .limit(1);

    if (!profile?.stripeAccountId) {
      res.status(400).json({ error: "Contributor has no Stripe Connect account" });
      return;
    }

    if (!txn.stripeChargeId) {
      res.status(400).json({ error: "No charge ID on record for this stipend" });
      return;
    }

    const transfer = await releaseStipendTransfer({
      amountPence: txn.amountPence,
      contributorAccountId: profile.stripeAccountId,
      circleId,
      sourceChargeId: txn.stripeChargeId,
    });

    await db
      .update(paymentTransactions)
      .set({
        status: "transferred",
        stripeTransferId: transfer.id,
        transferredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, txn.id));

    res.json({ transferId: transfer.id });
  },
);

// ─── POST /sme-subscription — Create SME subscription (CM only) ──────────────
router.post(
  "/sme-subscription",
  authMiddleware,
  requireRole("community_manager"),
  async (req, res) => {
    const result = createSmeSubscriptionSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error.flatten() });
      return;
    }

    const { challengeId, contributorId, amountPence, challengerCustomerId, interval } = result.data;
    const db = getDb();

    const [profile] = await db
      .select({ stripeAccountId: contributorProfiles.stripeAccountId })
      .from(contributorProfiles)
      .where(eq(contributorProfiles.contributorId, contributorId))
      .limit(1);

    if (!profile?.stripeAccountId) {
      res.status(400).json({ error: "Contributor has no Stripe Connect account" });
      return;
    }

    const subscription = await createSmeSubscription({
      challengerCustomerId,
      amountPence,
      contributorAccountId: profile.stripeAccountId,
      challengeId,
      contributorId,
      interval,
    });

    await db.insert(paymentTransactions).values({
      contributorId,
      challengeId,
      paymentType: "sme_subscription",
      status: "held",
      amountPence: Math.floor(amountPence * 0.75),
      totalAmountPence: amountPence,
      stripeSubscriptionId: subscription.id,
    });

    res.status(201).json({ subscriptionId: subscription.id });
  },
);

// ─── POST /hours — Log hours for a circle (authenticated contributor) ─────────
router.post("/hours", authMiddleware, async (req, res) => {
  const result = logHoursSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.flatten() });
    return;
  }

  const { circleId, hoursLogged, description, isPaid } = result.data;
  const contributorId = req.contributor!.id;
  const db = getDb();

  // Verify caller is a member of the specified circle
  const [membership] = await db
    .select({ id: circleMembers.id })
    .from(circleMembers)
    .where(
      and(
        eq(circleMembers.circleId, circleId),
        eq(circleMembers.contributorId, contributorId),
      ),
    )
    .limit(1);

  if (!membership) {
    res.status(403).json({ error: "Not a member of this circle" });
    return;
  }

  const [inserted] = await db
    .insert(contributorHours)
    .values({
      contributorId,
      circleId,
      hoursLogged,
      description,
      isPaid: isPaid ?? false,
    })
    .returning();

  res.status(201).json(inserted);
});

// ─── GET /my-transactions — List contributor's transactions (authenticated) ───
router.get("/my-transactions", authMiddleware, async (req, res) => {
  const contributorId = req.contributor!.id;
  const db = getDb();

  const transactions = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.contributorId, contributorId))
    .orderBy(desc(paymentTransactions.createdAt));

  res.json(transactions);
});

// ─── Webhook handler (exported separately — registered on app with express.raw) ─
export async function webhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const sig = req.headers["stripe-signature"] as string;

    let event;
    try {
      event = constructWebhookEvent(req.body as Buffer, sig);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      res.status(400).json({ error: message });
      return;
    }

    const db = getDb();

    // Idempotency guard: skip if we've already processed this event
    const [existing] = await db
      .select({ id: paymentTransactions.id })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.stripeEventId, event.id))
      .limit(1);

    if (existing) {
      res.json({ received: true });
      return;
    }

    switch (event.type) {
      case "invoice.paid": {
        const invoice = event.data.object as {
          subscription?: string;
          amount_paid: number;
          subscription_details?: { metadata?: Record<string, string> };
          metadata?: Record<string, string>;
        };

        const metadata =
          invoice.subscription_details?.metadata ?? invoice.metadata ?? {};
        const challengeId = metadata["challengeId"] ?? null;
        const contributorId = metadata["contributorId"] ?? null;
        const paymentType = (metadata["paymentType"] ?? "retainer") as
          | "retainer"
          | "stipend"
          | "sme_subscription";

        if (contributorId) {
          await db.insert(paymentTransactions).values({
            contributorId,
            challengeId: challengeId ?? undefined,
            paymentType,
            status: "transferred",
            amountPence: Math.floor(invoice.amount_paid * 0.75),
            totalAmountPence: invoice.amount_paid,
            stripeSubscriptionId: invoice.subscription ?? undefined,
            stripeEventId: event.id,
            transferredAt: new Date(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        console.error("Stripe invoice.payment_failed event:", event.id);
        const failedInvoice = event.data.object as {
          subscription?: string;
        };
        if (failedInvoice.subscription) {
          await db
            .update(paymentTransactions)
            .set({ status: "failed", updatedAt: new Date() })
            .where(
              eq(paymentTransactions.stripeSubscriptionId, failedInvoice.subscription),
            );
        }
        break;
      }

      case "customer.subscription.deleted": {
        console.log("Stripe customer.subscription.deleted event:", event.id);
        // No further action for MVP
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err: unknown) {
    console.error("Unexpected webhook error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export { router as paymentRoutes };
