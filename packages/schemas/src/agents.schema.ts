import { z } from 'zod';

import { userRoleSchema } from './auth.schema';

export const agentStatusSchema = z.enum(['Active', 'Terminated']);
export type AgentStatus = z.infer<typeof agentStatusSchema>;

export const AgentAuditTrailEntrySchema = z.object({
  id: z.string().min(1),
  action: z.string().min(1),
  actorName: z.string().min(1),
  timestampUtc: z.string().datetime(),
  summary: z.string().min(1),
});
export type AgentAuditTrailEntry = z.infer<typeof AgentAuditTrailEntrySchema>;

export const AgentProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  displayName: z.string().min(1),
  agentCode: z.string().min(1),
  branchCode: z.string().min(1),
  profileImageUrl: z.string().url().nullable(),
  status: agentStatusSchema,
  role: userRoleSchema,
  createdAtUtc: z.string().datetime(),
  updatedAtUtc: z.string().datetime(),
  auditTrail: z.array(AgentAuditTrailEntrySchema),
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

export const UpdateAgentProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Display name is required.'),
  firstName: z.string().trim().min(2, 'First name is required.'),
  lastName: z.string().trim().min(2, 'Last name is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  branchCode: z.string().trim().min(2, 'Branch code is required.').max(50).optional(),
});
export type UpdateAgentProfile = z.infer<typeof UpdateAgentProfileSchema>;

export const ListAgentsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});
export type ListAgentsQuery = z.infer<typeof ListAgentsQuerySchema>;

export const AgentLookupItemSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1),
  agentCode: z.string().min(1),
  email: z.string().email(),
  status: agentStatusSchema,
});
export type AgentLookupItem = z.infer<typeof AgentLookupItemSchema>;

export const AgentLookupResponseSchema = z.object({
  data: z.array(AgentLookupItemSchema),
});
export type AgentLookupResponse = z.infer<typeof AgentLookupResponseSchema>;

export const DelistAgentRequestSchema = z.object({
  targetAgentCode: z.string().trim().min(1, 'Agent code is required.'),
});
export type DelistAgentRequest = z.infer<typeof DelistAgentRequestSchema>;

export const DelistAgentResponseSchema = z.object({
  targetAgentCode: z.string().min(1),
  agentStatus: agentStatusSchema,
  orphanedClientProfiles: z.number().int().nonnegative(),
  migratedNapRecords: z.number().int().nonnegative(),
  migratedApeRecords: z.number().int().nonnegative(),
});
export type DelistAgentResponse = z.infer<typeof DelistAgentResponseSchema>;
