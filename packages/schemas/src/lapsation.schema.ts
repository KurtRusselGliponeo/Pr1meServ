import { z } from 'zod';

export const LapsationRiskLevelSchema = z.enum(['Warning', 'Urgent', 'Lapsed']);
export type LapsationRiskLevel = z.infer<typeof LapsationRiskLevelSchema>;

export const LapsationRecordSummarySchema = z.object({
  id: z.string().uuid(),
  policyNumberId: z.string().uuid(),
  policyNumber: z.string(),
  clientName: z.string(),
  branchCode: z.string(),
  assignedAgentId: z.string().uuid().nullable(),
  assignedAgentName: z.string(),
  modalPremium: z.string(),
  isAtRisk: z.boolean(),
  riskLevel: LapsationRiskLevelSchema,
  lapseDateUtc: z.string().datetime(),
  reinstatedAtUtc: z.string().datetime().nullable(),
  createdAtUtc: z.string().datetime(),
  daysSinceLapse: z.number().int().nonnegative(),
});
export type LapsationRecordSummary = z.infer<typeof LapsationRecordSummarySchema>;

export const LapsationTimelineEventSchema = z.object({
  id: z.string().uuid(),
  policyNumberId: z.string().uuid(),
  policyNumber: z.string(),
  eventType: z.enum(['AT_RISK', 'LAPSED', 'REINSTATED']),
  effectiveAtUtc: z.string().datetime(),
  createdAtUtc: z.string().datetime(),
});
export type LapsationTimelineEvent = z.infer<typeof LapsationTimelineEventSchema>;

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

export const ReinstateLapsationRecordResponseSchema = z.object({
  success: z.boolean(),
  reinstatedAtUtc: z.string().datetime(),
});
export type ReinstateLapsationRecordResponse = z.infer<typeof ReinstateLapsationRecordResponseSchema>;
