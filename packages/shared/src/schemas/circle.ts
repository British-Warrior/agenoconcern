import { z } from "zod";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB

export const attachmentSchema = z.object({
  s3Key: z.string().min(1),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  fileSizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
});

export type AttachmentInput = z.infer<typeof attachmentSchema>;

export const attachmentUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  fileSizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_SIZE),
});

export type AttachmentUrlInput = z.infer<typeof attachmentUrlSchema>;

export const createCircleSchema = z.object({
  challengeId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;

export const postNoteSchema = z.object({
  body: z.string().min(1).max(5000),
  attachments: z.array(attachmentSchema).max(5).default([]),
});

export type PostNoteInput = z.infer<typeof postNoteSchema>;

export const submitResolutionSchema = z.object({
  problemSummary: z.string().min(10).max(5000),
  recommendations: z.string().min(10).max(10000),
  evidence: z.string().min(10).max(10000),
  dissentingViews: z.string().max(5000).optional(),
  implementationNotes: z.string().max(5000).optional(),
});

export type SubmitResolutionInput = z.infer<typeof submitResolutionSchema>;

export const rateResolutionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(5000).optional(),
});

export type RateResolutionInput = z.infer<typeof rateResolutionSchema>;

export const setSocialChannelSchema = z.object({
  channel: z.enum(["whatsapp", "slack", "discord", "teams", "signal"] as const),
  url: z.string().url().max(2000),
});

export type SetSocialChannelInput = z.infer<typeof setSocialChannelSchema>;
