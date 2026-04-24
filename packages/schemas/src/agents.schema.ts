import { z } from 'zod';

import { userRoleSchema } from './auth.schema';
import { PerformanceLeaderboardRowSchema } from './performance-metrics.schema';

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
  preservedImportedNapRecords: z.number().int().nonnegative(),
  preservedImportedApeRecords: z.number().int().nonnegative(),
});
export type DelistAgentResponse = z.infer<typeof DelistAgentResponseSchema>;

export const AgentDashboardSummarySchema = z.object({
  persistency: z.number().min(0).max(100),
  activePolicies: z.number().int().nonnegative(),
  totalApi: z.number().nonnegative(),
  totalApe: z.number().nonnegative(),
  policyCount: z.number().int().nonnegative(),
  recruitmentCount: z.number().int().nonnegative(),
  warningPolicies: z.number().int().nonnegative(),
  urgentPolicies: z.number().int().nonnegative(),
  lapsedPolicies: z.number().int().nonnegative(),
});
export type AgentDashboardSummary = z.infer<typeof AgentDashboardSummarySchema>;

export const AgentDashboardQuickActionSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
  href: z.string().min(1),
});
export type AgentDashboardQuickAction = z.infer<typeof AgentDashboardQuickActionSchema>;

export const AgentDashboardResponseSchema = z.object({
  generatedAtUtc: z.string().datetime(),
  agent: z.object({
    id: z.string().uuid(),
    displayName: z.string().min(1),
    agentCode: z.string().min(1),
    branchCode: z.string().min(1),
  }),
  summary: AgentDashboardSummarySchema,
  assignedClients: z.array(
    z.object({
      id: z.string().uuid(),
      clientName: z.string().min(1),
      policyNumber: z.string().min(1),
      status: z.string().min(1),
      productType: z.string().nullable(),
      planCode: z.string().nullable(),
      updatedAtUtc: z.string().datetime(),
    }),
  ),
  recentHistory: z.array(AgentAuditTrailEntrySchema),
  atRiskPolicies: z.array(
    z.object({
      id: z.string().uuid(),
      clientName: z.string().min(1),
      policyNumber: z.string().min(1),
      riskLevel: z.enum(['Warning', 'Urgent', 'Lapsed']),
      lapseDateUtc: z.string().datetime(),
      daysSinceLapse: z.number().int().nonnegative(),
    }),
  ),
  prospects: z.object({
    total: z.number().int().nonnegative(),
    contacted: z.number().int().nonnegative(),
    clientAgreed: z.number().int().nonnegative(),
    presentation: z.number().int().nonnegative(),
    approved: z.number().int().nonnegative(),
    closed: z.number().int().nonnegative(),
  }),
  quickActions: z.array(AgentDashboardQuickActionSchema),
});
export type AgentDashboardResponse = z.infer<typeof AgentDashboardResponseSchema>;

export const BranchManagerDashboardQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(9999).optional(),
  agentId: z.string().uuid().optional(),
  status: z.enum(['Uncontacted', 'Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Returned', 'Orphan']).optional(),
  product: z.string().trim().min(1).max(120).optional(),
  lapsationState: z.enum(['Warning', 'Urgent', 'Lapsed']).optional(),
});
export type BranchManagerDashboardQuery = z.infer<typeof BranchManagerDashboardQuerySchema>;

export const BranchManagerDashboardResponseSchema = z.object({
  generatedAtUtc: z.string().datetime(),
  branch: z.object({
    branchCode: z.string().min(1),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(9999),
  }),
  summary: z.object({
    orphanClientCount: z.number().int().nonnegative(),
    pendingCosafApprovals: z.number().int().nonnegative(),
    warningPolicies: z.number().int().nonnegative(),
    urgentPolicies: z.number().int().nonnegative(),
    lapsedPolicies: z.number().int().nonnegative(),
    activeAgents: z.number().int().nonnegative(),
    totalApi: z.number().nonnegative(),
    totalApe: z.number().nonnegative(),
  }),
  topPerformers: z.array(PerformanceLeaderboardRowSchema),
  bottomPerformers: z.array(PerformanceLeaderboardRowSchema),
  filteredClients: z.array(
    z.object({
      id: z.string().uuid(),
      clientName: z.string().min(1),
      policyNumber: z.string().min(1),
      assignedAgentId: z.string().uuid().nullable(),
      assignedAgentName: z.string().nullable(),
      status: z.string().min(1),
      productType: z.string().nullable(),
      lapsationState: z.enum(['Warning', 'Urgent', 'Lapsed']).nullable(),
      updatedAtUtc: z.string().datetime(),
    }),
  ),
});
export type BranchManagerDashboardResponse = z.infer<typeof BranchManagerDashboardResponseSchema>;
