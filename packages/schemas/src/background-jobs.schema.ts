import { z } from 'zod';

const recordMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Record month must use YYYY-MM.');
const nonNegativeNumberSchema = z.coerce.number().finite().nonnegative();

export const EmailQueuePayloadSchema = z
  .object({
    to: z.string().trim().email(),
    subject: z.string().trim().min(1).max(255),
    text: z.string().trim().min(1).optional(),
    html: z.string().trim().min(1).optional(),
    replyTo: z.string().trim().email().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((payload) => Boolean(payload.text || payload.html), {
    message: 'Email jobs require either text or html content.',
    path: ['text'],
  });
export type EmailQueuePayload = z.infer<typeof EmailQueuePayloadSchema>;

export const NapImportRowSchema = z.object({
  agentId: z.string().uuid(),
  recordMonth: recordMonthSchema,
  modalPremium: nonNegativeNumberSchema,
  api: nonNegativeNumberSchema,
  sumAssured: nonNegativeNumberSchema,
  commissionAmount: nonNegativeNumberSchema,
});
export type NapImportRow = z.infer<typeof NapImportRowSchema>;

export const NapImportJobPayloadSchema = z.object({
  importBatchId: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  initiatedByUserId: z.string().uuid(),
  rows: z.array(NapImportRowSchema).min(1),
});
export type NapImportJobPayload = z.infer<typeof NapImportJobPayloadSchema>;

export const PerImportRowSchema = z.object({
  agentId: z.string().uuid(),
  recordMonth: recordMonthSchema,
  modalPremium: nonNegativeNumberSchema,
  api: nonNegativeNumberSchema,
  sumAssured: nonNegativeNumberSchema,
  commissionAmount: nonNegativeNumberSchema,
});
export type PerImportRow = z.infer<typeof PerImportRowSchema>;

export const PerImportJobPayloadSchema = z.object({
  importBatchId: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  initiatedByUserId: z.string().uuid(),
  rows: z.array(PerImportRowSchema).min(1),
});
export type PerImportJobPayload = z.infer<typeof PerImportJobPayloadSchema>;

export const ApeImportRowSchema = z.object({
  agentId: z.string().uuid(),
  recordMonth: recordMonthSchema,
  modalPremium: nonNegativeNumberSchema,
  api: nonNegativeNumberSchema,
  sumAssured: nonNegativeNumberSchema,
  commissionAmount: nonNegativeNumberSchema,
});
export type ApeImportRow = z.infer<typeof ApeImportRowSchema>;

export const ApeImportJobPayloadSchema = z.object({
  importBatchId: z.string().trim().min(1),
  fileName: z.string().trim().min(1),
  initiatedByUserId: z.string().uuid(),
  rows: z.array(ApeImportRowSchema).min(1),
});
export type ApeImportJobPayload = z.infer<typeof ApeImportJobPayloadSchema>;
