import { and, desc, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';
import Decimal from 'decimal.js';
import { z } from 'zod';

import type {
  GetPerformanceMetricsQuery,
  PerformanceLeaderboardQuery,
  PerformanceLeaderboardResponse,
  PerformanceMetricsResponse,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  clientProfiles,
  lapsationRecords,
  nap,
  napTransactions,
  perPerformance,
  performanceMetrics,
  policies,
  policyTransactions,
  recRecruitment,
} from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import type { DbTransaction } from '@/db/client';

function toNumber(value: string | number | null | undefined) {
  return new Decimal(value ?? 0).toNumber();
}

function recordMonth(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function nextRecordMonth(value: string) {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(5, 7), 10);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(
    new Date(`${value}-01T00:00:00.000Z`),
  );
}

function monthDateRange(value: string) {
  const year = Number.parseInt(value.slice(0, 4), 10);
  const month = Number.parseInt(value.slice(5, 7), 10);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1));
  return { start, end };
}

function persistencyWindowStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 13, 1));
}

function persistencyWindowEnd(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1));
}

const UNCOLLECTED_TRANSACTION_TYPES = new Set([
  'LAPSE',
  'SURRENDER',
  'CANCEL',
  'UNIT CANCEL',
  'UNIT CANCELLED',
  'CANCELLED',
]);

type PersistencySourceRow = {
  agentCode: string | null;
  api: string | null;
  transactionType: string | null;
};

type MetricDatabase = typeof db | DbTransaction;

function buildPersistencyByAgentCode(rows: PersistencySourceRow[]) {
  const totals = new Map<string, { collected: number; uncollected: number }>();

  for (const row of rows) {
    if (!row.agentCode) {
      continue;
    }

    const api = toNumber(row.api);
    const transactionType = row.transactionType?.trim().toUpperCase() ?? '';
    const bucket = totals.get(row.agentCode) ?? { collected: 0, uncollected: 0 };

    if (UNCOLLECTED_TRANSACTION_TYPES.has(transactionType)) {
      bucket.uncollected += api;
    } else {
      bucket.collected += api;
    }

    totals.set(row.agentCode, bucket);
  }

  return new Map(
    [...totals.entries()].map(([agentCode, value]) => {
      const denominator = value.collected + value.uncollected;
      return [agentCode, denominator > 0 ? (value.collected / denominator) * 100 : 100];
    }),
  );
}

export class MetricsService {
  private toRecordMonthFromDate(value: Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
  }

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

  private toRecordMonthFromDateOnly(value: string | Date | null | undefined) {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return value.slice(0, 7);
    }

