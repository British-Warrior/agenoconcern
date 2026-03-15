import webpush from "web-push";
import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { notifications, pushSubscriptions, contributors } from "../db/schema.js";
import { getEnv } from "../config/env.js";
import type { NotificationType } from "@indomitable-unity/shared";

// Initialise VAPID on module load — graceful degradation if keys not set
const env = getEnv();
if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
} else {
  console.warn("[notifications] VAPID keys not configured — push notifications disabled");
}

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}

export async function notify(contributorId: string, payload: NotifyPayload): Promise<void> {
  const db = getDb();
  const { type, title, body, url } = payload;

  // Always insert in-app notification record
  await db.insert(notifications).values({
    contributorId,
    type,
    title,
    body,
    url: url ?? null,
  });

  // Try push delivery
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.contributorId, contributorId));

  let anyPushSucceeded = false;

  if (subs.length > 0 && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, url: url ?? null }),
        );
        anyPushSucceeded = true;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          // Subscription expired — clean up
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          console.log(`[notifications] Removed expired push subscription ${sub.id}`);
        } else {
          console.error("[notifications] Push send error:", err);
        }
      }
    }
  }

  // Email fallback: if no push subscriptions or all pushes failed
  if (!anyPushSucceeded) {
    await sendEmailFallback(contributorId, title, body, url);
  }
}

export async function notifyBatch(contributorIds: string[], payload: NotifyPayload): Promise<void> {
  for (const id of contributorIds) {
    try {
      await notify(id, payload);
    } catch (err: unknown) {
      console.error(`[notifications] notifyBatch error for contributor ${id}:`, err);
    }
  }
}

async function sendEmailFallback(
  contributorId: string,
  title: string,
  body: string,
  url?: string,
): Promise<void> {
  const env = getEnv();
  if (!env.RESEND_API_KEY) {
    console.warn("[notifications] RESEND_API_KEY not configured — email fallback disabled");
    return;
  }

  const db = getDb();
  const [contributor] = await db
    .select({ email: contributors.email, name: contributors.name })
    .from(contributors)
    .where(eq(contributors.id, contributorId))
    .limit(1);

  if (!contributor?.email) {
    console.warn(`[notifications] No email for contributor ${contributorId} — skipping email fallback`);
    return;
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const htmlBody = url
      ? `<p>${body}</p><p><a href="${url}">View details</a></p>`
      : `<p>${body}</p>`;

    await resend.emails.send({
      from: "Indomitable Unity <noreply@indomitableunity.org>",
      to: contributor.email,
      subject: title,
      html: htmlBody,
    });
  } catch (err: unknown) {
    console.error("[notifications] Email fallback error:", err);
  }
}
