import { z } from "zod";

export const wellbeingCheckinSchema = z.object({
  uclaItems: z
    .tuple([
      z.number().int().min(1).max(4),
      z.number().int().min(1).max(4),
      z.number().int().min(1).max(4),
    ])
    .describe("UCLA 3-item loneliness scale responses (1=never, 4=often)"),
  wemwbsItems: z
    .tuple([
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
      z.number().int().min(1).max(5),
    ])
    .describe("SWEMWBS 7-item wellbeing scale responses (1=none of the time, 5=all of the time)"),
  consentGranted: z
    .literal(true)
    .describe("Explicit GDPR consent for special category health data — must be true"),
});

export type WellbeingCheckinSchemaInput = z.infer<typeof wellbeingCheckinSchema>;
