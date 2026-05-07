import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import type {
  ExportReportQuery,
  ListAuditFeedQuery,
  ListDataValidationIssuesQuery,
  UpdateDataValidationIssue,
} from '@a1prime/schemas';

import { db, withDbTransaction } from '@/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  dataValidationIssues,
  perPerformance,
  performanceMetrics,
  policies,
  recRecruitment,
  systemAuditLogs,
  userAccounts,
  napTransactions,
} from '@/schema';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { logSystemAudit } from '@/shared/lib/audit';
import { metricsService } from '@/features/phase-5-performance/metrics/metrics.service';

function currentRecordMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function csvCell(value: unknown) {
  const normalized =
    value === null || value === undefined
      ? ''
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',');
}

export class AdminDataCenterService {
  private async getActorBranchCode(actor: AuthTokenPayload): Promise<string | null> {
    if (!actor.agentId) {
      return null;
    }

    const [profile] = await db
      .select({ branchCode: agentProfiles.branchCode })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.id, actor.agentId), isNull(agentProfiles.deletedAtUtc)))
      .limit(1);

    return profile?.branchCode ?? null;
  }

  private async getScopedAgentIds(actor: AuthTokenPayload): Promise<string[] | null> {
    if (actor.role === 'Admin') {
      return null;
    }

    if (actor.role === 'Agent') {
      return actor.agentId ? [actor.agentId] : [];
    }

    const branchCode = await this.getActorBranchCode(actor);
    if (!branchCode) {
      throw new ForbiddenError('Branch Manager access requires a linked branch profile.');
    }

    const rows = await db
      .select({ id: agentProfiles.id })
      .from(agentProfiles)
      .where(and(eq(agentProfiles.branchCode, branchCode), isNull(agentProfiles.deletedAtUtc)));

    return rows.map((row) => row.id);
  }

  private assertAdmin(actor: AuthTokenPayload) {
    if (actor.role !== 'Admin') {
      throw new ForbiddenError('Admin access required.');
    }
  }

  private async getReportScope(actor: AuthTokenPayload, requestedBranchCode?: string) {
    if (actor.role === 'Admin') {
      return {
        branchCode: requestedBranchCode ?? null,
        agentIds: null as string[] | null,
      };
    }

    if (actor.role === 'Agent') {
      return {
        branchCode: null,
        agentIds: actor.agentId ? [actor.agentId] : [],
      };
    }

    const branchCode = await this.getActorBranchCode(actor);
    if (!branchCode) {
      throw new ForbiddenError('Branch Manager access requires a linked branch profile.');
    }

    if (requestedBranchCode && requestedBranchCode !== branchCode) {
      throw new ForbiddenError('Branch Managers can only export reports for their own branch.');
    }

    const agentIds = await this.getScopedAgentIds(actor);
    return {
      branchCode,
      agentIds,
    };
  }

  async getSummary(actor: AuthTokenPayload) {
    this.assertAdmin(actor);

    const recordMonth = currentRecordMonth();

    const [policyCounts, metricRows, validationRows, lapsationRows, recruitmentRows] = await Promise.all([
      db.select({ issued: sql<number>`count(*)::int` }).from(policies),
      db
        .select({
          totalNap: sql<string>`coalesce(sum(${performanceMetrics.api}), 0)::text`,
          totalApe: sql<string>`coalesce(sum(${performanceMetrics.modalPremium}), 0)::text`,
        })
        .from(performanceMetrics)
        .where(eq(performanceMetrics.recordMonth, recordMonth)),
      db
        .select({
          active: sql<number>`count(*) filter (where ${dataValidationIssues.status} = 'Open')::int`,
        })
        .from(dataValidationIssues),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(policies)
        .where(inArray(policies.policyStatus, ['At Risk', 'Lapsed'])),
      db
        .select({
          count: sql<number>`count(*) filter (where ${recRecruitment.status} in ('Active', 'Reinstated'))::int`,
        })
        .from(recRecruitment),
    ]);

    return {
      generatedAtUtc: new Date().toISOString(),
      cards: {
        policiesIssued: policyCounts[0]?.issued ?? 0,
        totalNap: Number(metricRows[0]?.totalNap ?? '0'),
        totalApeApi: Number(metricRows[0]?.totalApe ?? '0') + Number(metricRows[0]?.totalNap ?? '0'),
        activeValidationIssues: validationRows[0]?.active ?? 0,
        lapsedOrAtRiskPolicies: lapsationRows[0]?.count ?? 0,
        recruitmentCount: recruitmentRows[0]?.count ?? 0,
      },
    };
  }

  async listValidationIssues(query: ListDataValidationIssuesQuery, actor: AuthTokenPayload) {
    this.assertAdmin(actor);

    const conditions = [];
    if (query.module) conditions.push(eq(dataValidationIssues.module, query.module));
    if (query.severity) conditions.push(eq(dataValidationIssues.severity, query.severity));
    if (query.status) conditions.push(eq(dataValidationIssues.status, query.status));
    if (query.entityName) conditions.push(eq(dataValidationIssues.entityName, query.entityName));
    if (query.entityId) conditions.push(eq(dataValidationIssues.entityId, query.entityId));
    if (query.dateFrom) {
      conditions.push(gte(dataValidationIssues.createdAtUtc, new Date(`${query.dateFrom}T00:00:00.000Z`)));
    }
    if (query.dateTo) {
      conditions.push(lte(dataValidationIssues.createdAtUtc, new Date(`${query.dateTo}T23:59:59.999Z`)));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: dataValidationIssues.id,
          module: dataValidationIssues.module,
          entityName: dataValidationIssues.entityName,
          entityId: dataValidationIssues.entityId,
          issueCode: dataValidationIssues.issueCode,
          severity: dataValidationIssues.severity,
          status: dataValidationIssues.status,
          details: dataValidationIssues.details,
          recommendedFix: dataValidationIssues.recommendedFix,
          rawPayload: dataValidationIssues.rawPayload,
          createdAtUtc: dataValidationIssues.createdAtUtc,
          updatedAtUtc: dataValidationIssues.updatedAtUtc,
          resolvedAtUtc: dataValidationIssues.resolvedAtUtc,
          createdByFirstName: userAccounts.firstName,
          createdByLastName: userAccounts.lastName,
        })
        .from(dataValidationIssues)
        .leftJoin(userAccounts, eq(dataValidationIssues.createdByUserId, userAccounts.id))
        .where(whereClause)
        .orderBy(desc(dataValidationIssues.createdAtUtc), desc(dataValidationIssues.updatedAtUtc))
        .limit(query.pageSize)
        .offset(offset),
      db.select({ total: count() }).from(dataValidationIssues).where(whereClause),
    ]);

    const total = totals[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    return {
      data: rows.map((row) => ({
        ...row,
        createdAtUtc: row.createdAtUtc.toISOString(),
        updatedAtUtc: row.updatedAtUtc.toISOString(),
        resolvedAtUtc: row.resolvedAtUtc?.toISOString() ?? null,
        createdByName: fullName(row.createdByFirstName, row.createdByLastName),
      })),
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async updateValidationIssue(id: string, input: UpdateDataValidationIssue, actor: AuthTokenPayload) {
    this.assertAdmin(actor);

    const [existing] = await db.select().from(dataValidationIssues).where(eq(dataValidationIssues.id, id)).limit(1);
    if (!existing) {
      throw new NotFoundError('Validation issue not found.');
    }

    const [updated] = await withDbTransaction('data-validation-issue.update', async (tx) => {
      const [row] = await tx
        .update(dataValidationIssues)
        .set({
          status: input.status,
          recommendedFix:
            input.recommendedFix !== undefined ? input.recommendedFix ?? null : existing.recommendedFix,
          resolvedByUserId: input.status === 'Open' ? null : actor.sub,
          resolvedAtUtc: input.status === 'Open' ? null : new Date(),
          updatedAtUtc: new Date(),
        })
        .where(eq(dataValidationIssues.id, id))
        .returning();

      await logSystemAudit(
        {
          action: `validation-issue.${input.status.toLowerCase()}`,
          userId: actor.sub,
          entityName: 'DataValidationIssue',
          resourceId: row.id,
          oldValue: {
            status: existing.status,
            recommendedFix: existing.recommendedFix,
          },
          newValue: {
            status: row.status,
            recommendedFix: row.recommendedFix,
            entityName: row.entityName,
            entityId: row.entityId,
            module: row.module,
          },
        },
        tx,
      );

      return [row];
    });

    return {
      ...updated,
      createdAtUtc: updated.createdAtUtc.toISOString(),
      updatedAtUtc: updated.updatedAtUtc.toISOString(),
      resolvedAtUtc: updated.resolvedAtUtc?.toISOString() ?? null,
    };
  }

  async listAuditFeed(query: ListAuditFeedQuery, actor: AuthTokenPayload) {
    this.assertAdmin(actor);

    const conditions = [];
    if (query.entityName) conditions.push(eq(systemAuditLogs.entityName, query.entityName));
    if (query.entityId) conditions.push(eq(systemAuditLogs.entityId, query.entityId));
    if (query.dateFrom) {
      conditions.push(gte(systemAuditLogs.createdAt, new Date(`${query.dateFrom}T00:00:00.000Z`)));
    }
    if (query.dateTo) {
      conditions.push(lte(systemAuditLogs.createdAt, new Date(`${query.dateTo}T23:59:59.999Z`)));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.pageSize;

    const [rows, totals] = await Promise.all([
      db
        .select({
          id: systemAuditLogs.id,
          action: systemAuditLogs.action,
          entityName: systemAuditLogs.entityName,
          entityId: systemAuditLogs.entityId,
          oldValue: systemAuditLogs.oldValue,
          newValue: systemAuditLogs.newValue,
          createdAtUtc: systemAuditLogs.createdAt,
          actorFirstName: userAccounts.firstName,
          actorLastName: userAccounts.lastName,
        })
        .from(systemAuditLogs)
        .leftJoin(userAccounts, eq(systemAuditLogs.actorUserId, userAccounts.id))
        .where(whereClause)
        .orderBy(desc(systemAuditLogs.createdAt))
        .limit(query.pageSize)
        .offset(offset),
      db.select({ total: count() }).from(systemAuditLogs).where(whereClause),
    ]);

    const total = totals[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));

    return {
      data: rows.map((row) => ({
        ...row,
        createdAtUtc: row.createdAtUtc.toISOString(),
        actorName: fullName(row.actorFirstName, row.actorLastName),
      })),
      meta: {
        total,
        page: query.page,
        pageSize: query.pageSize,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    };
  }

  async listEntityAuditTimeline(entityName: string, entityId: string, actor: AuthTokenPayload) {
    this.assertAdmin(actor);

    const rows = await db
      .select({
        id: systemAuditLogs.id,
        action: systemAuditLogs.action,
        entityName: systemAuditLogs.entityName,
        entityId: systemAuditLogs.entityId,
        oldValue: systemAuditLogs.oldValue,
        newValue: systemAuditLogs.newValue,
        createdAtUtc: systemAuditLogs.createdAt,
        actorFirstName: userAccounts.firstName,
        actorLastName: userAccounts.lastName,
      })
      .from(systemAuditLogs)
      .leftJoin(userAccounts, eq(systemAuditLogs.actorUserId, userAccounts.id))
      .where(and(eq(systemAuditLogs.entityName, entityName), eq(systemAuditLogs.entityId, entityId)))
      .orderBy(desc(systemAuditLogs.createdAt));

    return {
      data: rows.map((row) => ({
        ...row,
        createdAtUtc: row.createdAtUtc.toISOString(),
        actorName: fullName(row.actorFirstName, row.actorLastName),
      })),
    };
  }

  async exportCsvReport(query: ExportReportQuery, actor: AuthTokenPayload) {
    const scope = await this.getReportScope(actor, query.branchCode);

    switch (query.reportType) {
      case 'policy-list':
        return this.exportPolicyList(scope.branchCode, scope.agentIds, query);
      case 'nap-transactions':
        return this.exportNapTransactions(scope.branchCode, scope.agentIds, query);
      case 'recruitment':
        return this.exportRecruitment(scope.branchCode, scope.agentIds, query);
      case 'persistency':
        return this.exportPersistency(scope.branchCode, scope.agentIds, query);
      case 'lapsed-at-risk-policies':
        return this.exportLapsedAtRiskPolicies(scope.branchCode, scope.agentIds, query);
      case 'agent-leaderboard':
        return this.exportAgentLeaderboard(actor, query);
      case 'branch-summary':
        return this.exportBranchSummary(actor, query);
      default:
        throw new NotFoundError('Report type not supported.');
    }
  }

  private async exportPolicyList(branchCode: string | null, agentIds: string[] | null, query: ExportReportQuery) {
    const conditions = [];
    if (branchCode) conditions.push(eq(policies.branchCode, branchCode));
    if (agentIds) {
      if (agentIds.length === 0) {
        return csvRow(['Policy Number', 'Policy Owner', 'Agent', 'Branch', 'Plan Code', 'Status', 'First Issue Date']);
      }
      conditions.push(inArray(policies.assignedAgentId, agentIds));
    }
    if (query.dateFrom) conditions.push(gte(policies.firstIssueDate, query.dateFrom));
    if (query.dateTo) conditions.push(lte(policies.firstIssueDate, query.dateTo));

    const rows = await db
      .select({
        policyNumber: policies.policyNumber,
        policyOwnerName: policies.policyOwnerName,
        branchCode: policies.branchCode,
        planCode: policies.planCode,
        policyStatus: policies.policyStatus,
        firstIssueDate: policies.firstIssueDate,
        agentFirstName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
      })
      .from(policies)
      .leftJoin(agentProfiles, eq(policies.assignedAgentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(policies.policyNumber));

    return [
      csvRow(['Policy Number', 'Policy Owner', 'Agent', 'Branch', 'Plan Code', 'Status', 'First Issue Date']),
      ...rows.map((row) =>
        csvRow([
          row.policyNumber,
          row.policyOwnerName,
          fullName(row.agentFirstName, row.agentLastName),
          row.branchCode,
          row.planCode,
          row.policyStatus,
          row.firstIssueDate,
        ]),
      ),
    ].join('\n');
  }

  private async exportNapTransactions(branchCode: string | null, agentIds: string[] | null, query: ExportReportQuery) {
    const conditions = [];
    if (branchCode) conditions.push(eq(napTransactions.branchCode, branchCode));
    if (agentIds) {
      if (agentIds.length === 0) {
        return csvRow(['Policy Number', 'Agent', 'Branch', 'Transaction Type', 'Transaction Date', 'API', 'Credit Status']);
      }
      conditions.push(inArray(napTransactions.agentId, agentIds));
    }
    if (query.dateFrom) conditions.push(gte(napTransactions.transactionDate, new Date(`${query.dateFrom}T00:00:00.000Z`)));
    if (query.dateTo) conditions.push(lte(napTransactions.transactionDate, new Date(`${query.dateTo}T23:59:59.999Z`)));

    const rows = await db
      .select({
        policyNumber: napTransactions.policyNumber,
        branchCode: napTransactions.branchCode,
        transactionType: napTransactions.transactionType,
        transactionDate: napTransactions.transactionDate,
        api: napTransactions.api,
        creditStatus: napTransactions.creditStatus,
        agentFirstName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
      })
      .from(napTransactions)
      .leftJoin(agentProfiles, eq(napTransactions.agentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(napTransactions.transactionDate));

    return [
      csvRow(['Policy Number', 'Agent', 'Branch', 'Transaction Type', 'Transaction Date', 'API', 'Credit Status']),
      ...rows.map((row) =>
        csvRow([
          row.policyNumber,
          fullName(row.agentFirstName, row.agentLastName),
          row.branchCode,
          row.transactionType,
          row.transactionDate.toISOString(),
          row.api,
          row.creditStatus,
        ]),
      ),
    ].join('\n');
  }

  private async exportRecruitment(branchCode: string | null, agentIds: string[] | null, query: ExportReportQuery) {
    const conditions = [];
    if (branchCode) conditions.push(eq(agentProfiles.branchCode, branchCode));
    if (agentIds) {
      if (agentIds.length === 0) {
        return csvRow(['Agent', 'Agent Code', 'Recruiter', 'Team', 'Status', 'Date Appointed', 'Date Terminated']);
      }
      conditions.push(inArray(recRecruitment.agentId, agentIds));
    }
    if (query.dateFrom) conditions.push(gte(recRecruitment.dateAppointed, new Date(`${query.dateFrom}T00:00:00.000Z`)));
    if (query.dateTo) conditions.push(lte(recRecruitment.dateAppointed, new Date(`${query.dateTo}T23:59:59.999Z`)));

    const rows = await db
      .select({
        agentName: recRecruitment.agentName,
        agentCode: recRecruitment.agentCode,
        recruiter: recRecruitment.recruiter,
        team: recRecruitment.team,
        status: recRecruitment.status,
        dateAppointed: recRecruitment.dateAppointed,
        dateTerminated: recRecruitment.dateTerminated,
      })
      .from(recRecruitment)
      .leftJoin(agentProfiles, eq(recRecruitment.agentId, agentProfiles.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(recRecruitment.dateAppointed));

    return [
      csvRow(['Agent', 'Agent Code', 'Recruiter', 'Team', 'Status', 'Date Appointed', 'Date Terminated']),
      ...rows.map((row) =>
        csvRow([
          row.agentName,
          row.agentCode,
          row.recruiter,
          row.team,
          row.status,
          row.dateAppointed.toISOString(),
          row.dateTerminated?.toISOString() ?? null,
        ]),
      ),
    ].join('\n');
  }

  private async exportPersistency(branchCode: string | null, agentIds: string[] | null, query: ExportReportQuery) {
    const conditions = [];
    if (branchCode) conditions.push(eq(perPerformance.branchCode, branchCode));
    if (agentIds) {
      if (agentIds.length === 0) {
        return csvRow(['Agent', 'Agent Code', 'Branch', 'Record Month', 'Personal Persistency', 'Unit Persistency', 'Branch Persistency']);
      }
      conditions.push(inArray(perPerformance.agentId, agentIds));
    }
    if (query.recordMonth) conditions.push(eq(perPerformance.recordMonth, query.recordMonth));

    const rows = await db
      .select({
        agentCode: agentProfiles.agentCode,
        agentName: agentProfiles.displayName,
        branchCode: perPerformance.branchCode,
        recordMonth: perPerformance.recordMonth,
        personalPersistency: perPerformance.personalPersistency,
        unitPersistency: perPerformance.unitPersistency,
        branchPersistency: perPerformance.branchPersistency,
      })
      .from(perPerformance)
      .innerJoin(agentProfiles, eq(perPerformance.agentId, agentProfiles.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(perPerformance.recordMonth), asc(agentProfiles.displayName));

    return [
      csvRow(['Agent', 'Agent Code', 'Branch', 'Record Month', 'Personal Persistency', 'Unit Persistency', 'Branch Persistency']),
      ...rows.map((row) =>
        csvRow([
          row.agentName,
          row.agentCode,
          row.branchCode,
          row.recordMonth,
          row.personalPersistency,
          row.unitPersistency,
          row.branchPersistency,
        ]),
      ),
    ].join('\n');
  }

  private async exportLapsedAtRiskPolicies(branchCode: string | null, agentIds: string[] | null, query: ExportReportQuery) {
    const conditions = [inArray(policies.policyStatus, ['At Risk', 'Lapsed'])];
    if (branchCode) conditions.push(eq(policies.branchCode, branchCode));
    if (agentIds) {
      if (agentIds.length === 0) {
        return csvRow(['Policy Number', 'Policy Owner', 'Agent', 'Branch', 'Status', 'Issue Date']);
      }
      conditions.push(inArray(policies.assignedAgentId, agentIds));
    }
    if (query.dateFrom) conditions.push(gte(policies.firstIssueDate, query.dateFrom));
    if (query.dateTo) conditions.push(lte(policies.firstIssueDate, query.dateTo));

    const rows = await db
      .select({
        policyNumber: policies.policyNumber,
        policyOwnerName: policies.policyOwnerName,
        branchCode: policies.branchCode,
        policyStatus: policies.policyStatus,
        firstIssueDate: policies.firstIssueDate,
        agentFirstName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
      })
      .from(policies)
      .leftJoin(agentProfiles, eq(policies.assignedAgentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(and(...conditions))
      .orderBy(asc(policies.policyNumber));

    return [
      csvRow(['Policy Number', 'Policy Owner', 'Agent', 'Branch', 'Status', 'Issue Date']),
      ...rows.map((row) =>
        csvRow([
          row.policyNumber,
          row.policyOwnerName,
          fullName(row.agentFirstName, row.agentLastName),
          row.branchCode,
          row.policyStatus,
          row.firstIssueDate,
        ]),
      ),
    ].join('\n');
  }

  private async exportAgentLeaderboard(actor: AuthTokenPayload, query: ExportReportQuery) {
    const recordMonth = query.recordMonth ?? currentRecordMonth();
    const year = Number(recordMonth.slice(0, 4));
    const month = Number(recordMonth.slice(5, 7));
    const leaderboard = await metricsService.getLeaderboard({ year, month }, actor);

    return [
      csvRow(['Agent', 'Branch', 'API', 'APE', 'Commission', 'Recruitment', 'Persistency Rate', 'Lapsation Count', 'Reinstatement Count', 'Score']),
      ...leaderboard.rows.map((row) =>
        csvRow([
          row.agentName,
          row.branchCode,
          row.api,
          row.modalPremium,
          row.commissionAmount,
          row.recruitmentCount,
          row.persistencyRate,
          row.lapsationCount,
          row.reinstatementCount,
          row.score,
        ]),
      ),
    ].join('\n');
  }

  private async exportBranchSummary(actor: AuthTokenPayload, query: ExportReportQuery) {
    if (actor.role === 'Agent') {
      throw new ForbiddenError('Agents cannot access branch summary reports.');
    }

    const recordMonth = query.recordMonth ?? currentRecordMonth();
    const year = Number(recordMonth.slice(0, 4));
    const month = Number(recordMonth.slice(5, 7));
    const leaderboard = await metricsService.getLeaderboard({ year, month }, actor);

    return [
      csvRow(['Branch', 'Total Sales', 'Total NAP', 'Total APE', 'Total Recruitment', 'Persistency Rate', 'Lapsation Count', 'Reinstatement Count', 'Active Agents']),
      ...leaderboard.branches.map((row) =>
        csvRow([
          row.branchCode,
          row.totalSales,
          row.totalNap,
          row.totalApe,
          row.totalRecruitment,
          row.persistencyRate,
          row.lapsationCount,
          row.reinstatementCount,
          row.activeAgents,
        ]),
      ),
    ].join('\n');
  }

  async ensureAdminDataAuditCoverage(actor: AuthTokenPayload) {
    this.assertAdmin(actor);

    const [policyAudit, napAudit, recruitmentAudit, persistencyAudit, planCodeAudit, statusAudit] = await Promise.all([
      db.select({ total: count() }).from(systemAuditLogs).where(ilike(systemAuditLogs.action, 'policy.%')),
      db.select({ total: count() }).from(systemAuditLogs).where(ilike(systemAuditLogs.action, 'nap-transaction.%')),
      db.select({ total: count() }).from(systemAuditLogs).where(ilike(systemAuditLogs.action, 'recruitment.%')),
      db.select({ total: count() }).from(systemAuditLogs).where(ilike(systemAuditLogs.action, 'persistency.%')),
      db.select({ total: count() }).from(systemAuditLogs).where(ilike(systemAuditLogs.action, 'plan-code.%')),
      db.select({ total: count() }).from(systemAuditLogs).where(eq(systemAuditLogs.action, 'policy.status-change')),
    ]);

    return {
      policyAuditEvents: policyAudit[0]?.total ?? 0,
      napAuditEvents: napAudit[0]?.total ?? 0,
      recruitmentAuditEvents: recruitmentAudit[0]?.total ?? 0,
      persistencyAuditEvents: persistencyAudit[0]?.total ?? 0,
      planCodeAuditEvents: planCodeAudit[0]?.total ?? 0,
      statusChangeAuditEvents: statusAudit[0]?.total ?? 0,
    };
  }
}

export const adminDataCenterService = new AdminDataCenterService();
