import { z } from 'zod';

export const LapsationRiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export type LapsationRiskLevel = z.infer<typeof LapsationRiskLevelSchema>;

export const LapsationRecordSummarySchema = z.object({
  id: z.string().uuid(),
  policyNumberId: z.string().uuid(),
  policyNumber: z.string(),
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

export const LapsationDashboardResponseSchema = z.object({
  generatedAtUtc: z.string().datetime(),
  summary: z.object({
    totalTracked: z.number().int().nonnegative(),
    atRiskCount: z.number().int().nonnegative(),
    reinstatedYtd: z.number().int().nonnegative(),
    criticalCount: z.number().int().nonnegative(),
  }),
  records: z.array(LapsationRecordSummarySchema),
});
export type LapsationDashboardResponse = z.infer<typeof LapsationDashboardResponseSchema>;

export const ReinstateLapsationRecordResponseSchema = z.object({
  success: z.boolean(),
  reinstatedAtUtc: z.string().datetime(),
});
export type ReinstateLapsationRecordResponse = z.infer<typeof ReinstateLapsationRecordResponseSchema>;
