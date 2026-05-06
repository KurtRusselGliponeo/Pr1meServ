import { z } from 'zod';

export const LapsationRiskLevelSchema = z.enum(['Warning', 'Urgent', 'Lapsed']);
export type LapsationRiskLevel = z.infer<typeof LapsationRiskLevelSchema>;

export const FollowUpStatusSchema = z.enum(['Open', 'In Progress', 'Resolved', 'Dismissed']);
export type FollowUpStatus = z.infer<typeof FollowUpStatusSchema>;

export const LapsationRecordSummarySchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  policyNumber: z.string(),
  policyOwnerName: z.string().nullable(),
  lifeInsuredName: z.string().nullable(),
  clientName: z.string(),
  status: z.enum(['Active', 'At Risk', 'Lapsed', 'Reinstated', 'Cancelled', 'Matured', 'Pending']),
  branchCode: z.string(),
  assignedAgentId: z.string().uuid().nullable(),
  assignedAgentName: z.string(),
  modalPremium: z.string(),
  isAtRisk: z.boolean(),
  riskLevel: LapsationRiskLevelSchema.nullable(),
  followUpStatus: FollowUpStatusSchema,
  statusChangedAtUtc: z.string().datetime(),
  lapseDateUtc: z.string().datetime().nullable(),
  reinstatedAtUtc: z.string().datetime().nullable(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  createdAtUtc: z.string().datetime(),
  daysSinceLapse: z.number().int().nonnegative().nullable(),
});
export type LapsationRecordSummary = z.infer<typeof LapsationRecordSummarySchema>;

export const LapsationTimelineEventSchema = z.object({
  id: z.string().uuid(),
  policyId: z.string().uuid(),
  policyNumber: z.string(),
  eventType: z.enum(['AT_RISK', 'LAPSED', 'REINSTATED', 'CANCELLED', 'ACTIVE']),
  effectiveAtUtc: z.string().datetime(),
  createdAtUtc: z.string().datetime(),
  reason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type LapsationTimelineEvent = z.infer<typeof LapsationTimelineEventSchema>;

export const ListLapsationAlertsQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  branchCode: z.string().trim().min(1).max(50).optional(),
  agentId: z.string().uuid().optional(),
  status: z.enum(['At Risk', 'Lapsed', 'Reinstated', 'Cancelled', 'Active', 'Pending']).optional(),
  followUpStatus: FollowUpStatusSchema.optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
export type ListLapsationAlertsQuery = z.infer<typeof ListLapsationAlertsQuerySchema>;

export const LapsationDashboardResponseSchema = z.object({
  generatedAtUtc: z.string().datetime(),
  thresholdDays: z.number().int().positive(),
  scope: z.object({
    role: z.enum(['Admin', 'BranchManager', 'Agent']),
    branchCode: z.string().nullable(),
    agentId: z.string().uuid().nullable(),
  }),
  summary: z.object({
    totalTracked: z.number().int().nonnegative(),
    atRiskCount: z.number().int().nonnegative(),
    reinstatedYtd: z.number().int().nonnegative(),
    criticalCount: z.number().int().nonnegative(),
    lapsedCount: z.number().int().nonnegative(),
  }),
  records: z.array(LapsationRecordSummarySchema),
  timeline: z.array(LapsationTimelineEventSchema),
});
export type LapsationDashboardResponse = z.infer<typeof LapsationDashboardResponseSchema>;

export const UpdatePolicyStatusInputSchema = z.object({
  status: z.enum(['Active', 'At Risk', 'Lapsed', 'Reinstated', 'Cancelled', 'Matured', 'Pending']),
  effectiveAtUtc: z.string().datetime().optional(),
  reason: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(2000).nullable().optional(),
  followUpStatus: FollowUpStatusSchema.default('Open'),
});
export type UpdatePolicyStatusInput = z.infer<typeof UpdatePolicyStatusInputSchema>;

export const ReinstateLapsationRecordResponseSchema = z.object({
  success: z.boolean(),
  reinstatedAtUtc: z.string().datetime(),
});
export type ReinstateLapsationRecordResponse = z.infer<typeof ReinstateLapsationRecordResponseSchema>;
