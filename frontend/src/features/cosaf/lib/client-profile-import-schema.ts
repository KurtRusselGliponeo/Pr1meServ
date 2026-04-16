import { z } from 'zod';
import { ClientProfileImportRequestSchema } from '@a1prime/schemas';

const sharedImportSchema = ClientProfileImportRequestSchema;

export const clientProfileImportSchema = z.object({
  fileName: sharedImportSchema.shape.fileName,
  mimeType: sharedImportSchema.shape.mimeType,
  sizeBytes: sharedImportSchema.shape.sizeBytes,
});

export type ClientProfileImportFormValues = z.infer<typeof clientProfileImportSchema>;
