import { z } from 'zod';

export const ClientAssignmentHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  clientProfileId: z.string().uuid(),
  fromAgentId: z.string().uuid().nullable(),
  toAgentId: z.string().uuid().nullable(),
  fromAgentName: z.string().nullable(),
  toAgentName: z.string().nullable(),
  branchCode: z.string().min(1),
  reason: z.string().nullable(),
  createdAtUtc: z.string().datetime(),
});
export type ClientAssignmentHistoryEntry = z.infer<typeof ClientAssignmentHistoryEntrySchema>;

export const ClientAssignmentHistoryResponseSchema = z.object({
  data: z.array(ClientAssignmentHistoryEntrySchema),
});
export type ClientAssignmentHistoryResponse = z.infer<typeof ClientAssignmentHistoryResponseSchema>;
