import { z } from "zod";
import { DOMAIN_TAXONOMY } from "../constants.js";

export const createChallengeSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  brief: z.string().min(10).max(500),
  domain: z.array(z.string().max(100)).min(1, "At least one domain is required"),
  skillsNeeded: z.array(z.string().max(100)).max(20).default([]),
  type: z.enum(["paid", "free"] as const),
  deadline: z.string().date().optional(),
  circleSize: z.number().int().min(1).default(4),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

// Update schema: all create fields optional, plus status for closing/archiving.
export const updateChallengeSchema = createChallengeSchema
  .partial()
  .extend({
    status: z.enum(["open", "closed", "archived"]).optional(),
  });

export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;

export const interestNoteSchema = z.object({
  note: z.string().max(500).optional(),
});

export type InterestNoteInput = z.infer<typeof interestNoteSchema>;
