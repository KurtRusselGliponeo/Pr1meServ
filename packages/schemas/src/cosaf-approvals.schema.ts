import { z } from 'zod';

export const CosafApprovalItemSchema = z.object({
  id: z.string().uuid(),
  clientProfileId: z.string().uuid(),
  policyNumber: z.string(),
  clientName: z.string(),
  assignedAgentName: z.string(),
  caseStatus: z.string(),
  status: z.string(),
  reason: z.string().nullable().optional(),
  createdAtUtc: z.string().datetime(),
});
export type CosafApprovalItem = z.infer<typeof CosafApprovalItemSchema>;

export const CosafApprovalListResponseSchema = z.object({
  data: z.array(CosafApprovalItemSchema),
});
export type CosafApprovalListResponse = z.infer<typeof CosafApprovalListResponseSchema>;

export const UploadSignedCosafCopySchema = z.object({
  approvalId: z.string().uuid(),
});
export type UploadSignedCosafCopy = z.infer<typeof UploadSignedCosafCopySchema>;
