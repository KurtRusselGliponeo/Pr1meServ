import { and, eq, isNull, gte, lt, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';

import type {
  GetPerformanceMetricsQuery,
  PerformanceLeaderboardQuery,
  PerformanceLeaderboardResponse,
  PerformanceMetricsResponse,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { agentProfiles, clientProfiles, lapsationRecords, performanceMetrics } from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';

function toNumber(value: string | number | null | undefined) {
  return new Decimal(value ?? 0).toNumber();
}

export class MetricsService {
  private async getActorBranchCode(actorUser: AuthTokenPayload): Promise<string | null> {
    if (!actorUser.agentId) {
      return null;
    }

    const [actorProfile] = await db
      .select({ branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, actorUser.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    return actorProfile?.branchCode ?? null;
  }

  async getLeaderboardRows(
    query: PerformanceLeaderboardQuery,
    actorUser: AuthTokenPayload,
  ): Promise<PerformanceLeaderboardResponse['rows']> {
    const recordMonth = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const leaderboardConditions = [eq(performanceMetrics.recordMonth, recordMonth)];
    const branchCode = await this.getActorBranchCode(actorUser);

    if (actorUser.role === 'Agent' && actorUser.agentId) {
      leaderboardConditions.push(eq(performanceMetrics.agentId, actorUser.agentId));
    }

    if (actorUser.role === 'BranchManager' && branchCode) {
      leaderboardConditions.push(eq(agentProfiles.branchCode, branchCode));
    }

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
      .where(and(...leaderboardConditions));

    const lapsationConditions = [
      and(isNull(lapsationRecords.reinstatedAtUtc), eq(lapsationRecords.isAtRisk, true))!,
    ];

    if (actorUser.role === 'Agent' && actorUser.agentId) {
      lapsationConditions.push(eq(clientProfiles.assignedAgentId, actorUser.agentId));
    }

    if (actorUser.role === 'BranchManager' && branchCode) {
      lapsationConditions.push(eq(clientProfiles.branchCode, branchCode));
    }

    const lapsationRows = await db
      .select({
        agentId: clientProfiles.assignedAgentId,
        count: sql<number>`count(*)::int`,
      })
      .from(lapsationRecords)
      .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
      .where(and(...lapsationConditions))
      .groupBy(clientProfiles.assignedAgentId);

    const lapsationCountByAgent = new Map(
      lapsationRows.filter((row) => row.agentId).map((row) => [row.agentId as string, row.count]),
    );

    return rows
      .map((row) => {
        const api = toNumber(row.api);
        const commissionAmount = toNumber(row.commissionAmount);
        const modalPremium = toNumber(row.modalPremium);
        const lapsationCount = lapsationCountByAgent.get(row.agentId) ?? 0;
        const recruitmentCount = row.recruitmentCount ?? 0;
        const lapsationRate = api > 0 ? lapsationCount / Math.max(api, 1) : 0;
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
  }

  async getPerformanceMetrics(
    query: GetPerformanceMetricsQuery,
    actorUser: AuthTokenPayload,
  ): Promise<PerformanceMetricsResponse> {
    const startMonth = `${query.year}-01`;
    const nextMonthDate = new Date(Date.UTC(query.year, query.month, 1));
    const endMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = `${query.year}-${String(query.month).padStart(2, '0')}`;
    const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });

    const metricConditions = [
      gte(performanceMetrics.recordMonth, startMonth),
      lt(performanceMetrics.recordMonth, endMonth),
    ];
    const branchCode = await this.getActorBranchCode(actorUser);

    if (actorUser.role === 'Agent' && actorUser.agentId) {
      metricConditions.push(eq(performanceMetrics.agentId, actorUser.agentId));
    } else if (actorUser.role === 'BranchManager' && branchCode) {
      metricConditions.push(eq(agentProfiles.branchCode, branchCode));
    }

    const [summaryRows, pointRows] = await Promise.all([
      db
        .select({
          activeAgents: sql<number>`count(distinct ${performanceMetrics.agentId})::int`,
          totalApi: sql<string>`coalesce(sum(${performanceMetrics.api}), 0)::text`,
          totalModalPremium: sql<string>`coalesce(sum(${performanceMetrics.modalPremium}), 0)::text`,
          totalCommission: sql<string>`coalesce(sum(${performanceMetrics.commissionAmount}), 0)::text`,
        })
        .from(performanceMetrics)
        .innerJoin(
          agentProfiles,
          and(eq(agentProfiles.id, performanceMetrics.agentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .where(and(...metricConditions)),
      db
        .select({
          month: performanceMetrics.recordMonth,
          modalPremium: sql<string>`coalesce(sum(${performanceMetrics.modalPremium}), 0)::text`,
          api: sql<string>`coalesce(sum(${performanceMetrics.api}), 0)::text`,
          sumAssured: sql<string>`coalesce(sum(${performanceMetrics.sumAssured}), 0)::text`,
          commissionAmount: sql<string>`coalesce(sum(${performanceMetrics.commissionAmount}), 0)::text`,
        })
        .from(performanceMetrics)
        .innerJoin(
          agentProfiles,
          and(eq(agentProfiles.id, performanceMetrics.agentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .where(and(...metricConditions))
        .groupBy(performanceMetrics.recordMonth)
        .orderBy(performanceMetrics.recordMonth),
    ]);

    const summaryRow = summaryRows[0];
    const points = pointRows
      .filter((point) => point.month <= selectedMonth)
      .map((point) => ({
        month: point.month,
        label: monthFormatter.format(new Date(`${point.month}-01T00:00:00.000Z`)),
        modalPremium: toNumber(point.modalPremium),
        api: toNumber(point.api),
        sumAssured: toNumber(point.sumAssured),
        commissionAmount: toNumber(point.commissionAmount),
      }));

    return {
      generatedAtUtc: new Date().toISOString(),
      summary: {
        activeAgents: summaryRow?.activeAgents ?? 0,
        totalApi: toNumber(summaryRow?.totalApi),
        totalModalPremium: toNumber(summaryRow?.totalModalPremium),
        totalCommission: toNumber(summaryRow?.totalCommission),
      },
      points,
    };
  }

  async getLeaderboard(
    query: PerformanceLeaderboardQuery,
    actorUser: AuthTokenPayload,
  ): Promise<PerformanceLeaderboardResponse> {
    return {
      generatedAtUtc: new Date().toISOString(),
      recordMonth: `${query.year}-${String(query.month).padStart(2, '0')}`,
      rows: await this.getLeaderboardRows(query, actorUser),
    };
  }
}

export const metricsService = new MetricsService();
