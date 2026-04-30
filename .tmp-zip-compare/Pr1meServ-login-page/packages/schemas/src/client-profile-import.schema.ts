import { z } from 'zod';

export const ClientProfileImportRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024)
    .optional(),
});
export type ClientProfileImportRequest = z.infer<typeof ClientProfileImportRequestSchema>;

export const ClientProfileImportResponseSchema = z.object({
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024),
  signedUrl: z.string().url(),
  expiresAtUtc: z.string().datetime(),
});
export type ClientProfileImportResponse = z.infer<typeof ClientProfileImportResponseSchema>;
