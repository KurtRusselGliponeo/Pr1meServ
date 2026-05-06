import { beforeEach, describe, expect, it, vi } from 'vitest';

const { selectMock, withDbTransactionMock, logSystemAuditMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  withDbTransactionMock: vi.fn(),
  logSystemAuditMock: vi.fn(),
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

import { ForbiddenError } from '@/lib/errors';
import { lapsationService } from '@/features/phase-5-performance/lapsation/lapsation.service';

function selectBuilder(result: unknown) {
  const queryChain = {
    leftJoin: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
  queryChain.leftJoin.mockReturnValue(queryChain);
  queryChain.innerJoin.mockReturnValue(queryChain);
  queryChain.where.mockReturnValue(queryChain);
  queryChain.orderBy.mockReturnValue(queryChain);
  queryChain.limit.mockResolvedValue(result);
  return {
    from: vi.fn().mockReturnValue(queryChain),
    innerJoin: vi.fn().mockReturnValue(queryChain),
    leftJoin: vi.fn().mockReturnValue(queryChain),
    where: vi.fn().mockReturnValue(queryChain),
    orderBy: vi.fn().mockReturnValue(queryChain),
    limit: vi.fn().mockResolvedValue(result),
  };
}

function buildTx() {
  return {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ userId: 'agent-user-id' }]),
        }),
      }),
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

const branchManagerActor = {
  id: 'bm-id',
  sub: 'bm-id',
  role: 'BranchManager' as const,
  agentId: 'bm-agent-id',
  agentCode: 'BM-001',
  tokenType: 'access' as const,
};

const agentActor = {
  id: 'agent-id',
  sub: 'agent-id',
  role: 'Agent' as const,
  agentId: 'agent-profile-id',
  agentCode: 'AG-001',
  tokenType: 'access' as const,
};

describe('lapsationService', () => {
  beforeEach(() => {
    selectMock.mockReset();
    withDbTransactionMock.mockReset();
    logSystemAuditMock.mockReset();
    vi.restoreAllMocks();
  });

  it('creates notifications and audit entries on status change', async () => {
    vi.spyOn(lapsationService, 'getDashboard').mockResolvedValue({
      generatedAtUtc: new Date().toISOString(),
      thresholdDays: 30,
      scope: { role: 'Admin', branchCode: null, agentId: null },
      summary: { totalTracked: 1, atRiskCount: 1, reinstatedYtd: 0, criticalCount: 0, lapsedCount: 0 },
      records: [
        {
          id: 'history-id',
          policyId: 'policy-id',
          policyNumber: 'POL-001',
          policyOwnerName: 'Jamie Client',
          lifeInsuredName: null,
          clientName: 'Jamie Client',
          status: 'At Risk',
          branchCode: 'BR-01',
          assignedAgentId: 'agent-id',
          assignedAgentName: 'Alicia Agent',
          modalPremium: '1000.0000',
          isAtRisk: true,
          riskLevel: null,
          followUpStatus: 'Open',
          statusChangedAtUtc: new Date('2026-05-02T00:00:00.000Z').toISOString(),
          lapseDateUtc: null,
          reinstatedAtUtc: null,
          reason: 'Premium aging',
          notes: null,
          createdAtUtc: new Date('2026-05-01T00:00:00.000Z').toISOString(),
          daysSinceLapse: null,
        },
      ],
      timeline: [],
    });

    selectMock
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'policy-id',
            policyNumber: 'POL-001',
            assignedAgentId: 'agent-id',
            branchCode: 'BR-01',
            policyStatus: 'Active',
            policyOwnerName: 'Jamie Client',
          },
        ]),
      );

    const tx = buildTx();
    withDbTransactionMock.mockImplementation(async (_label, callback) => callback(tx));

    const result = await lapsationService.updatePolicyStatus(
      'policy-id',
      {
        status: 'At Risk',
        reason: 'Premium aging',
        followUpStatus: 'Open',
      },
      adminActor,
    );

    expect(result.status).toBe('At Risk');
    expect(tx.update).toHaveBeenCalled();
    expect(tx.insert).toHaveBeenCalledTimes(2);
    expect(logSystemAuditMock).toHaveBeenCalled();
  });

  it('blocks branch managers from changing policies outside their branch', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([
        {
          id: 'policy-id',
          policyNumber: 'POL-001',
          assignedAgentId: 'agent-id',
          branchCode: 'BR-02',
          policyStatus: 'Active',
          policyOwnerName: 'Jamie Client',
        },
      ]))
      .mockImplementationOnce(() => selectBuilder([{ branchCode: 'BR-01' }]));

    await expect(
      lapsationService.updatePolicyStatus(
        'policy-id',
        {
          status: 'Lapsed',
          reason: 'Missed payment',
          followUpStatus: 'Open',
        },
        branchManagerActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('prevents agents from mutating policy status', async () => {
    await expect(
      lapsationService.updatePolicyStatus(
        'policy-id',
        {
          status: 'Lapsed',
          reason: 'Missed payment',
          followUpStatus: 'Open',
        },
        agentActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('returns agent-scoped alerts for the follow-up queue', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([{ branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([
        {
          id: 'policy-id',
          policyNumber: 'POL-001',
          policyOwnerName: 'Jamie Client',
          lifeInsuredName: null,
          branchCode: 'BR-01',
          assignedAgentId: 'agent-profile-id',
          agentUserId: 'agent-user-id',
          assignedAgentName: 'Alicia',
          agentLastName: 'Agent',
          modalPremium: '1000.0000',
          policyStatus: 'At Risk',
          createdAtUtc: new Date('2026-05-01T00:00:00.000Z'),
          historyId: 'history-id',
          effectiveAtUtc: new Date('2026-05-02T00:00:00.000Z'),
          reason: 'Follow up now',
          notes: null,
          metadata: { followUpStatus: 'Open' },
        },
      ]))
      .mockImplementationOnce(() => selectBuilder([]));

    const result = await lapsationService.getDashboard(agentActor, {});
    expect(result.scope.role).toBe('Agent');
    expect(result.records[0]?.policyId).toBe('policy-id');
    expect(result.records[0]?.followUpStatus).toBe('Open');
  });
});
