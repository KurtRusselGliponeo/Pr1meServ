import { z } from 'zod';

export const documentCategorySchema = z.enum([
  'COSAF',
  'Lapsation & Reinstatement',
  'Recruitment',
  'Compliance & Policy',
  'Performance & Reports',
]);
export type DocumentCategory = z.infer<typeof documentCategorySchema>;

export const documentStorageProviderSchema = z.enum(['R2', 'Supabase', 'GoogleDrive']);
export type DocumentStorageProvider = z.infer<typeof documentStorageProviderSchema>;

export const documentLibraryItemSchema = z.object({
  id: z.string().uuid(),
  uploadedByUserId: z.string().uuid(),
  branchCode: z.string().nullable(),
  fileUrl: z.string().url().or(z.string().min(1)),
  fileName: z.string().min(1),
  originalFileName: z.string().min(1),
  category: documentCategorySchema,
  mimeType: z.string().min(1),
  fileExtension: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative(),
  description: z.string().nullable(),
  keywords: z.array(z.string()),
  version: z.string().min(1),
  versionGroup: z.string().min(1),
  isPinned: z.boolean(),
  isArchived: z.boolean(),
  archivedAtUtc: z.string().datetime().nullable(),
  storageProvider: documentStorageProviderSchema,
  createdAtUtc: z.string().datetime(),
});
export type DocumentLibraryItem = z.infer<typeof documentLibraryItemSchema>;

export const listDocumentsQuerySchema = z.object({
  category: documentCategorySchema.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  fileType: z.string().trim().min(1).max(20).optional(),
  includeArchived: z.coerce.boolean().default(false),
});
export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export const listDocumentsResponseSchema = z.object({
  data: z.array(documentLibraryItemSchema),
});
export type ListDocumentsResponse = z.infer<typeof listDocumentsResponseSchema>;

export const uploadDocumentRequestSchema = z.object({
  category: documentCategorySchema,
  branchCode: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(500).optional(),
  keywords: z.array(z.string().trim().min(1).max(50)).max(10).default([]),
});
export type UploadDocumentRequest = z.infer<typeof uploadDocumentRequestSchema>;

export const uploadDocumentResponseSchema = z.object({
  documentId: z.string().uuid(),
  webViewLink: z.string().url().nullable().optional(),
  storageProvider: documentStorageProviderSchema,
  version: z.string(),
});
export type UploadDocumentResponse = z.infer<typeof uploadDocumentResponseSchema>;

export const updateDocumentMetadataSchema = z.object({
  category: documentCategorySchema.optional(),
  description: z.string().trim().max(500).nullable().optional(),
  keywords: z.array(z.string().trim().min(1).max(50)).max(10).optional(),
  fileName: z.string().trim().min(1).max(255).optional(),
});
export type UpdateDocumentMetadata = z.infer<typeof updateDocumentMetadataSchema>;

export const archiveDocumentRequestSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});
export type ArchiveDocumentRequest = z.infer<typeof archiveDocumentRequestSchema>;

export const documentDownloadResponseSchema = z.object({
  downloadUrl: z.string().url().or(z.string().min(1)),
  expiresAtUtc: z.string().datetime().nullable(),
});
export type DocumentDownloadResponse = z.infer<typeof documentDownloadResponseSchema>;
