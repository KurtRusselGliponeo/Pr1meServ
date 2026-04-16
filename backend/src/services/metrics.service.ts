import { and, gte, lt } from 'drizzle-orm';
import Decimal from 'decimal.js';

import type {
  GetPerformanceMetricsQuery,
  PerformanceMetricsResponse,
  PerformanceMetricPoint,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { performanceMetrics } from '@/schema';

function toNumber(value: string | number | null | undefined) {
  return new Decimal(value ?? 0).toNumber();
}

/**
 * Provides aggregated reporting metrics for the dashboard.
 */
export class MetricsService {
  /**
   * Returns a year-to-date performance aggregation for the requested period.
   *
   * @param query Validated month/year query values.
   * @returns Aggregated performance metrics ready for the frontend dashboard.
   */
  async getPerformanceMetrics(
    query: GetPerformanceMetricsQuery,
  ): Promise<PerformanceMetricsResponse> {
    const startMonth = `${query.year}-01`;
    const endMonth = `${query.year + 1}-01`;

    const rows = await db
      .select({
        agentId: performanceMetrics.agentId,
        month: performanceMetrics.recordMonth,
        modalPremium: performanceMetrics.modalPremium,
        api: performanceMetrics.api,
        sumAssured: performanceMetrics.sumAssured,
        commissionAmount: performanceMetrics.commissionAmount,
      })
      .from(performanceMetrics)
      .where(
        and(
          gte(performanceMetrics.recordMonth, startMonth),
          lt(performanceMetrics.recordMonth, endMonth),
        ),
      );

    const selectedMonth = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
    const pointsMap = new Map<string, PerformanceMetricPoint>();
    const activeAgents = new Set<string>();
    let totalApi = new Decimal(0);
    let totalModalPremium = new Decimal(0);
    let totalCommission = new Decimal(0);

    for (const row of rows) {
      activeAgents.add(row.agentId);
      totalApi = totalApi.plus(row.api ?? 0);
      totalModalPremium = totalModalPremium.plus(row.modalPremium ?? 0);
      totalCommission = totalCommission.plus(row.commissionAmount ?? 0);

      const existingPoint = pointsMap.get(row.month);
      const nextPoint = {
        month: row.month,
        label: monthFormatter.format(new Date(`${row.month}-01T00:00:00.000Z`)),
        modalPremium: (existingPoint?.modalPremium ?? 0) + toNumber(row.modalPremium),
        api: (existingPoint?.api ?? 0) + toNumber(row.api),
        sumAssured: (existingPoint?.sumAssured ?? 0) + toNumber(row.sumAssured),
        commissionAmount: (existingPoint?.commissionAmount ?? 0) + toNumber(row.commissionAmount),
      };

      pointsMap.set(row.month, nextPoint);
    }

    const sortedPoints = [...pointsMap.values()].sort((left, right) =>
      left.month.localeCompare(right.month),
    );
    const filteredPoints =
      sortedPoints.filter((point) => point.month <= selectedMonth).length > 0
        ? sortedPoints.filter((point) => point.month <= selectedMonth)
        : sortedPoints;

    return {
      generatedAtUtc: new Date().toISOString(),
      summary: {
        activeAgents: activeAgents.size,
        totalApi: totalApi.toNumber(),
        totalModalPremium: totalModalPremium.toNumber(),
        totalCommission: totalCommission.toNumber(),
      },
      points: filteredPoints,
    };
  }
}

export const metricsService = new MetricsService();
