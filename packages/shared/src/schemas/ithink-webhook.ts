import { z } from "zod";

export const ithinkWebhookPayloadSchema = z.object({
  deliveryId: z.string().uuid(),
  timestamp: z.number().int().positive(), // Unix epoch seconds
  contributorEmail: z.string().email(),
  institutionSlug: z.string().min(1),
  signalType: z.enum(["attention_flag"]),
  cohortSize: z.number().int().min(1).optional(),
  flaggedCount: z.number().int().min(0).optional(),
});

export type IThinkWebhookPayload = z.infer<typeof ithinkWebhookPayloadSchema>;
