import { z } from "zod";

export const createInstitutionSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  city: z.string().min(2).max(100),
});

export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;

export const updateInstitutionSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(2000).optional(),
  city: z.string().min(2).max(100).optional(),
  contactEmail: z.string().email().optional(),
});

export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;

export const updateScheduleSchema = z.object({
  reportDeliveryEnabled: z.boolean(),
  reportCadence: z.enum(["weekly", "monthly"]).nullable(),
});

export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

export const toggleActiveSchema = z.object({
  isActive: z.boolean(),
});

export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;

export const setContributorInstitutionsSchema = z.object({
  institutionIds: z.array(z.string().uuid()),
});

export type SetContributorInstitutionsInput = z.infer<typeof setContributorInstitutionsSchema>;
