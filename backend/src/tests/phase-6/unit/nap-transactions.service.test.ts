import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectMock,
  withDbTransactionMock,
  logSystemAuditMock,
  applyManualNapMetricDeltaMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  withDbTransactionMock: vi.fn(),
  logSystemAuditMock: vi.fn(),
  applyManualNapMetricDeltaMock: vi.fn(),
}));

vi.mock('@/db/client', () => ({
  db: {
    select: selectMock,
  },
  withDbTransaction: withDbTransactionMock,
}));

vi.mock('@/shared/lib/audit', () => ({
  logSystemAudit: logSystemAuditMock,
}));

vi.mock('@/features/phase-5-performance/metrics/metrics.service', () => ({
  metricsService: {
    applyManualNapMetricDelta: applyManualNapMetricDeltaMock,
  },
}));

import { BadRequestError } from '@/lib/errors';
import { adminNapTransactionsService } from '@/features/admin/nap-transactions.service';

function selectBuilder(result: unknown) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
        orderBy: vi.fn().mockResolvedValue(result),
      }),
      orderBy: vi.fn().mockResolvedValue(result),
    }),
  };
}

function buildTx() {
  return {
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation(() => ({
        returning: vi.fn().mockResolvedValue([{ id: 'nap-id' }]),
      })),
    })),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

const adminActor = {
  id: 'admin-id',
  sub: 'admin-id',
  role: 'Admin' as const,
  agentId: null,
  agentCode: null,
  tokenType: 'access' as const,
};

describe('adminNapTransactionsService', () => {
  beforeEach(() => {
    selectMock.mockReset();
    withDbTransactionMock.mockReset();
    logSystemAuditMock.mockReset();
    applyManualNapMetricDeltaMock.mockReset();
    vi.spyOn(adminNapTransactionsService, 'getTransactionDetail').mockResolvedValue({
      id: 'nap-id',
      policyId: 'policy-id',
      policyNumber: 'POL-001',
      accountType: 'Traditional',
      contractTypeCode: 'CT-1',
      typeDesc: 'Issued business',
      transactionDate: new Date('2026-05-01T00:00:00.000Z').toISOString(),
      tempReceiptDate: null,
      agentId: 'agent-id',
      agentCode: 'AG-001',
      agentName: 'Alicia Agent',
      branchCode: 'BR-01',
      api: '12000.0000',
      ccCredit: 1,
      transactionType: 'Issued',
      creditStatus: 'Credited',
      notes: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      history: {
        auditEvents: [],
        policyEffects: [],
      },
    });
  });

  it('blocks duplicate NAP transactions', async () => {
    selectMock
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'policy-id',
            policyNumber: 'POL-001',
            assignedAgentId: 'agent-id',
            branchCode: 'BR-01',
            policyStatus: 'Active',
          },
        ]),
      )
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'agent-id',
            branchCode: 'BR-01',
          },
        ]),
      )
      .mockImplementationOnce(() => selectBuilder([{ id: 'existing-nap-id' }]));

    await expect(
      adminNapTransactionsService.createTransaction(
        {
          policyId: 'policy-id',
          policyNumber: 'POL-001',
          transactionDate: '2026-05-01T00:00:00.000Z',
          transactionType: 'Issued',
          api: 12000,
        },
        adminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(withDbTransactionMock).not.toHaveBeenCalled();
  });

  it('creates lapse transactions, records policy effects, and updates metrics', async () => {
    selectMock
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'policy-id',
            policyNumber: 'POL-001',
            assignedAgentId: 'agent-id',
            branchCode: 'BR-01',
            policyStatus: 'Active',
          },
        ]),
      )
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'agent-id',
            branchCode: 'BR-01',
          },
        ]),
      )
      .mockImplementationOnce(() => selectBuilder([]));

    const tx = buildTx();
    withDbTransactionMock.mockImplementation(async (_label, callback) => callback(tx));

    const result = await adminNapTransactionsService.createTransaction(
      {
        policyId: 'policy-id',
        policyNumber: 'POL-001',
        transactionDate: '2026-05-01T00:00:00.000Z',
        transactionType: 'Lapsed',
        api: 12000,
      },
      adminActor,
    );

    expect(result.id).toBe('nap-id');
    expect(tx.update).toHaveBeenCalled();
    expect(tx.insert).toHaveBeenCalled();
    expect(applyManualNapMetricDeltaMock).toHaveBeenCalledWith(
      'agent-id',
      new Date('2026-05-01T00:00:00.000Z'),
      12000,
      tx,
    );
  });

  it('creates reinstatement transactions after a lapse and updates metrics', async () => {
    selectMock
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'policy-id',
            policyNumber: 'POL-001',
            assignedAgentId: 'agent-id',
            branchCode: 'BR-01',
            policyStatus: 'Lapsed',
          },
        ]),
      )
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'agent-id',
            branchCode: 'BR-01',
          },
        ]),
      )
      .mockImplementationOnce(() => selectBuilder([]))
      .mockImplementationOnce(() => selectBuilder([{ id: 'lapse-history-id' }]));

    const tx = buildTx();
    withDbTransactionMock.mockImplementation(async (_label, callback) => callback(tx));

    const result = await adminNapTransactionsService.createTransaction(
      {
        policyId: 'policy-id',
        policyNumber: 'POL-001',
        transactionDate: '2026-05-02T00:00:00.000Z',
        transactionType: 'Reinstated',
        api: 12000,
      },
      adminActor,
    );

    expect(result.id).toBe('nap-id');
    expect(tx.update).toHaveBeenCalled();
    expect(applyManualNapMetricDeltaMock).toHaveBeenCalledWith(
      'agent-id',
      new Date('2026-05-02T00:00:00.000Z'),
      12000,
      tx,
    );
  });

  it('rejects reinstatement when the policy was never lapsed', async () => {
    selectMock
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'policy-id',
            policyNumber: 'POL-001',
            assignedAgentId: 'agent-id',
            branchCode: 'BR-01',
            policyStatus: 'Active',
          },
        ]),
      )
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'agent-id',
            branchCode: 'BR-01',
          },
        ]),
      )
      .mockImplementationOnce(() => selectBuilder([]))
      .mockImplementationOnce(() => selectBuilder([]));

    await expect(
      adminNapTransactionsService.createTransaction(
        {
          policyId: 'policy-id',
          policyNumber: 'POL-001',
          transactionDate: '2026-05-02T00:00:00.000Z',
          transactionType: 'Reinstated',
          api: 12000,
        },
        adminActor,
      ),
    ).rejects.toThrow(/only allowed after a policy has been marked as lapsed/i);

    expect(withDbTransactionMock).not.toHaveBeenCalled();
  });
});
