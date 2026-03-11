import { z } from "zod";

// Schema for updating profile fields (all optional)
export const updateProfileSchema = z.object({
  rolesAndTitles: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  qualifications: z.array(z.string()).optional(),
  sectors: z.array(z.string()).optional(),
  yearsOfExperience: z.number().int().min(0).max(60).optional(),
  professionalSummary: z.string().max(2000).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// Schema for contributor preferences
export const preferencesSchema = z.object({
  availability: z.enum(["full_time", "part_time", "occasional", "project_only"]),
  maxCircles: z.number().int().min(1).max(10),
  domainPreferences: z.array(z.string()),
  domainOther: z.string().optional(),
  willingToMentor: z.boolean(),
  commChannel: z.enum(["email", "phone"]),
  commFrequency: z.enum(["immediate", "daily", "weekly"]),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
