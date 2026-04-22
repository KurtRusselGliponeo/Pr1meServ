import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import type {
  LapsationDashboardResponse,
  LapsationRecordSummary,
  LapsationRiskLevel,
  ReinstateLapsationRecordResponse,
} from '@a1prime/schemas';
import { db } from '@/db/client';
import { NotFoundError } from '@/lib/errors';
import { agentProfiles, clientProfiles, lapsationRecords, userAccounts } from '@/schema';
import { logSystemAudit } from '@/shared/lib/audit';

type LapsationRow = {
  id: string;
  policyNumberId: string;
  policyNumber: string;
  clientFirstName: string;
  clientLastName: string;
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  modalPremium: string;
  isAtRisk: boolean;
  lapseDateUtc: Date;
  reinstatedAtUtc: Date | null;
  createdAtUtc: Date;
};

function getRiskLevel(daysSinceLapse: number): LapsationRiskLevel {
  if (daysSinceLapse >= 30) {
    return 'CRITICAL';
  }

  if (daysSinceLapse >= 14) {
    return 'HIGH';
  }

  if (daysSinceLapse >= 7) {
    return 'MEDIUM';
  }

  return 'LOW';
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
  async getDashboard(): Promise<LapsationDashboardResponse> {
    const rows = await db
      .select({
        id: lapsationRecords.id,
        policyNumberId: lapsationRecords.policyNumberId,
        policyNumber: clientProfiles.policyNumber,
        clientFirstName: clientProfiles.firstName,
        clientLastName: clientProfiles.lastName,
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
      .orderBy(desc(lapsationRecords.lapseDateUtc));

    const summaries = rows.map(toSummary);
    const currentYearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

    return {
      generatedAtUtc: new Date().toISOString(),
      summary: {
        totalTracked: summaries.length,
        atRiskCount: summaries.filter((row) => row.isAtRisk && !row.reinstatedAtUtc).length,
        reinstatedYtd: summaries.filter(
          (row) => row.reinstatedAtUtc && row.reinstatedAtUtc >= currentYearStart,
        ).length,
        criticalCount: summaries.filter(
          (row) => row.isAtRisk && !row.reinstatedAtUtc && row.riskLevel === 'CRITICAL',
        ).length,
      },
      records: summaries,
    };
  }

  async reinstateRecord(
    recordId: string,
    actorUserId: string,
  ): Promise<ReinstateLapsationRecordResponse> {
    const [existing] = await db
      .select({
        id: lapsationRecords.id,
        policyNumberId: lapsationRecords.policyNumberId,
        reinstatedAtUtc: lapsationRecords.reinstatedAtUtc,
      })
      .from(lapsationRecords)
      .where(eq(lapsationRecords.id, recordId))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Lapsation record was not found.');
    }

    const reinstatedAtUtc = new Date();

    await db
      .update(lapsationRecords)
      .set({
        isAtRisk: false,
        reinstatedAtUtc,
      })
      .where(eq(lapsationRecords.id, recordId));

    await logSystemAudit({
      action: 'lapsation.reinstated',
      userId: actorUserId,
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
