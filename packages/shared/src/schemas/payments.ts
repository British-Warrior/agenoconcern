import { z } from 'zod';

export const createRetainerSchema = z.object({
  challengeId: z.string().uuid(),
  contributorId: z.string().uuid(),
  amountPence: z.number().int().positive(),
  challengerCustomerId: z.string().min(1),
});

export const chargeStipendSchema = z.object({
  circleId: z.string().uuid(),
  challengeId: z.string().uuid(),
  amountPence: z.number().int().positive(),
  challengerCustomerId: z.string().min(1),
  paymentMethodId: z.string().min(1),
});

export const createSmeSubscriptionSchema = z.object({
  challengeId: z.string().uuid(),
  contributorId: z.string().uuid(),
  amountPence: z.number().int().positive(),
  challengerCustomerId: z.string().min(1),
  interval: z.enum(['month', 'year']),
});

export const logHoursSchema = z.object({
  circleId: z.string().uuid(),
  hoursLogged: z.number().int().min(1).max(24),
  description: z.string().max(500).optional(),
  isPaid: z.boolean().optional(),
});

export const releaseStipendSchema = z.object({
  circleId: z.string().uuid(),
});

export type CreateRetainerInput = z.infer<typeof createRetainerSchema>;
export type ChargeStipendInput = z.infer<typeof chargeStipendSchema>;
export type CreateSmeSubscriptionInput = z.infer<typeof createSmeSubscriptionSchema>;
export type LogHoursInput = z.infer<typeof logHoursSchema>;
export type ReleaseStipendInput = z.infer<typeof releaseStipendSchema>;
