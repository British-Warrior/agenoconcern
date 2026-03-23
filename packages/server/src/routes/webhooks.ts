import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db/index.js";
import {
  contributors,
  institutions,
  contributorInstitutions,
  webhookDeliveries,
  ithinkAttentionFlags,
} from "../db/schema.js";
import { getEnv } from "../config/env.js";
import { ithinkWebhookPayloadSchema } from "@indomitable-unity/shared";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verify HMAC-SHA256 signature.
 * iThink signs over: timestamp + "." + rawBody (UTF-8 string)
 */
function verifySignature(
  timestamp: string,
  rawBody: Buffer,
  incomingSig: string,
  secret: string,
): boolean {
  const message = timestamp + "." + rawBody.toString("utf8");
  const expected = createHmac("sha256", secret).update(message).digest("hex");

  const incomingBuf = Buffer.from(incomingSig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");

  // Prevent timingSafeEqual from throwing on length mismatch
  if (incomingBuf.length !== expectedBuf.length) return false;

  return timingSafeEqual(incomingBuf, expectedBuf);
}

/**
 * Try primary secret first, then fall back to prev secret for zero-downtime rotation.
 */
function verifyWithDualSecret(timestamp: string, rawBody: Buffer, sig: string): boolean {
  const env = getEnv();

  if (verifySignature(timestamp, rawBody, sig, env.ITHINK_WEBHOOK_SECRET)) return true;

  if (env.ITHINK_WEBHOOK_SECRET_PREV) {
    if (verifySignature(timestamp, rawBody, sig, env.ITHINK_WEBHOOK_SECRET_PREV)) return true;
  }

  return false;
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function ithinkWebhookHandler(req: Request, res: Response): Promise<void> {
  // 1. Extract signature header
  const sig = req.headers["x-ithink-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(401).json({ error: "Missing signature" });
    return;
  }

  // 2. Extract timestamp header
  const timestamp = req.headers["x-ithink-timestamp"];
  if (!timestamp || typeof timestamp !== "string") {
    res.status(401).json({ error: "Missing timestamp" });
    return;
  }

  // 3. Verify HMAC signature (dual-secret rotation supported)
  if (!verifyWithDualSecret(timestamp, req.body as Buffer, sig)) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // 4. Parse raw body as JSON
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse((req.body as Buffer).toString("utf8"));
  } catch {
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  // 5. Timestamp window check — reject requests older than 5 minutes
  const nowSeconds = Math.floor(Date.now() / 1000);
  const requestSeconds = parseInt(timestamp, 10);
  if (Math.abs(nowSeconds - requestSeconds) > 300) {
    res.status(401).json({ error: "Request timestamp outside acceptable window" });
    return;
  }

  // 6. Zod schema validation
  const validation = ithinkWebhookPayloadSchema.safeParse(parsedBody);
  if (!validation.success) {
    res.status(400).json({ error: validation.error.flatten() });
    return;
  }

  const payload = validation.data;
  const db = getDb();

  // 7. Idempotency — return early if delivery already processed
  const [existingDelivery] = await db
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.deliveryId, payload.deliveryId))
    .limit(1);

  if (existingDelivery) {
    res.status(200).json({ received: true });
    return;
  }

  // 8. Resolve contributor by email
  const [contributor] = await db
    .select({ id: contributors.id })
    .from(contributors)
    .where(eq(contributors.email, payload.contributorEmail))
    .limit(1);

  if (!contributor) {
    res.status(422).json({ error: "Unknown contributor or institution" });
    return;
  }

  // 9. Resolve institution by slug
  const [institution] = await db
    .select({ id: institutions.id })
    .from(institutions)
    .where(eq(institutions.slug, payload.institutionSlug))
    .limit(1);

  if (!institution) {
    res.status(422).json({ error: "Unknown contributor or institution" });
    return;
  }

  // 10. Check contributor is assigned to this institution
  const [assignment] = await db
    .select({ id: contributorInstitutions.id })
    .from(contributorInstitutions)
    .where(
      and(
        eq(contributorInstitutions.contributorId, contributor.id),
        eq(contributorInstitutions.institutionId, institution.id),
      ),
    )
    .limit(1);

  if (!assignment) {
    res.status(403).json({ error: "Contributor not assigned to this institution" });
    return;
  }

  // 11. INSERT attention flag
  await db.insert(ithinkAttentionFlags).values({
    contributorId: contributor.id,
    institutionId: institution.id,
    deliveryId: payload.deliveryId,
    signalType: payload.signalType,
    cohortSize: payload.cohortSize ?? null,
    flaggedCount: payload.flaggedCount ?? null,
  });

  // 12. INSERT delivery record (idempotency log)
  await db.insert(webhookDeliveries).values({
    deliveryId: payload.deliveryId,
    source: "ithink",
  });

  // 13. Return success
  res.status(200).json({ received: true });
}
