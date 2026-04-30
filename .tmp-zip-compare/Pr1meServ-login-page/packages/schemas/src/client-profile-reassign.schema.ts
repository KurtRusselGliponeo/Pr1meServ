import { z } from 'zod';

export const ClientProfileReassignSchema = z.object({
  sourceAgentId: z.string().uuid().nullable(),
  destinationAgentId: z.string().uuid().nullable(),
  clientProfileIds: z.array(z.string().uuid()).min(1),
});
export type ClientProfileReassign = z.infer<typeof ClientProfileReassignSchema>;

export const ClientProfileReassignResponseSchema = z.object({
  reassignedCount: z.number().int().positive(),
});
export type ClientProfileReassignResponse = z.infer<typeof ClientProfileReassignResponseSchema>;

export const ClientProfileReassignIssueSchema = z.object({
  code: z.enum([
    'SOURCE_AGENT_NOT_FOUND',
    'DESTINATION_AGENT_NOT_FOUND',
    'DESTINATION_MATCHES_SOURCE',
    'CLIENT_PROFILE_NOT_FOUND',
    'CLIENT_OWNERSHIP_MISMATCH',
    'CLIENT_ALREADY_ASSIGNED_TO_DESTINATION',
    'CLIENT_STATUS_NOT_ELIGIBLE',
  ]),
  message: z.string().min(1),
  clientProfileId: z.string().uuid().optional(),
});
export type ClientProfileReassignIssue = z.infer<typeof ClientProfileReassignIssueSchema>;

export const ClientProfileReassignPreflightResponseSchema = z.object({
  ok: z.boolean(),
  sourceAgentId: z.string().uuid().nullable(),
  destinationAgentId: z.string().uuid().nullable(),
  totalRequested: z.number().int().nonnegative(),
  validClientProfileIds: z.array(z.string().uuid()),
  issues: z.array(ClientProfileReassignIssueSchema),
});
export type ClientProfileReassignPreflightResponse = z.infer<
  typeof ClientProfileReassignPreflightResponseSchema
>;
