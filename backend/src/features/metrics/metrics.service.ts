import { and, eq, gte, isNull, lt } from 'drizzle-orm';
import Decimal from 'decimal.js';

import type {
  GetPerformanceMetricsQuery,
  PerformanceLeaderboardQuery,
  PerformanceLeaderboardResponse,
  PerformanceMetricsResponse,
  PerformanceMetricPoint,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { agentProfiles, clientProfiles, lapsationRecords, performanceMetrics } from '@/schema';

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
    const nextMonthDate = new Date(Date.UTC(query.year, query.month, 1));
    const endMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

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
      )
      .orderBy(performanceMetrics.recordMonth);

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

  async getLeaderboard(query: PerformanceLeaderboardQuery): Promise<PerformanceLeaderboardResponse> {
    const recordMonth = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const rows = await db
      .select({
        agentId: performanceMetrics.agentId,
        agentName: agentProfiles.displayName,
        recordMonth: performanceMetrics.recordMonth,
        api: performanceMetrics.api,
        modalPremium: performanceMetrics.modalPremium,
        commissionAmount: performanceMetrics.commissionAmount,
        recruitmentCount: performanceMetrics.recruitmentCount,
      })
      .from(performanceMetrics)
      .innerJoin(
        agentProfiles,
        and(eq(agentProfiles.id, performanceMetrics.agentId), isNull(agentProfiles.deletedAtUtc)),
      )
      .where(eq(performanceMetrics.recordMonth, recordMonth));

    const lapsationRows = await db
      .select({
        agentId: clientProfiles.assignedAgentId,
      })
      .from(lapsationRecords)
      .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
      .where(and(isNull(lapsationRecords.reinstatedAtUtc), eq(lapsationRecords.isAtRisk, true)));

    const lapsationCountByAgent = new Map<string, number>();
    for (const row of lapsationRows) {
      if (!row.agentId) {
        continue;
      }
      lapsationCountByAgent.set(row.agentId, (lapsationCountByAgent.get(row.agentId) ?? 0) + 1);
    }

    const leaderboardRows = rows
      .map((row) => {
        const api = toNumber(row.api);
        const commissionAmount = toNumber(row.commissionAmount);
        const modalPremium = toNumber(row.modalPremium);
        const lapsationCount = lapsationCountByAgent.get(row.agentId) ?? 0;
        const recruitmentCount = row.recruitmentCount ?? 0;
        const lapsationRate = api > 0 ? lapsationCount / api : 0;
        const score = api + commissionAmount + modalPremium + recruitmentCount * 1000 - lapsationCount * 500;

        return {
          agentId: row.agentId,
          agentName: row.agentName,
          recordMonth: row.recordMonth,
          api,
          modalPremium,
          commissionAmount,
          recruitmentCount,
          lapsationCount,
          lapsationRate,
          score,
        };
      })
      .sort((left, right) => right.score - left.score);

    return {
      generatedAtUtc: new Date().toISOString(),
      recordMonth,
      rows: leaderboardRows,
    };
  }
}

export const metricsService = new MetricsService();
