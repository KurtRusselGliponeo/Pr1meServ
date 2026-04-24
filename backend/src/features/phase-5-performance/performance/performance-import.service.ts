import { and, eq, inArray, isNull } from 'drizzle-orm';
import type {
  ApeImportJobPayload,
  ApeImportRow,
  NapImportJobPayload,
  NapImportRow,
  PerImportJobPayload,
  PerImportRow,
  RecImportJobPayload,
  RecImportRow,
  CaseStatus,
} from '@a1prime/schemas';
import {
  ApeImportJobPayloadSchema,
  NapImportJobPayloadSchema,
  PerImportJobPayloadSchema,
  RecImportJobPayloadSchema,
} from '@a1prime/schemas';

import { withDbTransaction, type DbTransaction } from '@/db/client';
import { BusinessRuleError } from '@/lib/errors';
import {
  agentProfiles,
  clientProfiles,
  lapsationRecords,
  nap,
  notifications,
  performanceMetrics,
  policies,
  policyTransactions,
  userAccounts,
} from '@/schema';
import { importValidationService } from '@/features/imports/import-validation.service';
import { emailQueueService } from '@/features/notifications/email-queue.service';
import { decryptEmail } from '@/shared/lib/encryption';

const IMPORT_BATCH_SIZE = 200;
const DEFAULT_AT_RISK_THRESHOLD_DAYS = 30;

type MetricLikeRow = {
  agentId: string;
  recordMonth: string;
  modalPremium: number;
  api: number;
  sumAssured: number;
  commissionAmount: number;
};

type ExistingMetricRow = {
  id: string;
  agentId: string;
  recordMonth: string;
  modalPremium: string;
  api: string;
  sumAssured: string;
  commissionAmount: string;
};

type ExistingLapsationRow = {
  id: string;
  isAtRisk: boolean;
  reinstatedAtUtc: Date | null;
  lapseDateUtc: Date;
};

function chunkRows<T>(rows: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks;
}

