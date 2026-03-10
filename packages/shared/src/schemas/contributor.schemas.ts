import { z } from "zod";
import { AUTH_PROVIDERS, CONTRIBUTOR_ROLES, CONTRIBUTOR_STATUSES, E164_REGEX } from "../constants.js";

export const contributorSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().nullable(),
  username: z.string().min(3).max(100).nullable(),
  phoneNumber: z.string().regex(E164_REGEX).nullable(),
  authProvider: z.enum(AUTH_PROVIDERS),
  role: z.enum(CONTRIBUTOR_ROLES),
  status: z.enum(CONTRIBUTOR_STATUSES),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().uuid().nullable(),
});

export type ContributorSchema = z.infer<typeof contributorSchema>;

export const updateContributorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).max(100).optional(),
  phoneNumber: z.string().regex(E164_REGEX).optional(),
});

export type UpdateContributorInput = z.infer<typeof updateContributorSchema>;
