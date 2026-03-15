import { z } from "zod";

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const notificationPreferencesSchema = z.object({
  notifyCircleActivity: z.enum(["immediate", "daily_digest", "off"]),
});

export type PushSubscriptionSchemaInput = z.infer<typeof pushSubscriptionSchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
