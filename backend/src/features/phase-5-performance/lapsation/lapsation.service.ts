import { and, desc, eq, ilike, inArray, isNull, lte, gte, or } from 'drizzle-orm';

import type {
  FollowUpStatus,
  LapsationDashboardResponse,
  LapsationRecordSummary,
  LapsationRiskLevel,
  ListLapsationAlertsQuery,
  PolicyStatus,
  ReinstateLapsationRecordResponse,
  UpdatePolicyStatusInput,
} from '@a1prime/schemas';
import { db, withDbTransaction } from '@/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  notifications,
  policies,
  policyStatusHistory,
  userAccounts,
} from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';

type PolicyAlertRow = {
  id: string;
  policyNumber: string;
  policyOwnerName: string | null;
  lifeInsuredName: string | null;
  branchCode: string;
  assignedAgentId: string | null;
  agentUserId: string | null;
  assignedAgentName: string | null;
  modalPremium: string;
  policyStatus: PolicyStatus;
  createdAtUtc: Date;
  historyId: string;
  effectiveAtUtc: Date;
  reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

const DEFAULT_AT_RISK_THRESHOLD_DAYS = 30;
const DASHBOARD_STATUSES: PolicyStatus[] = ['At Risk', 'Lapsed', 'Reinstated', 'Cancelled'];

function getAtRiskThresholdDays() {
  const parsed = Number.parseInt(process.env.LAPSATION_AT_RISK_DAYS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AT_RISK_THRESHOLD_DAYS;
}

function getRiskLevel(daysSinceLapse: number): LapsationRiskLevel {
  if (daysSinceLapse >= 90) {
    return 'Lapsed';
  }
  if (daysSinceLapse >= 60) {
    return 'Urgent';
  }
  return 'Warning';
}

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ').trim() || null;
}

function toFollowUpStatus(metadata: Record<string, unknown> | null): FollowUpStatus {
  const value = metadata?.followUpStatus;
  if (
    value === 'Open' ||
    value === 'In Progress' ||
    value === 'Resolved' ||
    value === 'Dismissed'
  ) {
    return value;
  }
  return 'Open';
}

function toEventType(status: PolicyStatus): 'AT_RISK' | 'LAPSED' | 'REINSTATED' | 'CANCELLED' | 'ACTIVE' {
  switch (status) {
    case 'At Risk':
      return 'AT_RISK';
    case 'Lapsed':
      return 'LAPSED';
    case 'Reinstated':
      return 'REINSTATED';
    case 'Cancelled':
      return 'CANCELLED';
    default:
      return 'ACTIVE';
  }
}

function toSummary(row: PolicyAlertRow): LapsationRecordSummary {
  const lapseDateUtc = row.policyStatus === 'Lapsed' ? row.effectiveAtUtc : null;
  const reinstatedAtUtc = row.policyStatus === 'Reinstated' ? row.effectiveAtUtc : null;
  const daysSinceLapse =
    lapseDateUtc === null
      ? null
      : Math.max(0, Math.floor((Date.now() - lapseDateUtc.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    id: row.historyId,
    policyId: row.id,
    policyNumber: row.policyNumber,
    policyOwnerName: row.policyOwnerName,
    lifeInsuredName: row.lifeInsuredName,
    clientName: row.policyOwnerName ?? row.lifeInsuredName ?? row.policyNumber,
    status: row.policyStatus,
    branchCode: row.branchCode,
    assignedAgentId: row.assignedAgentId,
    assignedAgentName: row.assignedAgentName ?? 'Unassigned',
    modalPremium: row.modalPremium,
    isAtRisk: row.policyStatus === 'At Risk',
    riskLevel: daysSinceLapse === null ? null : getRiskLevel(daysSinceLapse),
    followUpStatus: toFollowUpStatus(row.metadata),
    statusChangedAtUtc: row.effectiveAtUtc.toISOString(),
    lapseDateUtc: lapseDateUtc?.toISOString() ?? null,
    reinstatedAtUtc: reinstatedAtUtc?.toISOString() ?? null,
    reason: row.reason,
    notes: row.notes,
    createdAtUtc: row.createdAtUtc.toISOString(),
    daysSinceLapse,
  };
}

export class LapsationService {
  private async getActorBranchCode(actorUser: AuthTokenPayload) {
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

  private async getScopedPolicy(actorUser: AuthTokenPayload, policyId: string) {
    if (actorUser.role === 'Agent') {
      throw new ForbiddenError('Agents cannot manage policy status.');
    }

    const [existing] = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        assignedAgentId: policies.assignedAgentId,
        branchCode: policies.branchCode,
        policyStatus: policies.policyStatus,
        policyOwnerName: policies.policyOwnerName,
      })
      .from(policies)
      .where(eq(policies.id, policyId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Policy not found.');
    }

    if (actorUser.role === 'BranchManager') {
      const branchCode = await this.getActorBranchCode(actorUser);
      if (!branchCode) {
        throw new ForbiddenError('Branch Manager access requires a linked branch profile.');
      }
      if (existing.branchCode !== branchCode) {
        throw new ForbiddenError('Branch Managers can only manage policies in their own branch.');
      }
    }

    return existing;
  }

  private buildConditions(actorUser: AuthTokenPayload, branchCode: string | null, query: ListLapsationAlertsQuery) {
    const conditions = [inArray(policies.policyStatus, DASHBOARD_STATUSES)];

    if (actorUser.role === 'Agent') {
      if (!actorUser.agentId) {
        throw new ForbiddenError('Agents must be linked to an agent profile.');
      }
      conditions.push(eq(policies.assignedAgentId, actorUser.agentId));
    } else if (actorUser.role === 'BranchManager') {
      if (!branchCode) {
        throw new ForbiddenError('Branch Manager access requires a linked branch profile.');
      }
      conditions.push(eq(policies.branchCode, branchCode));
    }

    if (query.agentId && actorUser.role !== 'Agent') {
      conditions.push(eq(policies.assignedAgentId, query.agentId));
    }

    if (query.branchCode && actorUser.role === 'Admin') {
      conditions.push(eq(policies.branchCode, query.branchCode));
    }

    if (query.status) {
      conditions.push(eq(policies.policyStatus, query.status));
    }

    if (query.dateFrom) {
      conditions.push(gte(policyStatusHistory.effectiveAtUtc, new Date(`${query.dateFrom}T00:00:00.000Z`)));
    }

    if (query.dateTo) {
      conditions.push(lte(policyStatusHistory.effectiveAtUtc, new Date(`${query.dateTo}T23:59:59.999Z`)));
    }

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(policies.policyNumber, term),
          ilike(policies.policyOwnerName, term),
          ilike(policies.lifeInsuredName, term),
          ilike(agentProfiles.agentCode, term),
          ilike(userAccounts.firstName, term),
          ilike(userAccounts.lastName, term),
        )!,
      );
    }

    return conditions;
  }

  private async createStatusNotification(input: {
    policyId: string;
    policyNumber: string;
    policyOwnerName: string | null;
    assignedAgentId: string | null;
    status: PolicyStatus;
    reason: string;
    notes: string | null;
  }, tx: Parameters<Parameters<typeof withDbTransaction>[1]>[0]) {
    if (!input.assignedAgentId) {
      return;
    }

    const [agent] = await tx
      .select({ userId: agentProfiles.userId })
      .from(agentProfiles)
      .where(eq(agentProfiles.id, input.assignedAgentId))
      .limit(1);

    if (!agent?.userId) {
      return;
    }

    await tx.insert(notifications).values({
      userId: agent.userId,
      channel: 'in_app',
      subject: `Policy ${input.status}: ${input.policyNumber}`,
      message: `${input.policyOwnerName ?? 'Policy owner'} policy ${input.policyNumber} is now ${input.status}. ${input.reason}`,
      status: 'sent',
      metadata: JSON.stringify({
        policyId: input.policyId,
        policyNumber: input.policyNumber,
        status: input.status,
        reason: input.reason,
        notes: input.notes,
      }),
    });
  }

  async getDashboard(
    actorUser: AuthTokenPayload,
    query: ListLapsationAlertsQuery = {},
  ): Promise<LapsationDashboardResponse> {
    const branchCode = await this.getActorBranchCode(actorUser);
    const conditions = this.buildConditions(actorUser, branchCode, query);

    const rows = await db
      .select({
        id: policies.id,
        policyNumber: policies.policyNumber,
        policyOwnerName: policies.policyOwnerName,
        lifeInsuredName: policies.lifeInsuredName,
        branchCode: policies.branchCode,
        assignedAgentId: policies.assignedAgentId,
        agentUserId: agentProfiles.userId,
        assignedAgentName: userAccounts.firstName,
        agentLastName: userAccounts.lastName,
        modalPremium: policies.modalPremium,
        policyStatus: policies.policyStatus,
        createdAtUtc: policies.createdAtUtc,
        historyId: policyStatusHistory.id,
        effectiveAtUtc: policyStatusHistory.effectiveAtUtc,
        reason: policyStatusHistory.reason,
        notes: policyStatusHistory.notes,
        metadata: policyStatusHistory.metadata,
      })
      .from(policyStatusHistory)
      .innerJoin(policies, eq(policyStatusHistory.policyId, policies.id))
      .leftJoin(agentProfiles, eq(policies.assignedAgentId, agentProfiles.id))
      .leftJoin(userAccounts, eq(agentProfiles.userId, userAccounts.id))
      .where(and(...conditions, eq(policyStatusHistory.nextStatus, policies.policyStatus)))
      .orderBy(desc(policyStatusHistory.effectiveAtUtc), desc(policyStatusHistory.createdAtUtc))
      .limit(500);

    const summaries = rows
      .map((row) => ({
        ...row,
        assignedAgentName: fullName(row.assignedAgentName, row.agentLastName),
      }))
      .map(toSummary)
      .filter((row) => (query.followUpStatus ? row.followUpStatus === query.followUpStatus : true));

    const timelineRows = await db
      .select({
        id: policyStatusHistory.id,
        policyId: policies.id,
        policyNumber: policies.policyNumber,
        nextStatus: policyStatusHistory.nextStatus,
        effectiveAtUtc: policyStatusHistory.effectiveAtUtc,
        createdAtUtc: policyStatusHistory.createdAtUtc,
        reason: policyStatusHistory.reason,
        notes: policyStatusHistory.notes,
      })
      .from(policyStatusHistory)
      .innerJoin(policies, eq(policyStatusHistory.policyId, policies.id))
      .where(and(...conditions, inArray(policyStatusHistory.nextStatus, DASHBOARD_STATUSES)))
      .orderBy(desc(policyStatusHistory.effectiveAtUtc), desc(policyStatusHistory.createdAtUtc))
      .limit(30);

    const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

    return {
      generatedAtUtc: new Date().toISOString(),
      thresholdDays: getAtRiskThresholdDays(),
      scope: {
        role: actorUser.role,
        branchCode: actorUser.role === 'Admin' ? null : branchCode,
        agentId: actorUser.role === 'Agent' ? actorUser.agentId : null,
      },
      summary: {
        totalTracked: summaries.length,
        atRiskCount: summaries.filter((row) => row.status === 'At Risk').length,
        reinstatedYtd: summaries.filter(
          (row) => row.status === 'Reinstated' && new Date(row.statusChangedAtUtc) >= currentYearStart,
        ).length,
        criticalCount: summaries.filter((row) => row.status === 'Lapsed').length,
        lapsedCount: summaries.filter((row) => row.status === 'Lapsed').length,
      },
      records: summaries,
      timeline: timelineRows.map((row) => ({
        id: row.id,
        policyId: row.policyId,
        policyNumber: row.policyNumber,
        eventType: toEventType(row.nextStatus),
        effectiveAtUtc: row.effectiveAtUtc.toISOString(),
        createdAtUtc: row.createdAtUtc.toISOString(),
        reason: row.reason ?? null,
        notes: row.notes ?? null,
      })),
    };
  }

  async updatePolicyStatus(
    policyId: string,
    input: UpdatePolicyStatusInput,
    actorUser: AuthTokenPayload,
  ): Promise<LapsationRecordSummary> {
    const existing = await this.getScopedPolicy(actorUser, policyId);
    const effectiveAtUtc = input.effectiveAtUtc ? new Date(input.effectiveAtUtc) : new Date();

    await withDbTransaction('policy-status.update', async (tx) => {
      await tx
        .update(policies)
        .set({
          policyStatus: input.status,
          updatedByUserId: actorUser.sub,
          updatedAtUtc: new Date(),
        })
        .where(eq(policies.id, policyId));

      await tx.insert(policyStatusHistory).values({
        policyId,
        changedByUserId: actorUser.sub,
        previousStatus: existing.policyStatus,
        nextStatus: input.status,
        effectiveAtUtc,
        reason: input.reason,
        notes: input.notes ?? null,
        metadata: {
          source: 'policy-status-automation',
          followUpStatus: input.followUpStatus,
        },
      });

      await this.createStatusNotification(
        {
          policyId,
          policyNumber: existing.policyNumber,
          policyOwnerName: existing.policyOwnerName,
          assignedAgentId: existing.assignedAgentId,
          status: input.status,
          reason: input.reason,
          notes: input.notes ?? null,
        },
        tx,
      );

      await logSystemAudit(
        {
          action: 'policy.status-change',
          userId: actorUser.sub,
          entityName: 'Policy',
          resourceId: policyId,
          oldValue: {
            policyStatus: existing.policyStatus,
          },
          newValue: {
            policyStatus: input.status,
            followUpStatus: input.followUpStatus,
            reason: input.reason,
          },
        },
        tx,
      );
    });

    const dashboard = await this.getDashboard(actorUser, { search: existing.policyNumber });
    const updated = dashboard.records.find((item) => item.policyId === policyId);
    if (!updated) {
      throw new NotFoundError('Updated policy status could not be loaded.');
    }
    return updated;
  }

  async reinstateRecord(
    policyId: string,
    actorUser: AuthTokenPayload,
    payload?: { reason?: string; notes?: string | null },
  ): Promise<ReinstateLapsationRecordResponse> {
    const reinstated = await this.updatePolicyStatus(
      policyId,
      {
        status: 'Reinstated',
        effectiveAtUtc: new Date().toISOString(),
        reason: payload?.reason?.trim() || 'Policy reinstated',
        notes: payload?.notes ?? null,
        followUpStatus: 'Resolved',
      },
      actorUser,
    );

    return {
      success: true,
      reinstatedAtUtc: reinstated.statusChangedAtUtc,
    };
  }
}

export const lapsationService = new LapsationService();
