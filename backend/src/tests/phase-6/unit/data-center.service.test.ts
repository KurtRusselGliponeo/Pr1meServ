import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectMock,
  withDbTransactionMock,
  logSystemAuditMock,
  getLeaderboardMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  withDbTransactionMock: vi.fn(),
  logSystemAuditMock: vi.fn(),
  getLeaderboardMock: vi.fn(),
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
    getLeaderboard: getLeaderboardMock,
  },
}));

import { ForbiddenError } from '@/lib/errors';
import { adminDataCenterService } from '@/features/admin/data-center.service';

function selectBuilder(result: unknown) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
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

const agentActor = {
  id: 'agent-id',
  sub: 'agent-id',
  role: 'Agent' as const,
  agentId: 'agent-profile-id',
  agentCode: 'AG-001',
  tokenType: 'access' as const,
};

describe('adminDataCenterService', () => {
  beforeEach(() => {
    selectMock.mockReset();
    withDbTransactionMock.mockReset();
    logSystemAuditMock.mockReset();
    getLeaderboardMock.mockReset();
  });

  it('updates validation issues and records an audit event', async () => {
    selectMock.mockImplementationOnce(() =>
      selectBuilder([
        {
          id: 'issue-id',
          status: 'Open',
          recommendedFix: null,
        },
      ]),
    );

    withDbTransactionMock.mockImplementation(async (_label, callback) =>
      callback({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                {
                  id: 'issue-id',
                  module: 'Policy',
                  entityName: 'Policy',
                  entityId: 'd2df8f8c-f710-4751-bec3-5ca4795e4136',
                  issueCode: 'POLICY_PLAN_MISMATCH',
                  severity: 'error',
                  status: 'Resolved',
                  details: 'Mismatch',
                  recommendedFix: 'Fix policy plan code',
                  rawPayload: null,
                  createdByUserId: null,
                  resolvedByUserId: 'admin-id',
                  resolvedAtUtc: new Date('2026-05-07T00:00:00.000Z'),
                  createdAtUtc: new Date('2026-05-01T00:00:00.000Z'),
                  updatedAtUtc: new Date('2026-05-07T00:00:00.000Z'),
                },
              ]),
            }),
          }),
        }),
      }),
    );

    const result = await adminDataCenterService.updateValidationIssue(
      'issue-id',
      { status: 'Resolved', recommendedFix: 'Fix policy plan code' },
      adminActor,
    );

    expect(result.status).toBe('Resolved');
    expect(logSystemAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'validation-issue.resolved',
        entityName: 'DataValidationIssue',
        resourceId: 'issue-id',
      }),
      expect.any(Object),
    );
  });

  it('blocks agents from branch summary exports', async () => {
    await expect(
      adminDataCenterService.exportCsvReport(
        {
          reportType: 'branch-summary',
          recordMonth: '2026-05',
        },
        agentActor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
