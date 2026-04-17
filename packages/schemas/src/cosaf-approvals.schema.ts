import { z } from 'zod';

export const CosafApprovalItemSchema = z.object({
  id: z.string().uuid(),
  clientProfileId: z.string().uuid(),
  policyNumber: z.string(),
  assignedAgentName: z.string(),
  status: z.string(),
  createdAtUtc: z.string().datetime(),
});
export type CosafApprovalItem = z.infer<typeof CosafApprovalItemSchema>;

export const CosafApprovalListResponseSchema = z.object({
  data: z.array(CosafApprovalItemSchema),
});
export type CosafApprovalListResponse = z.infer<typeof CosafApprovalListResponseSchema>;
