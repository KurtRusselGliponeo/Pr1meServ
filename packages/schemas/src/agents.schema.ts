import { z } from 'zod';

import { userRoleSchema } from './auth.schema';

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
});
export type UpdateAgentProfile = z.infer<typeof UpdateAgentProfileSchema>;