function toMetricInsertValues(rows: MetricLikeRow[]) {
  const timestamp = new Date();

  return rows.map((row) => ({
    agentId: row.agentId,
    recordMonth: row.recordMonth,
    modalPremium: row.modalPremium.toFixed(4),
    api: row.api.toFixed(4),
    sumAssured: row.sumAssured.toFixed(4),
    commissionAmount: row.commissionAmount.toFixed(4),
    recruitmentCount: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

function isNapLapseRow(row: NapImportRow): boolean {
  return (
    row.transactionType?.trim().toUpperCase() === 'LAPSE' &&
    row.creditStatus?.trim().toUpperCase() === 'DEBIT' &&
    Boolean(row.policyNumberId)
  );
}

function isNapReinstatementRow(row: NapImportRow): boolean {
  return (
    row.transactionType?.trim().toUpperCase() === 'REINSTATEMENT' &&
    row.creditStatus?.trim().toUpperCase() === 'DEBIT' &&
    Boolean(row.policyNumberId)
  );
}

function metricKey(row: Pick<MetricLikeRow, 'agentId' | 'recordMonth'>): string {
  return `${row.agentId}::${row.recordMonth}`;
}

function aggregateRows<T extends MetricLikeRow>(rows: T[]): MetricLikeRow[] {
  const aggregate = new Map<string, MetricLikeRow>();

  for (const row of rows) {
    const key = metricKey(row);
    const existing = aggregate.get(key);

    if (existing) {
      existing.modalPremium += row.modalPremium;
      existing.api += row.api;
      existing.sumAssured += row.sumAssured;
      existing.commissionAmount += row.commissionAmount;
      continue;
    }

    aggregate.set(key, { ...row });
  }

  return [...aggregate.values()];
}

async function findExistingMetrics(
  tx: DbTransaction,
  rows: MetricLikeRow[],
): Promise<Map<string, ExistingMetricRow>> {
  const agentIds = [...new Set(rows.map((row) => row.agentId))];
  const recordMonths = [...new Set(rows.map((row) => row.recordMonth))];

  const existingRows = await tx
    .select({
      id: performanceMetrics.id,
      agentId: performanceMetrics.agentId,
      recordMonth: performanceMetrics.recordMonth,
      modalPremium: performanceMetrics.modalPremium,
      api: performanceMetrics.api,
      sumAssured: performanceMetrics.sumAssured,
      commissionAmount: performanceMetrics.commissionAmount,
    })
    .from(performanceMetrics)
    .where(
      and(
        inArray(performanceMetrics.agentId, agentIds),
        inArray(performanceMetrics.recordMonth, recordMonths),
      ),
    );

  return new Map(existingRows.map((row) => [metricKey(row), row]));
}

function getAtRiskThresholdDays() {
  const parsed = Number.parseInt(process.env.LAPSATION_AT_RISK_DAYS ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AT_RISK_THRESHOLD_DAYS;
}

function diffInDays(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

function getRiskLevelForDays(daysSinceLapse: number): 'Warning' | 'Urgent' | 'Lapsed' {
  if (daysSinceLapse >= 90) {
    return 'Lapsed';
  }

  if (daysSinceLapse >= 60) {
    return 'Urgent';
  }

  return 'Warning';
}

/**
 * Processes queue-driven performance import workloads for NAP, PER, and APE files.
 */
export class PerformanceImportService {
  /**
   * Processes a validated NAP import payload and inserts production rows in chunked batches.
   *
   * @param payload Raw NAP queue payload.
   * @returns The number of inserted rows.
   * @throws {BusinessRuleError} When the payload is empty.
   */
  async processNapImport(payload: NapImportJobPayload): Promise<{ insertedRows: number }> {
    const parsedPayload = NapImportJobPayloadSchema.parse(payload) as NapImportJobPayload;

    if (parsedPayload.rows.length === 0) {
      await importValidationService.recordIssue({
        sourceType: 'NAP',
        issueCode: 'EMPTY_IMPORT',
        details: 'NAP import requires at least one row.',
      });
      throw new BusinessRuleError('NAP import requires at least one row.');
    }

    let insertedRows = 0;

    for (const chunk of chunkRows(parsedPayload.rows as NapImportRow[], IMPORT_BATCH_SIZE)) {
      await withDbTransaction('imports.nap.batch-insert', async (tx) => {
        await this.insertNapTransactions(tx, chunk);
        await tx.insert(performanceMetrics).values(toMetricInsertValues(chunk));
        await this.applyNapLapsationTransitions(tx, chunk);
      });
      insertedRows += chunk.length;
    }

    return { insertedRows };
  }

  async processRecImport(payload: RecImportJobPayload): Promise<{ updatedRows: number }> {
    const parsedPayload = RecImportJobPayloadSchema.parse(payload) as RecImportJobPayload;
    let updatedRows = 0;

    for (const chunk of chunkRows(parsedPayload.rows as RecImportRow[], IMPORT_BATCH_SIZE)) {
      await withDbTransaction('imports.rec.batch-update', async (tx) => {
        updatedRows += await this.applyRecruitmentUpdates(tx, chunk);
      });
    }

    return { updatedRows };
  }

  /**
   * Processes a validated PER import payload and updates existing monthly performance rows safely.
   *
   * @param payload Raw PER queue payload.
   * @returns The number of updated rows.
   * @throws {BusinessRuleError} When imported rows do not map to existing metrics.
   */
  async processPerImport(payload: PerImportJobPayload): Promise<{ updatedRows: number }> {
    const parsedPayload = PerImportJobPayloadSchema.parse(payload) as PerImportJobPayload;
    let updatedRows = 0;

    for (const chunk of chunkRows(parsedPayload.rows as PerImportRow[], IMPORT_BATCH_SIZE)) {
      await withDbTransaction('imports.per.batch-update', async (tx) => {
        updatedRows += await this.applyExistingMetricUpdates(tx, chunk, 'PER');
      });
    }

    return { updatedRows };
  }

  /**
   * Processes a validated APE import payload and aggregates monthly totals before persisting them.
   *
   * @param payload Raw APE queue payload.
   * @returns Counts for updated and inserted aggregate rows.
   */
  async processApeImport(
    payload: ApeImportJobPayload,
  ): Promise<{ updatedRows: number; insertedRows: number }> {
    const parsedPayload = ApeImportJobPayloadSchema.parse(payload) as ApeImportJobPayload;
    const aggregatedRows = aggregateRows(parsedPayload.rows);
    let updatedRows = 0;
    let insertedRows = 0;

    for (const chunk of chunkRows(aggregatedRows as MetricLikeRow[], IMPORT_BATCH_SIZE)) {
      await withDbTransaction('imports.ape.aggregate-update', async (tx) => {
        const existingRows = await findExistingMetrics(tx, chunk);
        const rowsToInsert: MetricLikeRow[] = [];

        for (const row of chunk) {
          const existing = existingRows.get(metricKey(row));

          if (!existing) {
            rowsToInsert.push(row);
            continue;
          }

          await tx
            .update(performanceMetrics)
            .set({
              modalPremium: (Number(existing.modalPremium) + row.modalPremium).toFixed(4),
              api: (Number(existing.api) + row.api).toFixed(4),
              sumAssured: (Number(existing.sumAssured) + row.sumAssured).toFixed(4),
              commissionAmount: (Number(existing.commissionAmount) + row.commissionAmount).toFixed(
                4,
              ),
              updatedAt: new Date(),
            })
            .where(eq(performanceMetrics.id, existing.id));
          updatedRows += 1;
        }

        if (rowsToInsert.length > 0) {
          await tx.insert(performanceMetrics).values(toMetricInsertValues(rowsToInsert));
          insertedRows += rowsToInsert.length;
        }
      });
    }

    return { updatedRows, insertedRows };
  }

  private async applyExistingMetricUpdates(
    tx: DbTransaction,
    rows: PerImportRow[] | ApeImportRow[],
    importType: 'PER' | 'APE',
  ): Promise<number> {
    const existingRows = await findExistingMetrics(tx, rows);
    let updatedRows = 0;

    for (const row of rows) {
      const existing = existingRows.get(metricKey(row));

      if (!existing) {
        await importValidationService.recordIssue({
          sourceType: importType,
          issueCode: 'MISSING_METRIC_ROW',
          details: `${importType} import could not find an existing metric row for ${row.agentId} ${row.recordMonth}.`,
          externalKey: `${row.agentId}:${row.recordMonth}`,
          rawPayload: row,
        });
        throw new BusinessRuleError(
          `${importType} import could not find an existing metric row for ${row.agentId} ${row.recordMonth}.`,
        );
      }

      await tx
        .update(performanceMetrics)
        .set({
          modalPremium: row.modalPremium.toFixed(4),
          api: row.api.toFixed(4),
          sumAssured: row.sumAssured.toFixed(4),
          commissionAmount: row.commissionAmount.toFixed(4),
          updatedAt: new Date(),
        })
        .where(eq(performanceMetrics.id, existing.id));

      updatedRows += 1;
    }

    return updatedRows;
  }

  private async applyRecruitmentUpdates(tx: DbTransaction, rows: RecImportRow[]): Promise<number> {
    const existingRows = await tx
      .select({
        id: performanceMetrics.id,
        agentId: performanceMetrics.agentId,
        recordMonth: performanceMetrics.recordMonth,
      })
      .from(performanceMetrics)
      .where(
        and(
          inArray(
            performanceMetrics.agentId,
            [...new Set(rows.map((row) => row.agentId))],
          ),
          inArray(
            performanceMetrics.recordMonth,
            [...new Set(rows.map((row) => row.recordMonth))],
          ),
        ),
      );
    const existingMap = new Map(existingRows.map((row) => [metricKey(row), row]));
    let updatedRows = 0;

    for (const row of rows) {
      const existing = existingMap.get(metricKey(row));

      if (!existing) {
        await tx.insert(performanceMetrics).values({
          agentId: row.agentId,
          recordMonth: row.recordMonth,
          modalPremium: '0.0000',
          api: '0.0000',
          sumAssured: '0.0000',
          commissionAmount: '0.0000',
          recruitmentCount: row.recruitmentCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } else {
        await tx
          .update(performanceMetrics)
          .set({
            recruitmentCount: row.recruitmentCount,
            updatedAt: new Date(),
          })
          .where(eq(performanceMetrics.id, existing.id));
      }

      updatedRows += 1;
    }

    return updatedRows;
  }

  private async applyNapLapsationTransitions(tx: DbTransaction, rows: NapImportRow[]) {
    const lapseRows = rows.filter(isNapLapseRow);
    const reinstatementRows = rows.filter(isNapReinstatementRow);
    const thresholdDays = getAtRiskThresholdDays();
    const now = new Date();

    for (const row of lapseRows) {
      const policyNumberId = row.policyNumberId!;
      const lapseDateUtc = row.lapseDateUtc ? new Date(row.lapseDateUtc) : new Date();
      const [policyRow] = await tx
        .select({
          id: policies.id,
          clientProfileId: policies.clientProfileId,
          policyNumber: policies.policyNumber,
          branchCode: policies.branchCode,
          assignedAgentId: clientProfiles.assignedAgentId,
          userId: agentProfiles.userId,
          encryptedEmail: userAccounts.encryptedEmail,
        })
        .from(policies)
        .innerJoin(clientProfiles, eq(clientProfiles.id, policies.clientProfileId))
        .leftJoin(
          agentProfiles,
          and(eq(agentProfiles.id, clientProfiles.assignedAgentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .leftJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
        .where(eq(policies.clientProfileId, policyNumberId))
        .limit(1);

      const [existing]: ExistingLapsationRow[] = await tx
        .select({
          id: lapsationRecords.id,
          isAtRisk: lapsationRecords.isAtRisk,
          reinstatedAtUtc: lapsationRecords.reinstatedAtUtc,
          lapseDateUtc: lapsationRecords.lapseDateUtc,
        })
        .from(lapsationRecords)
        .where(eq(lapsationRecords.policyNumberId, policyNumberId))
        .limit(1);

      const daysSinceLapse = diffInDays(lapseDateUtc, now);
      const becameAtRisk = daysSinceLapse >= thresholdDays;
      const nextRiskLevel = getRiskLevelForDays(daysSinceLapse);
      const previousRiskLevel =
        existing && !existing.reinstatedAtUtc
          ? getRiskLevelForDays(diffInDays(existing.lapseDateUtc, now))
          : null;

      if (existing) {
        await tx
          .update(lapsationRecords)
          .set({ isAtRisk: becameAtRisk, reinstatedAtUtc: null, lapseDateUtc })
          .where(eq(lapsationRecords.id, existing.id));
      } else {
        await tx.insert(lapsationRecords).values({
          policyNumberId,
          isAtRisk: becameAtRisk,
          lapseDateUtc,
          reinstatedAtUtc: null,
        });
      }

      await tx
        .update(clientProfiles)
        .set({ policyStatus: 'Lapsed', caseStatus: 'Returned' as CaseStatus, updatedAt: new Date() })
        .where(eq(clientProfiles.id, policyNumberId));

      if (policyRow) {
        await tx.insert(policyTransactions).values({
          policyId: policyRow.id,
          sourceType: 'NAP',
          transactionType: 'LAPSED',
          transactionStatus: row.creditStatus?.trim() || 'DEBIT',
          effectiveAtUtc: lapseDateUtc,
          payload: JSON.stringify(row),
        });

        if (!existing || existing.reinstatedAtUtc || previousRiskLevel !== 'Lapsed') {
          await this.notifyAssignedAgent(
            tx,
            policyRow.userId,
            policyRow.encryptedEmail,
            'Policy lapsed',
            `Policy ${policyRow.policyNumber} has been marked as lapsed from the latest NAP import.`,
            {
              policyNumberId,
              policyNumber: policyRow.policyNumber,
              branchCode: policyRow.branchCode,
              eventType: 'LAPSED',
              riskLevel: 'Lapsed',
            },
          );
        }

        if (becameAtRisk && (!existing || existing.reinstatedAtUtc || previousRiskLevel !== nextRiskLevel)) {
          await tx.insert(policyTransactions).values({
            policyId: policyRow.id,
            sourceType: 'NAP',
            transactionType: 'AT_RISK',
            transactionStatus: nextRiskLevel.toUpperCase(),
            effectiveAtUtc: lapseDateUtc,
            payload: JSON.stringify({ thresholdDays, source: 'NAP', row, riskLevel: nextRiskLevel }),
          });

          await this.notifyAssignedAgent(
            tx,
            policyRow.userId,
            policyRow.encryptedEmail,
            nextRiskLevel === 'Urgent' ? 'Policy urgently at risk' : 'Policy warning',
            nextRiskLevel === 'Urgent'
              ? `Policy ${policyRow.policyNumber} has reached the urgent lapsation state and needs immediate follow-up.`
              : `Policy ${policyRow.policyNumber} has entered the warning lapsation state.`,
            {
              policyNumberId,
              policyNumber: policyRow.policyNumber,
              branchCode: policyRow.branchCode,
              eventType: 'AT_RISK',
              thresholdDays,
              riskLevel: nextRiskLevel,
            },
          );
        }
      }
    }

    for (const row of reinstatementRows) {
      const policyNumberId = row.policyNumberId!;
      const reinstatedAtUtc = row.reinstatedAtUtc ? new Date(row.reinstatedAtUtc) : new Date();
      const [policyRow] = await tx
        .select({
          id: policies.id,
          policyNumber: policies.policyNumber,
          branchCode: policies.branchCode,
          userId: agentProfiles.userId,
          encryptedEmail: userAccounts.encryptedEmail,
        })
        .from(policies)
        .innerJoin(clientProfiles, eq(clientProfiles.id, policies.clientProfileId))
        .leftJoin(
          agentProfiles,
          and(eq(agentProfiles.id, clientProfiles.assignedAgentId), isNull(agentProfiles.deletedAtUtc)),
        )
        .leftJoin(userAccounts, eq(userAccounts.id, agentProfiles.userId))
        .where(eq(policies.clientProfileId, policyNumberId))
        .limit(1);

      await tx
        .update(lapsationRecords)
        .set({
          isAtRisk: false,
          reinstatedAtUtc,
        })
        .where(eq(lapsationRecords.policyNumberId, policyNumberId));

      await tx
        .update(clientProfiles)
        .set({ policyStatus: 'Active', updatedAt: new Date() })
        .where(eq(clientProfiles.id, policyNumberId));

      if (policyRow) {
        await tx.insert(policyTransactions).values({
          policyId: policyRow.id,
          sourceType: 'NAP',
          transactionType: 'REINSTATED',
          transactionStatus: row.creditStatus?.trim() || 'DEBIT',
          effectiveAtUtc: reinstatedAtUtc,
          payload: JSON.stringify(row),
        });

        await this.notifyAssignedAgent(
          tx,
          policyRow.userId,
          policyRow.encryptedEmail,
          'Policy reinstated',
          `Policy ${policyRow.policyNumber} has been reinstated and removed from the active lapsation queue.`,
          {
            policyNumberId,
            policyNumber: policyRow.policyNumber,
            branchCode: policyRow.branchCode,
            eventType: 'REINSTATED',
          },
        );
      }
    }
  }

  private async insertNapTransactions(tx: DbTransaction, rows: NapImportRow[]) {
    const agentIds = [...new Set(rows.map((row) => row.agentId))];
    const policyIds = [...new Set(rows.map((row) => row.policyNumberId).filter(Boolean) as string[])];

    const [agentRows, clientRows] = await Promise.all([
      tx
        .select({
          id: agentProfiles.id,
          agentCode: agentProfiles.agentCode,
          displayName: agentProfiles.displayName,
          branchCode: agentProfiles.branchCode,
        })
        .from(agentProfiles)
        .where(inArray(agentProfiles.id, agentIds)),
      policyIds.length === 0
        ? Promise.resolve([])
        : tx
            .select({
              id: clientProfiles.id,
              policyNumber: clientProfiles.policyNumber,
            })
            .from(clientProfiles)
            .where(inArray(clientProfiles.id, policyIds)),
    ]);

    const agentMap = new Map(agentRows.map((row) => [row.id, row]));
    const clientMap = new Map(clientRows.map((row) => [row.id, row.policyNumber]));

    await tx.insert(nap).values(
      rows.map((row) => {
        const agent = agentMap.get(row.agentId);
        const eventDate = row.lapseDateUtc ?? row.reinstatedAtUtc ?? `${row.recordMonth}-01T00:00:00.000Z`;

        return {
          agentCode: agent?.agentCode ?? null,
          agentName: agent?.displayName ?? null,
          policyNumber: row.policyNumberId ? clientMap.get(row.policyNumberId) ?? null : null,
          transactionDate: new Date(eventDate),
          transactionType: row.transactionType ?? 'UNKNOWN',
          api: row.api.toFixed(4),
          creditStatus: row.creditStatus ?? null,
          branchName: agent?.branchCode ?? null,
          updatedAtUtc: new Date(),
        };
      }),
    );
  }

  private async notifyAssignedAgent(
    tx: DbTransaction,
    userId: string | null | undefined,
    encryptedEmail: string | null | undefined,
    subject: string,
    message: string,
    metadata: Record<string, unknown>,
  ) {
    if (!userId) {
      return;
    }

    await tx.insert(notifications).values({
      userId,
      channel: 'in_app',
      subject,
      message,
      status: 'sent',
      metadata: JSON.stringify(metadata),
    });

    if (encryptedEmail) {
      await emailQueueService.enqueueEmail({
        to: decryptEmail(encryptedEmail),
        subject,
        text: message,
        metadata,
      });
    }
  }
}

export const performanceImportService = new PerformanceImportService();
