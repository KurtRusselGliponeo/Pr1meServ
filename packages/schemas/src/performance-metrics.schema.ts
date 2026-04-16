import { z } from 'zod';

import { userRoleSchema } from './auth.schema';

export const MetricsRoleFilterSchema = z.union([userRoleSchema, z.literal('all')]);
export type MetricsRoleFilter = z.infer<typeof MetricsRoleFilterSchema>;

export const GetPerformanceMetricsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(9999),
  role: MetricsRoleFilterSchema.default('all'),
});
export type GetPerformanceMetricsQuery = z.infer<typeof GetPerformanceMetricsQuerySchema>;

export const PerformanceMetricPointSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  label: z.string().min(1),
  modalPremium: z.number().nonnegative(),
  api: z.number().nonnegative(),
  sumAssured: z.number().nonnegative(),
  commissionAmount: z.number().nonnegative(),
});
export type PerformanceMetricPoint = z.infer<typeof PerformanceMetricPointSchema>;

export const PerformanceMetricSummarySchema = z.object({
  activeAgents: z.number().int().nonnegative(),
  totalApi: z.number().nonnegative(),
  totalModalPremium: z.number().nonnegative(),
  totalCommission: z.number().nonnegative(),
});
export type PerformanceMetricSummary = z.infer<typeof PerformanceMetricSummarySchema>;

export const PerformanceMetricsResponseSchema = z.object({
  generatedAtUtc: z.string().datetime(),
  summary: PerformanceMetricSummarySchema,
  points: z.array(PerformanceMetricPointSchema),
});
export type PerformanceMetricsResponse = z.infer<typeof PerformanceMetricsResponseSchema>;
