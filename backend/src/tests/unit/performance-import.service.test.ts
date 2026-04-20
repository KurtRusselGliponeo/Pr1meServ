import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  withDbTransactionMock,
  txInsertValuesMock,
  txUpdateWhereMock,
  txSelectWhereMock,
  txInsertMock,
  txUpdateMock,
  txSelectMock,
} = vi.hoisted(() => {
  const txInsertValuesMock = vi.fn().mockResolvedValue(undefined);
  const txInsertMock = vi.fn(() => ({
    values: txInsertValuesMock,
  }));

  const txUpdateWhereMock = vi.fn().mockResolvedValue(undefined);
  const txUpdateSetMock = vi.fn(() => ({
    where: txUpdateWhereMock,
  }));
  const txUpdateMock = vi.fn(() => ({
    set: txUpdateSetMock,
  }));

  const txSelectWhereMock = vi.fn().mockResolvedValue([]);
  const txSelectMock = vi.fn(() => ({
    from: vi.fn(() => ({
      where: txSelectWhereMock,
    })),
  }));

  const withDbTransactionMock = vi.fn(
    async (
      _operationName: string,
      callback: (tx: {
        insert: typeof txInsertMock;
        update: typeof txUpdateMock;
        select: typeof txSelectMock;
      }) => Promise<unknown>,
    ) =>
      callback({
        insert: txInsertMock,
        update: txUpdateMock,
        select: txSelectMock,
      }),
  );

  return {
    withDbTransactionMock,
    txInsertValuesMock,
    txUpdateWhereMock,
    txSelectWhereMock,
    txInsertMock,
    txUpdateMock,
    txSelectMock,
  };
});

vi.mock('@/db/client', () => ({
  db: {},
  withDbTransaction: withDbTransactionMock,
}));

import { BusinessRuleError } from '@/lib/errors';
import { PerformanceImportService } from '@/features/performance/performance-import.service';

function buildRow(index: number) {
  return {
    agentId: `11111111-1111-1111-1111-${String(index).padStart(12, '0')}`,
    recordMonth: '2026-04',
    modalPremium: 100 + index,
    api: 200 + index,
    sumAssured: 300 + index,
    commissionAmount: 40 + index,
  };
}