    return this.toRecordMonthFromDate(value);
  }

  private async getScopedAgentIds(actorUser: AuthTokenPayload) {
    if (actorUser.role === 'Agent') {
      return actorUser.agentId ? [actorUser.agentId] : [];
    }

    if (actorUser.role === 'BranchManager') {
      const branchCode = await this.getActorBranchCode(actorUser);
      if (!branchCode) {
        throw new ForbiddenError('Branch Manager analytics require a linked branch profile.');
      }

      const rows = await db
        .select({ id: agentProfiles.id })
        .from(agentProfiles)
        .where(
          and(
            eq(agentProfiles.branchCode, branchCode),
            isNull(agentProfiles.deletedAtUtc),
            eq(agentProfiles.status, 'Active'),
          ),
        );

      return rows.map((row) => row.id);
    }

    return null;
  }

  async getLeaderboardRows(
    query: PerformanceLeaderboardQuery,
    actorUser: AuthTokenPayload,
  ): Promise<PerformanceLeaderboardResponse['rows']> {
    const selectedMonth = recordMonth(query.month, query.year);
    const scopedAgentIds = await this.getScopedAgentIds(actorUser);
    const branchCode = actorUser.role === 'Admin' ? null : await this.getActorBranchCode(actorUser);
    const persistencyStart = persistencyWindowStart(query.year, query.month);
    const persistencyEnd = persistencyWindowEnd(query.year, query.month);

    const metricConditions = [eq(performanceMetrics.recordMonth, selectedMonth)];
    if (scopedAgentIds) {
      metricConditions.push(inArray(performanceMetrics.agentId, scopedAgentIds));
    }

    const rows = await db
      .select({
        agentId: performanceMetrics.agentId,
        agentName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        branchCode: agentProfiles.branchCode,
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
      .where(and(...metricConditions));

    const lapseConditions = [
      eq(lapsationRecords.isAtRisk, true),
      isNull(lapsationRecords.reinstatedAtUtc),
    ];
    if (actorUser.role === 'Agent' && actorUser.agentId) {
      lapseConditions.push(eq(clientProfiles.assignedAgentId, actorUser.agentId));
    } else if (actorUser.role === 'BranchManager' && branchCode) {
      lapseConditions.push(eq(clientProfiles.branchCode, branchCode));
    }

    const [
      lapsationRows,
      reinstatementRows,
      importedPersistencyRows,
      manualPersistencyRows,
      monthlyPersistencyRows,
    ] = await Promise.all([
      db
        .select({
          agentId: clientProfiles.assignedAgentId,
          count: sql<number>`count(*)::int`,
        })
        .from(lapsationRecords)
        .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
        .where(and(...lapseConditions))
        .groupBy(clientProfiles.assignedAgentId),
      db
        .select({
          agentId: clientProfiles.assignedAgentId,
          count: sql<number>`count(*)::int`,
        })
        .from(policyTransactions)
        .innerJoin(policies, eq(policies.id, policyTransactions.policyId))
        .innerJoin(clientProfiles, eq(clientProfiles.id, policies.clientProfileId))
        .where(
          and(
            eq(policyTransactions.transactionType, 'REINSTATED'),
            gte(policyTransactions.createdAtUtc, new Date(`${selectedMonth}-01T00:00:00.000Z`)),
            lt(
              policyTransactions.createdAtUtc,
              new Date(
                query.month === 12
                  ? `${query.year + 1}-01-01T00:00:00.000Z`
                  : `${query.year}-${String(query.month + 1).padStart(2, '0')}-01T00:00:00.000Z`,
              ),
            ),
            actorUser.role === 'Admin'
              ? undefined
              : actorUser.role === 'Agent' && actorUser.agentId
                ? eq(clientProfiles.assignedAgentId, actorUser.agentId)
                : eq(clientProfiles.branchCode, branchCode!),
          ),
        )
        .groupBy(clientProfiles.assignedAgentId),
      db
        .select({
          agentCode: agentProfiles.agentCode,
          api: nap.api,
          transactionType: nap.transactionType,
        })
        .from(nap)
        .innerJoin(
          agentProfiles,
          and(eq(agentProfiles.agentCode, nap.agentCode), isNull(agentProfiles.deletedAtUtc)),
        )
        .where(
          and(
            gte(nap.transactionDate, persistencyStart),
            lt(nap.transactionDate, persistencyEnd),
            actorUser.role === 'Admin'
              ? undefined
              : actorUser.role === 'Agent' && actorUser.agentId
                ? eq(agentProfiles.id, actorUser.agentId)
                : eq(agentProfiles.branchCode, branchCode!),
          ),
        ),
      db
        .select({
          agentCode: agentProfiles.agentCode,
          api: napTransactions.api,
          transactionType: napTransactions.transactionType,
        })
        .from(napTransactions)
        .innerJoin(
          agentProfiles,
          and(eq(agentProfiles.id, napTransactions.agentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .where(
          and(
            gte(napTransactions.transactionDate, persistencyStart),
            lt(napTransactions.transactionDate, persistencyEnd),
            actorUser.role === 'Admin'
              ? undefined
              : actorUser.role === 'Agent' && actorUser.agentId
                ? eq(agentProfiles.id, actorUser.agentId)
                : eq(agentProfiles.branchCode, branchCode!),
          ),
        ),
      db
        .select({
          agentId: perPerformance.agentId,
          personalPersistency: perPerformance.personalPersistency,
        })
        .from(perPerformance)
        .innerJoin(
          agentProfiles,
          and(eq(agentProfiles.id, perPerformance.agentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .where(
          and(
            eq(perPerformance.recordMonth, selectedMonth),
            actorUser.role === 'Admin'
              ? undefined
              : actorUser.role === 'Agent' && actorUser.agentId
                ? eq(perPerformance.agentId, actorUser.agentId)
                : eq(agentProfiles.branchCode, branchCode!),
          ),
        ),
    ]);

    const lapsationCountByAgent = new Map(
      lapsationRows.filter((row) => row.agentId).map((row) => [row.agentId as string, row.count]),
    );
    const reinstatementCountByAgent = new Map(
      reinstatementRows.filter((row) => row.agentId).map((row) => [row.agentId as string, row.count]),
    );
    const persistencyByAgentCode = buildPersistencyByAgentCode([
      ...importedPersistencyRows,
      ...manualPersistencyRows,
    ]);
    const manualPersistencyByAgentId = new Map(
      monthlyPersistencyRows.map((row) => [row.agentId, toNumber(row.personalPersistency)]),
    );

    return rows
      .map((row) => {
        const api = toNumber(row.api);
        const commissionAmount = toNumber(row.commissionAmount);
        const modalPremium = toNumber(row.modalPremium);
        const lapsationCount = lapsationCountByAgent.get(row.agentId) ?? 0;
        const reinstatementCount = reinstatementCountByAgent.get(row.agentId) ?? 0;
        const recruitmentCount = row.recruitmentCount ?? 0;
        const lapsationRate = modalPremium > 0 ? lapsationCount / modalPremium : 0;
        const persistencyRate =
          manualPersistencyByAgentId.get(row.agentId) ??
          persistencyByAgentCode.get(row.agentCode) ??
          100;

        const score =
          api +
          commissionAmount +
          modalPremium +
          recruitmentCount * 1000 +
          reinstatementCount * 250 -
          lapsationCount * 500;

        return {
          agentId: row.agentId,
          agentName: row.agentName,
          branchCode: row.branchCode,
          recordMonth: row.recordMonth,
          api,
          modalPremium,
          commissionAmount,
          recruitmentCount,
          lapsationCount,
          reinstatementCount,
          persistencyRate,
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
    const selectedMonth = recordMonth(query.month, query.year);
    const startMonth = `${query.year}-01`;
    const nextMonthDate = new Date(Date.UTC(query.year, query.month, 1));
    const endMonth = `${nextMonthDate.getUTCFullYear()}-${String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const branchCode = actorUser.role === 'Admin' ? null : await this.getActorBranchCode(actorUser);
    const scopedAgentIds = await this.getScopedAgentIds(actorUser);

    const metricConditions = [
      gte(performanceMetrics.recordMonth, startMonth),
      lt(performanceMetrics.recordMonth, endMonth),
    ];
    if (scopedAgentIds) {
      metricConditions.push(inArray(performanceMetrics.agentId, scopedAgentIds));
    }

    const [summaryRows, pointRows, selectedLeaderboardRows] = await Promise.all([
      db
        .select({
          activeAgents: sql<number>`count(distinct ${performanceMetrics.agentId})::int`,
          totalApi: sql<string>`coalesce(sum(${performanceMetrics.api}), 0)::text`,
          totalModalPremium: sql<string>`coalesce(sum(${performanceMetrics.modalPremium}), 0)::text`,
          totalCommission: sql<string>`coalesce(sum(${performanceMetrics.commissionAmount}), 0)::text`,
          totalRecruitment: sql<number>`coalesce(sum(${performanceMetrics.recruitmentCount}), 0)::int`,
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
          recruitmentCount: sql<number>`coalesce(sum(${performanceMetrics.recruitmentCount}), 0)::int`,
        })
        .from(performanceMetrics)
        .innerJoin(
          agentProfiles,
          and(eq(agentProfiles.id, performanceMetrics.agentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .where(and(...metricConditions))
        .groupBy(performanceMetrics.recordMonth)
        .orderBy(performanceMetrics.recordMonth),
      this.getLeaderboardRows({ month: query.month, year: query.year }, actorUser),
    ]);

    const selectedMonthRows = pointRows.filter((point) => point.month === selectedMonth);
    const currentPoint = selectedMonthRows[0];
    const selectedPersistencyRate =
      selectedLeaderboardRows.length === 0
        ? 100
        : selectedLeaderboardRows.reduce((total, row) => total + row.persistencyRate, 0) /
          selectedLeaderboardRows.length;

    const points = await Promise.all(
      pointRows
        .filter((point) => point.month <= selectedMonth)
        .map(async (point) => {
          const leaderboardRows = await this.getLeaderboardRows(
            {
              month: Number.parseInt(point.month.slice(5, 7), 10),
              year: Number.parseInt(point.month.slice(0, 4), 10),
            },
            actorUser,
          );
          const persistencyRate =
            leaderboardRows.length === 0
              ? 100
              : leaderboardRows.reduce((total, row) => total + row.persistencyRate, 0) /
                leaderboardRows.length;

          return {
            month: point.month,
            label: monthLabel(point.month),
            modalPremium: toNumber(point.modalPremium),
            api: toNumber(point.api),
            sumAssured: toNumber(point.sumAssured),
            commissionAmount: toNumber(point.commissionAmount),
            recruitmentCount: point.recruitmentCount ?? 0,
            lapsationCount: leaderboardRows.reduce((total, row) => total + row.lapsationCount, 0),
            reinstatementCount: leaderboardRows.reduce(
              (total, row) => total + row.reinstatementCount,
              0,
            ),
            persistencyRate,
          };
        }),
    );

    return {
      generatedAtUtc: new Date().toISOString(),
      scope: {
        role: actorUser.role,
        branchCode,
        agentId: actorUser.role === 'Agent' ? actorUser.agentId : null,
      },
      summary: {
        activeAgents: summaryRows[0]?.activeAgents ?? 0,
        totalApi: toNumber(summaryRows[0]?.totalApi),
        totalModalPremium: toNumber(summaryRows[0]?.totalModalPremium),
        totalCommission: toNumber(summaryRows[0]?.totalCommission),
        totalSales: toNumber(summaryRows[0]?.totalCommission),
        totalNap: toNumber(currentPoint?.api),
        totalApe: toNumber(currentPoint?.modalPremium),
        totalRecruitment: summaryRows[0]?.totalRecruitment ?? 0,
        atRiskCount: selectedLeaderboardRows.reduce((total, row) => total + row.lapsationCount, 0),
        lapsedCount: selectedLeaderboardRows.filter((row) => row.persistencyRate < 100).length,
        reinstatementCount: selectedLeaderboardRows.reduce(
          (total, row) => total + row.reinstatementCount,
          0,
        ),
        persistencyRate: selectedPersistencyRate,
      },
      points,
    };
  }

  async getLeaderboard(
    query: PerformanceLeaderboardQuery,
    actorUser: AuthTokenPayload,
  ): Promise<PerformanceLeaderboardResponse> {
    const rows = await this.getLeaderboardRows(query, actorUser);
    const branchCode = actorUser.role === 'Admin' ? null : await this.getActorBranchCode(actorUser);
    const branchSummaries = new Map<string, PerformanceLeaderboardResponse['branches'][number]>();

    for (const row of rows) {
      const existing = branchSummaries.get(row.branchCode);
      if (existing) {
        const nextActiveAgents = existing.activeAgents + 1;
        existing.totalSales += row.commissionAmount;
        existing.totalNap += row.api;
        existing.totalApe += row.modalPremium;
        existing.totalRecruitment += row.recruitmentCount;
        existing.lapsationCount += row.lapsationCount;
        existing.reinstatementCount += row.reinstatementCount;
        existing.persistencyRate =
          (existing.persistencyRate * existing.activeAgents + row.persistencyRate) /
          nextActiveAgents;
        existing.activeAgents = nextActiveAgents;
      } else {
        branchSummaries.set(row.branchCode, {
          branchCode: row.branchCode,
          totalSales: row.commissionAmount,
          totalNap: row.api,
          totalApe: row.modalPremium,
          totalRecruitment: row.recruitmentCount,
          persistencyRate: row.persistencyRate,
          lapsationCount: row.lapsationCount,
          reinstatementCount: row.reinstatementCount,
          activeAgents: 1,
        });
      }
    }

    return {
      generatedAtUtc: new Date().toISOString(),
      recordMonth: recordMonth(query.month, query.year),
      scope: {
        role: actorUser.role,
        branchCode,
        agentId: actorUser.role === 'Agent' ? actorUser.agentId : null,
      },
      rows,
      branches: [...branchSummaries.values()].sort((left, right) => right.totalSales - left.totalSales),
    };
  }

  async buildCsvReport(
    query: PerformanceLeaderboardQuery,
    actorUser: AuthTokenPayload,
  ): Promise<string> {
    const leaderboard = await this.getLeaderboard(query, actorUser);
    const metrics = await this.getPerformanceMetrics({ ...query, role: 'all' }, actorUser);
    const branchSection = leaderboard.branches
      .map(
        (row) =>
          `${row.branchCode},${row.totalSales},${row.persistencyRate.toFixed(2)},${row.lapsationCount},${row.reinstatementCount},${row.totalRecruitment}`,
      )
      .join('\n');
    const agentSection = leaderboard.rows
      .map(
        (row) =>
          `${row.agentName},${row.branchCode},${row.api},${row.modalPremium},${row.commissionAmount},${row.persistencyRate.toFixed(2)},${row.lapsationCount},${row.reinstatementCount},${row.recruitmentCount}`,
      )
      .join('\n');

    return [
      'Phase 8 Performance Report',
      `Generated At,${new Date().toISOString()}`,
      `Scope Role,${leaderboard.scope.role}`,
      `Scope Branch,${leaderboard.scope.branchCode ?? 'ALL'}`,
      '',
      'Summary',
      'Total Sales,Total NAP,Total APE,Persistency,Lapsation,Reinstatement,Recruitment',
      `${metrics.summary.totalSales},${metrics.summary.totalNap},${metrics.summary.totalApe},${metrics.summary.persistencyRate.toFixed(2)},${metrics.summary.atRiskCount},${metrics.summary.reinstatementCount},${metrics.summary.totalRecruitment}`,
      '',
      'Branch Leaderboard',
      'Branch,Total Sales,Persistency,Lapsation,Reinstatement,Recruitment',
      branchSection,
      '',
      'Agent Drill Down',
      'Agent,Branch,NAP,APE,Sales,Persistency,Lapsation,Reinstatement,Recruitment',
      agentSection,
    ].join('\n');
  }

  async manualEntry(body: unknown, actor: AuthTokenPayload): Promise<{ id: string; created: boolean }> {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const ManualEntrySchema = z.object({
      agentId: z.string().uuid(),
      month: z.number().int().min(1).max(12),
      year: z.number().int().min(2000).max(2100),
      nap: z.number().min(0).default(0),
      ape: z.number().min(0).default(0),
      sumAssured: z.number().min(0).default(0),
      commissionAmount: z.number().min(0).default(0),
      recruitmentCount: z.number().int().min(0).default(0),
    });

    const input = ManualEntrySchema.parse(body);
    const monthStr = recordMonth(input.month, input.year);

    const [agent] = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, input.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);
    if (!agent) throw new NotFoundError('Agent not found.');

    const [existing] = await db
      .select({
        id: performanceMetrics.id,
        api: performanceMetrics.api,
        modalPremium: performanceMetrics.modalPremium,
        sumAssured: performanceMetrics.sumAssured,
        commissionAmount: performanceMetrics.commissionAmount,
        recruitmentCount: performanceMetrics.recruitmentCount,
      })
      .from(performanceMetrics)
      .where(and(eq(performanceMetrics.agentId, input.agentId), eq(performanceMetrics.recordMonth, monthStr)))
      .limit(1);

    return await withDbTransaction('metrics.manualEntry', async (tx) => {
      if (existing) {
        await tx
          .update(performanceMetrics)
          .set({
            api: (toNumber(existing.api) + input.nap).toFixed(4),
            modalPremium: (toNumber(existing.modalPremium) + input.ape).toFixed(4),
            sumAssured: (toNumber(existing.sumAssured) + input.sumAssured).toFixed(4),
            commissionAmount: (toNumber(existing.commissionAmount) + input.commissionAmount).toFixed(4),
            recruitmentCount: (existing.recruitmentCount ?? 0) + input.recruitmentCount,
            updatedAt: new Date(),
          })
          .where(eq(performanceMetrics.id, existing.id));
        return { id: existing.id, created: false };
      }

      const [inserted] = await tx.insert(performanceMetrics).values({
        agentId: input.agentId,
        recordMonth: monthStr,
        api: input.nap.toFixed(4),
        modalPremium: input.ape.toFixed(4),
        sumAssured: input.sumAssured.toFixed(4),
        commissionAmount: input.commissionAmount.toFixed(4),
        recruitmentCount: input.recruitmentCount,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning({ id: performanceMetrics.id });

      return { id: inserted.id, created: true };
    });
  }

  async listManualEntries(actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    return db
      .select({
        id: performanceMetrics.id,
        agentId: performanceMetrics.agentId,
        agentName: agentProfiles.displayName,
        agentCode: agentProfiles.agentCode,
        recordMonth: performanceMetrics.recordMonth,
        nap: performanceMetrics.api,
        ape: performanceMetrics.modalPremium,
        sumAssured: performanceMetrics.sumAssured,
        commissionAmount: performanceMetrics.commissionAmount,
        recruitmentCount: performanceMetrics.recruitmentCount,
        updatedAt: performanceMetrics.updatedAt,
      })
      .from(performanceMetrics)
      .innerJoin(agentProfiles, and(eq(agentProfiles.id, performanceMetrics.agentId), isNull(agentProfiles.deletedAtUtc)))
      .orderBy(desc(performanceMetrics.updatedAt));
  }

  async deleteManualEntry(entryId: string, actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') throw new ForbiddenError('Admin access required.');

    const [existing] = await db
      .select({ id: performanceMetrics.id })
      .from(performanceMetrics)
      .where(eq(performanceMetrics.id, entryId))
      .limit(1);

    if (!existing) throw new NotFoundError('Performance entry not found.');

    await db.delete(performanceMetrics).where(eq(performanceMetrics.id, entryId));
  }

  async recalculateManualMetricsForAgentMonth(
    agentId: string,
    targetRecordMonth: string,
    database: MetricDatabase = db,
  ): Promise<{ id: string; created: boolean }> {
    const { start, end } = monthDateRange(targetRecordMonth);

    const [policyRows, napRows, recruitmentRows, existingRows] = await Promise.all([
      database
        .select({
          modalPremium: sql<string>`coalesce(sum(${policies.modalPremium}), 0)::text`,
          api: sql<string>`coalesce(sum(${policies.api}), 0)::text`,
          sumAssured: sql<string>`coalesce(sum(${policies.sumAssured}), 0)::text`,
          caseCount: sql<number>`count(*)::int`,
        })
        .from(policies)
        .where(
          and(
            eq(policies.assignedAgentId, agentId),
            gte(policies.firstIssueDate, targetRecordMonth),
            lt(policies.firstIssueDate, nextRecordMonth(targetRecordMonth)),
          ),
        ),
      database
        .select({
          api: sql<string>`coalesce(sum(${napTransactions.api}), 0)::text`,
        })
        .from(napTransactions)
        .where(
          and(
            eq(napTransactions.agentId, agentId),
            gte(napTransactions.transactionDate, start),
            lt(napTransactions.transactionDate, end),
          ),
        ),
      database
        .select({
          count: sql<number>`count(*) filter (where ${recRecruitment.status} in ('Active', 'Reinstated', 'Pending'))::int`,
        })
        .from(recRecruitment)
        .where(
          and(
            eq(recRecruitment.agentId, agentId),
            gte(recRecruitment.dateAppointed, start),
            lt(recRecruitment.dateAppointed, end),
          ),
        ),
      database
        .select({ id: performanceMetrics.id })
        .from(performanceMetrics)
        .where(and(eq(performanceMetrics.agentId, agentId), eq(performanceMetrics.recordMonth, targetRecordMonth)))
        .limit(1),
    ]);

    const policyMetrics = policyRows[0];
    const napMetrics = napRows[0];
    const recruitmentMetrics = recruitmentRows[0];
    const api = toNumber(napMetrics?.api) > 0 ? toNumber(napMetrics?.api) : toNumber(policyMetrics?.api);
    const values = {
      modalPremium: toNumber(policyMetrics?.modalPremium).toFixed(4),
      api: api.toFixed(4),
      sumAssured: toNumber(policyMetrics?.sumAssured).toFixed(4),
      commissionAmount: '0.0000',
      recruitmentCount: recruitmentMetrics?.count ?? 0,
      updatedAt: new Date(),
    };

    const existing = existingRows[0];
    if (existing) {
      await database.update(performanceMetrics).set(values).where(eq(performanceMetrics.id, existing.id));
      return { id: existing.id, created: false };
    }

    const [inserted] = await database
      .insert(performanceMetrics)
      .values({
        agentId,
        recordMonth: targetRecordMonth,
        ...values,
        createdAt: new Date(),
      })
      .returning({ id: performanceMetrics.id });

    return { id: inserted.id, created: true };
  }

  async recalculateManualMetricsForPolicyChange(
    next: { agentId: string | null | undefined; firstIssueDate: string | Date | null | undefined },
    previous?: { agentId: string | null | undefined; firstIssueDate: string | Date | null | undefined },
    database: MetricDatabase = db,
  ): Promise<void> {
    const targets = new Map<string, { agentId: string; recordMonth: string }>();

    for (const item of [next, previous]) {
      const recordMonthValue = this.toRecordMonthFromDateOnly(item?.firstIssueDate);
      if (item?.agentId && recordMonthValue) {
        targets.set(`${item.agentId}:${recordMonthValue}`, {
          agentId: item.agentId,
          recordMonth: recordMonthValue,
        });
      }
    }

    await Promise.all(
      [...targets.values()].map((target) =>
        this.recalculateManualMetricsForAgentMonth(target.agentId, target.recordMonth, database),
      ),
    );
  }

  async applyManualNapMetricDelta(
    agentId: string,
    transactionDate: Date,
    deltaApi: number,
    database: MetricDatabase = db,
  ): Promise<void> {
    const targetRecordMonth = this.toRecordMonthFromDate(transactionDate);
    const [existingMetric] = await database
      .select({
        id: performanceMetrics.id,
        api: performanceMetrics.api,
      })
      .from(performanceMetrics)
      .where(
        and(eq(performanceMetrics.agentId, agentId), eq(performanceMetrics.recordMonth, targetRecordMonth)),
      )
      .limit(1);

    if (existingMetric) {
      await database
        .update(performanceMetrics)
        .set({
          api: (toNumber(existingMetric.api) + deltaApi).toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(performanceMetrics.id, existingMetric.id));
      return;
    }

    await database.insert(performanceMetrics).values({
      agentId,
      recordMonth: targetRecordMonth,
      modalPremium: '0.0000',
      api: Math.max(0, deltaApi).toFixed(4),
      sumAssured: '0.0000',
      commissionAmount: '0.0000',
      recruitmentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async applyManualRecruitmentMetricDelta(
    agentId: string,
    appointedAt: Date,
    deltaCount: number,
    database: MetricDatabase = db,
  ): Promise<void> {
    const targetRecordMonth = this.toRecordMonthFromDate(appointedAt);
    const [existingMetric] = await database
      .select({
        id: performanceMetrics.id,
        recruitmentCount: performanceMetrics.recruitmentCount,
      })
      .from(performanceMetrics)
      .where(
        and(eq(performanceMetrics.agentId, agentId), eq(performanceMetrics.recordMonth, targetRecordMonth)),
      )
      .limit(1);

    if (existingMetric) {
      await database
        .update(performanceMetrics)
        .set({
          recruitmentCount: Math.max(0, (existingMetric.recruitmentCount ?? 0) + deltaCount),
          updatedAt: new Date(),
        })
        .where(eq(performanceMetrics.id, existingMetric.id));
      return;
    }

    await database.insert(performanceMetrics).values({
      agentId,
      recordMonth: targetRecordMonth,
      modalPremium: '0.0000',
      api: '0.0000',
      sumAssured: '0.0000',
      commissionAmount: '0.0000',
      recruitmentCount: Math.max(0, deltaCount),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export const metricsService = new MetricsService();

