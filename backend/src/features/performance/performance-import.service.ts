import { and, eq, inArray } from 'drizzle-orm';
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

import { db, withDbTransaction, type DbTransaction } from '@/db/client';
import { BusinessRuleError } from '@/lib/errors';
import { clientProfiles, lapsationRecords, performanceMetrics } from '@/schema';

const IMPORT_BATCH_SIZE = 200;

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
    const parsedPayload = NapImportJobPayloadSchema.parse(payload);

    if (parsedPayload.rows.length === 0) {
      throw new BusinessRuleError('NAP import requires at least one row.');
    }

    let insertedRows = 0;

    for (const chunk of chunkRows(parsedPayload.rows, IMPORT_BATCH_SIZE)) {
      await withDbTransaction('imports.nap.batch-insert', async (tx) => {
        await tx.insert(performanceMetrics).values(toMetricInsertValues(chunk));
        await this.applyNapLapsationTransitions(tx, chunk);
      });
      insertedRows += chunk.length;
    }

    return { insertedRows };
  }

  async processRecImport(payload: RecImportJobPayload): Promise<{ updatedRows: number }> {
    const parsedPayload = RecImportJobPayloadSchema.parse(payload);
    let updatedRows = 0;

    for (const chunk of chunkRows(parsedPayload.rows, IMPORT_BATCH_SIZE)) {
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
    const parsedPayload = PerImportJobPayloadSchema.parse(payload);
    let updatedRows = 0;

    for (const chunk of chunkRows(parsedPayload.rows, IMPORT_BATCH_SIZE)) {
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
    const parsedPayload = ApeImportJobPayloadSchema.parse(payload);
    const aggregatedRows = aggregateRows(parsedPayload.rows);
    let updatedRows = 0;
    let insertedRows = 0;

    for (const chunk of chunkRows(aggregatedRows, IMPORT_BATCH_SIZE)) {
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

    for (const row of lapseRows) {
      const policyNumberId = row.policyNumberId!;
      const lapseDateUtc = row.lapseDateUtc ? new Date(row.lapseDateUtc) : new Date();

      const [existing] = await tx
        .select({ id: lapsationRecords.id })
        .from(lapsationRecords)
        .where(eq(lapsationRecords.policyNumberId, policyNumberId))
        .limit(1);

      if (existing) {
        await tx
          .update(lapsationRecords)
          .set({ isAtRisk: true, reinstatedAtUtc: null, lapseDateUtc })
          .where(eq(lapsationRecords.id, existing.id));
      } else {
        await tx.insert(lapsationRecords).values({
          policyNumberId,
          isAtRisk: true,
          lapseDateUtc,
          reinstatedAtUtc: null,
        });
      }

      await tx
        .update(clientProfiles)
        .set({ policyStatus: 'Lapsed', caseStatus: 'Returned' as CaseStatus, updatedAt: new Date() })
        .where(eq(clientProfiles.id, policyNumberId));
    }

    for (const row of reinstatementRows) {
      const policyNumberId = row.policyNumberId!;
      const reinstatedAtUtc = row.reinstatedAtUtc ? new Date(row.reinstatedAtUtc) : new Date();

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
    }
  }
}

export const performanceImportService = new PerformanceImportService();
