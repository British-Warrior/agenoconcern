import { z } from "zod";

export const registerChallengerSchema = z.object({
  contactName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organisationName: z.string().min(2, "Organisation name required"),
  organisationType: z.string().min(1, "Organisation type required").max(100),
});

export const submitChallengerChallengeSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  brief: z.string().min(20, "Brief must be at least 20 characters"),
  domain: z.array(z.string()).min(1, "At least one domain required"),
  skillsNeeded: z.array(z.string()).min(1, "At least one skill required"),
  type: z.enum(["community", "premium", "knowledge_transition"]),
  deadline: z.string().datetime().optional(),
  circleSize: z.number().int().min(3).max(7).optional(),
});

export type RegisterChallengerInput = z.infer<typeof registerChallengerSchema>;
export type SubmitChallengerChallengeInput = z.infer<typeof submitChallengerChallengeSchema>;
