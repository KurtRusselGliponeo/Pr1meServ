import { z } from 'zod';

export const ClientProfileReassignSchema = z.object({
  sourceAgentId: z.string().uuid(),
  destinationAgentId: z.string().uuid().nullable(),
  clientProfileIds: z.array(z.string().uuid()).min(1),
});
export type ClientProfileReassign = z.infer<typeof ClientProfileReassignSchema>;

export const ClientProfileReassignResponseSchema = z.object({
  reassignedCount: z.number().int().positive(),
});
export type ClientProfileReassignResponse = z.infer<typeof ClientProfileReassignResponseSchema>;