describe('PerformanceImportService', () => {
  beforeEach(() => {
    withDbTransactionMock.mockClear();
    txInsertValuesMock.mockReset();
    txInsertValuesMock.mockResolvedValue(undefined);
    txUpdateWhereMock.mockReset();
    txUpdateWhereMock.mockResolvedValue(undefined);
    txSelectWhereMock.mockReset();
    txSelectWhereMock.mockResolvedValue([]);
    txInsertMock.mockClear();
    txUpdateMock.mockClear();
    txSelectMock.mockClear();
  });

  describe('processNapImport', () => {
    it('inserts NAP rows in chunked batches', async () => {
      const rows = Array.from({ length: 450 }, (_, index) => buildRow(index));
      const service = new PerformanceImportService();

      const result = await service.processNapImport({
        importBatchId: 'nap-batch-1',
        fileName: 'nap.xlsx',
        initiatedByUserId: '22222222-2222-2222-2222-222222222222',
        rows,
      });

      expect(result).toEqual({ insertedRows: 450 });
      expect(withDbTransactionMock).toHaveBeenCalledTimes(3);
      expect(txInsertValuesMock).toHaveBeenCalledTimes(3);
    });

    it('rejects empty NAP payloads', async () => {
      const service = new PerformanceImportService();

      await expect(
        service.processNapImport({
          importBatchId: 'nap-batch-2',
          fileName: 'nap.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [],
        } as never),
      ).rejects.toThrow();
    });

    it('rejects negative NAP metric values', async () => {
      const service = new PerformanceImportService();

      await expect(
        service.processNapImport({
          importBatchId: 'nap-batch-3',
          fileName: 'nap.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [
            {
              ...buildRow(1),
              modalPremium: -1,
            },
          ],
        } as never),
      ).rejects.toThrow();
    });

    it('surfaces batch insert failures', async () => {
      txInsertValuesMock.mockRejectedValueOnce(new Error('insert failed'));
      const service = new PerformanceImportService();

      await expect(
        service.processNapImport({
          importBatchId: 'nap-batch-4',
          fileName: 'nap.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [buildRow(1)],
        }),
      ).rejects.toThrow('insert failed');
    });
  });

  describe('processPerImport', () => {
    it('updates existing PER metric rows safely', async () => {
      txSelectWhereMock.mockResolvedValue([
        {
          id: 'metric-1',
          agentId: buildRow(1).agentId,
          recordMonth: '2026-04',
          modalPremium: '1.0000',
          api: '2.0000',
          sumAssured: '3.0000',
          commissionAmount: '4.0000',
        },
      ]);
      const service = new PerformanceImportService();

      const result = await service.processPerImport({
        importBatchId: 'per-batch-1',
        fileName: 'per.xlsx',
        initiatedByUserId: '22222222-2222-2222-2222-222222222222',
        rows: [buildRow(1)],
      });

      expect(result).toEqual({ updatedRows: 1 });
      expect(txUpdateWhereMock).toHaveBeenCalledOnce();
    });

    it('rejects PER rows without matching existing metrics', async () => {
      const service = new PerformanceImportService();

      await expect(
        service.processPerImport({
          importBatchId: 'per-batch-2',
          fileName: 'per.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [buildRow(1)],
        }),
      ).rejects.toBeInstanceOf(BusinessRuleError);
    });

    it('rejects invalid PER payloads', async () => {
      const service = new PerformanceImportService();

      await expect(
        service.processPerImport({
          importBatchId: 'per-batch-3',
          fileName: 'per.xlsx',
          initiatedByUserId: 'not-a-uuid',
          rows: [buildRow(1)],
        } as never),
      ).rejects.toThrow();
    });

    it('surfaces PER update failures', async () => {
      txSelectWhereMock.mockResolvedValue([
        {
          id: 'metric-1',
          agentId: buildRow(1).agentId,
          recordMonth: '2026-04',
          modalPremium: '1.0000',
          api: '2.0000',
          sumAssured: '3.0000',
          commissionAmount: '4.0000',
        },
      ]);
      txUpdateWhereMock.mockRejectedValueOnce(new Error('update failed'));
      const service = new PerformanceImportService();

      await expect(
        service.processPerImport({
          importBatchId: 'per-batch-4',
          fileName: 'per.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [buildRow(1)],
        }),
      ).rejects.toThrow('update failed');
    });
  });

  describe('processApeImport', () => {
    it('aggregates APE rows and updates or inserts monthly totals', async () => {
      const row = buildRow(1);
      txSelectWhereMock.mockResolvedValue([
        {
          id: 'metric-1',
          agentId: row.agentId,
          recordMonth: row.recordMonth,
          modalPremium: '10.0000',
          api: '20.0000',
          sumAssured: '30.0000',
          commissionAmount: '5.0000',
        },
      ]);
      const service = new PerformanceImportService();

      const result = await service.processApeImport({
        importBatchId: 'ape-batch-1',
        fileName: 'ape.xlsx',
        initiatedByUserId: '22222222-2222-2222-2222-222222222222',
        rows: [
          row,
          {
            ...buildRow(2),
            recordMonth: '2026-05',
          },
          {
            ...row,
            modalPremium: 5,
            api: 5,
            sumAssured: 5,
            commissionAmount: 5,
          },
        ],
      });

      expect(result).toEqual({ updatedRows: 1, insertedRows: 1 });
      expect(txUpdateWhereMock).toHaveBeenCalledOnce();
      expect(txInsertValuesMock).toHaveBeenCalledOnce();
    });

    it('rejects invalid APE payloads', async () => {
      const service = new PerformanceImportService();

      await expect(
        service.processApeImport({
          importBatchId: 'ape-batch-2',
          fileName: '',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [buildRow(1)],
        } as never),
      ).rejects.toThrow();
    });

    it('surfaces APE update failures', async () => {
      const row = buildRow(1);
      txSelectWhereMock.mockResolvedValue([
        {
          id: 'metric-1',
          agentId: row.agentId,
          recordMonth: row.recordMonth,
          modalPremium: '10.0000',
          api: '20.0000',
          sumAssured: '30.0000',
          commissionAmount: '5.0000',
        },
      ]);
      txUpdateWhereMock.mockRejectedValueOnce(new Error('ape update failed'));
      const service = new PerformanceImportService();

      await expect(
        service.processApeImport({
          importBatchId: 'ape-batch-3',
          fileName: 'ape.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [row],
        }),
      ).rejects.toThrow('ape update failed');
    });

    it('surfaces APE insert failures for new aggregate rows', async () => {
      txSelectWhereMock.mockResolvedValue([]);
      txInsertValuesMock.mockRejectedValueOnce(new Error('ape insert failed'));
      const service = new PerformanceImportService();

      await expect(
        service.processApeImport({
          importBatchId: 'ape-batch-4',
          fileName: 'ape.xlsx',
          initiatedByUserId: '22222222-2222-2222-2222-222222222222',
          rows: [buildRow(3)],
        }),
      ).rejects.toThrow('ape insert failed');
    });
  });
});

