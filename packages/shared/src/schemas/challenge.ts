import { z } from "zod";
import { DOMAIN_TAXONOMY } from "../constants.js";

export const createChallengeSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(5000),
  brief: z.string().min(10).max(500),
  domain: z.enum(DOMAIN_TAXONOMY),
  skillsNeeded: z.array(z.string().max(100)).max(20).default([]),
  type: z.enum(["paid", "free"] as const),
  deadline: z.string().date().optional(),
  circleSize: z.number().int().min(2).max(10).default(4),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;

export const updateChallengeSchema = createChallengeSchema.partial();

export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;

export const interestNoteSchema = z.object({
  note: z.string().max(500).optional(),
});

export type InterestNoteInput = z.infer<typeof interestNoteSchema>;
