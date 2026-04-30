import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import type {
  LapsationDashboardResponse,
  LapsationRecordSummary,
  LapsationRiskLevel,
  ReinstateLapsationRecordResponse,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  agentProfiles,
  clientProfiles,
  lapsationRecords,
  policies,
  policyTransactions,
} from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';
import type { AuthTokenPayload } from '@/shared/lib/auth';

type LapsationRow = {
  id: string;
  policyNumberId: string;
  policyNumber: string;
  clientFirstName: string;
  clientLastName: string;
  branchCode: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  modalPremium: string;
  isAtRisk: boolean;
  lapseDateUtc: Date;
  reinstatedAtUtc: Date | null;
  createdAtUtc: Date;
};

const DEFAULT_AT_RISK_THRESHOLD_DAYS = 30;

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

function toSummary(row: LapsationRow): LapsationRecordSummary {
  const now = Date.now();
  const daysSinceLapse = Math.max(
    0,
    Math.floor((now - row.lapseDateUtc.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    id: row.id,
    policyNumberId: row.policyNumberId,
    policyNumber: row.policyNumber,
    clientName: `${row.clientFirstName} ${row.clientLastName}`.trim(),
    branchCode: row.branchCode,
    assignedAgentId: row.assignedAgentId,
    assignedAgentName: row.assignedAgentName ?? 'Unassigned',
    modalPremium: String(row.modalPremium),
    isAtRisk: row.isAtRisk,
    riskLevel: getRiskLevel(daysSinceLapse),
    lapseDateUtc: row.lapseDateUtc.toISOString(),
    reinstatedAtUtc: row.reinstatedAtUtc?.toISOString() ?? null,
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

  async getDashboard(actorUser: AuthTokenPayload): Promise<LapsationDashboardResponse> {
    const conditions = [];
    const branchCode = await this.getActorBranchCode(actorUser);

    if (actorUser.role === 'Agent' && actorUser.agentId) {
      conditions.push(eq(clientProfiles.assignedAgentId, actorUser.agentId));
    } else if (actorUser.role === 'BranchManager') {
      if (!branchCode) {
        throw new ForbiddenError('Branch Manager dashboard requires a linked branch profile.');
      }
      conditions.push(eq(clientProfiles.branchCode, branchCode));
    }

    const rows = await db
      .select({
        id: lapsationRecords.id,
        policyNumberId: lapsationRecords.policyNumberId,
        policyNumber: clientProfiles.policyNumber,
        clientFirstName: clientProfiles.firstName,
        clientLastName: clientProfiles.lastName,
        branchCode: clientProfiles.branchCode,
        assignedAgentId: clientProfiles.assignedAgentId,
        assignedAgentName: agentProfiles.displayName,
        modalPremium: clientProfiles.modalPremium,
        isAtRisk: lapsationRecords.isAtRisk,
        lapseDateUtc: lapsationRecords.lapseDateUtc,
        reinstatedAtUtc: lapsationRecords.reinstatedAtUtc,
        createdAtUtc: lapsationRecords.createdAtUtc,
      })
      .from(lapsationRecords)
      .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
      .leftJoin(
        agentProfiles,
        and(eq(agentProfiles.id, clientProfiles.assignedAgentId), isNull(agentProfiles.deletedAtUtc)),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(lapsationRecords.lapseDateUtc));

    const summaries = rows.map(toSummary);
    const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

    const policyIds = [...new Set(rows.map((row) => row.policyNumberId))];
    const timelineRows =
      policyIds.length === 0
        ? []
        : await db
            .select({
              id: policyTransactions.id,
              policyNumberId: policies.clientProfileId,
              policyNumber: policies.policyNumber,
              transactionType: policyTransactions.transactionType,
              effectiveAtUtc: policyTransactions.effectiveAtUtc,
              createdAtUtc: policyTransactions.createdAtUtc,
            })
            .from(policyTransactions)
            .innerJoin(policies, eq(policies.id, policyTransactions.policyId))
            .where(
              and(
                eq(policyTransactions.sourceType, 'NAP'),
                inArray(policies.clientProfileId, policyIds),
                inArray(policyTransactions.transactionType, ['AT_RISK', 'LAPSED', 'REINSTATED']),
              ),
            )
            .orderBy(desc(policyTransactions.effectiveAtUtc), desc(policyTransactions.createdAtUtc));

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
        atRiskCount: summaries.filter((row) => row.isAtRisk && !row.reinstatedAtUtc).length,
        reinstatedYtd: summaries.filter(
          (row) => row.reinstatedAtUtc && new Date(row.reinstatedAtUtc) >= currentYearStart,
        ).length,
        criticalCount: summaries.filter((row) => row.isAtRisk && !row.reinstatedAtUtc).length,
        lapsedCount: summaries.filter(
          (row) => !row.reinstatedAtUtc && row.riskLevel === 'Lapsed',
        ).length,
      },
      records: summaries,
      timeline: timelineRows.map((row) => ({
        id: row.id,
        policyNumberId: row.policyNumberId,
        policyNumber: row.policyNumber,
        eventType: row.transactionType as 'AT_RISK' | 'LAPSED' | 'REINSTATED',
        effectiveAtUtc: (row.effectiveAtUtc ?? row.createdAtUtc).toISOString(),
        createdAtUtc: row.createdAtUtc.toISOString(),
      })),
    };
  }

  async reinstateRecord(
    recordId: string,
    actorUser: AuthTokenPayload,
  ): Promise<ReinstateLapsationRecordResponse> {
    const branchCode = await this.getActorBranchCode(actorUser);
    const [existing] = await db
      .select({
        id: lapsationRecords.id,
        policyNumberId: lapsationRecords.policyNumberId,
        reinstatedAtUtc: lapsationRecords.reinstatedAtUtc,
        branchCode: clientProfiles.branchCode,
      })
      .from(lapsationRecords)
      .innerJoin(clientProfiles, eq(clientProfiles.id, lapsationRecords.policyNumberId))
      .where(eq(lapsationRecords.id, recordId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Lapsation record was not found.');
    }

    if (actorUser.role === 'BranchManager' && branchCode !== existing.branchCode) {
      throw new ForbiddenError('Branch Managers can only reinstate records in their own branch.');
    }

    const [policyRow] = await db
      .select({ id: policies.id })
      .from(policies)
      .where(eq(policies.clientProfileId, existing.policyNumberId))
      .limit(1);

    const reinstatedAtUtc = new Date();

    await db
      .update(lapsationRecords)
      .set({
        isAtRisk: false,
        reinstatedAtUtc,
      })
      .where(eq(lapsationRecords.id, recordId));

    if (policyRow) {
      await db.insert(policyTransactions).values({
        policyId: policyRow.id,
        sourceType: 'NAP',
        transactionType: 'REINSTATED',
        transactionStatus: 'MANUAL',
        effectiveAtUtc: reinstatedAtUtc,
        payload: JSON.stringify({ recordId, actorUserId: actorUser.sub }),
      });
    }

    await logSystemAudit({
      action: 'lapsation.reinstated',
      userId: actorUser.sub,
      entityName: 'LapsationRecord',
      resourceId: recordId,
      oldValue: {
        reinstatedAtUtc: existing.reinstatedAtUtc?.toISOString() ?? null,
      },
      newValue: {
        reinstatedAtUtc: reinstatedAtUtc.toISOString(),
      },
    });

    return {
      success: true,
      reinstatedAtUtc: reinstatedAtUtc.toISOString(),
    };
  }
}

export const lapsationService = new LapsationService();
