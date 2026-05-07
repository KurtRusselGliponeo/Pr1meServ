import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  selectMock,
  withDbTransactionMock,
  logSystemAuditMock,
  applyManualRecruitmentMetricDeltaMock,
} = vi.hoisted(() => ({
  selectMock: vi.fn(),
  withDbTransactionMock: vi.fn(),
  logSystemAuditMock: vi.fn(),
  applyManualRecruitmentMetricDeltaMock: vi.fn(),
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
    applyManualRecruitmentMetricDelta: applyManualRecruitmentMetricDeltaMock,
  },
}));

import { BadRequestError } from '@/lib/errors';
import { adminRecruitmentService } from '@/features/admin/recruitment.service';

function selectBuilder(result: unknown) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
        orderBy: vi.fn().mockResolvedValue(result),
      }),
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          offset: vi.fn().mockResolvedValue(result),
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

describe('adminRecruitmentService', () => {
  beforeEach(() => {
    selectMock.mockReset();
    withDbTransactionMock.mockReset();
    logSystemAuditMock.mockReset();
    applyManualRecruitmentMetricDeltaMock.mockReset();
    vi.spyOn(adminRecruitmentService, 'getRecruitmentDetail').mockResolvedValue({
      id: 'recruitment-id',
      agentId: 'agent-id',
      agentCode: 'AG-001',
      agentName: 'Alicia Agent',
      recruiter: 'Coach Ray',
      umCode: 'UM-01',
      umName: 'Uma Manager',
      bmCode: 'BM-01',
      bmName: 'Ben Manager',
      team: 'Alpha',
      birthday: '1990-01-01',
      dateAppointed: new Date('2026-05-01T00:00:00.000Z').toISOString(),
      dateTerminated: null,
      status: 'Active',
      contacts: '0917',
      notes: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      timeline: { auditEvents: [] },
    });
  });

  it('creates recruitment records and updates metrics', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([{ id: 'agent-id', agentCode: 'AG-001', displayName: 'Alicia Agent', branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([]));

    withDbTransactionMock.mockImplementation(async (_label, callback) =>
      callback({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'recruitment-id' }]),
          }),
        }),
      }),
    );

    const result = await adminRecruitmentService.createRecruitment(
      {
        agentId: 'agent-id',
        recruiter: 'Coach Ray',
        dateAppointed: '2026-05-01T00:00:00.000Z',
        status: 'Active',
      },
      adminActor,
    );

    expect(result.id).toBe('recruitment-id');
    expect(applyManualRecruitmentMetricDeltaMock).toHaveBeenCalled();
  });

  it('rejects invalid termination dates', async () => {
    await expect(
      adminRecruitmentService.createRecruitment(
        {
          agentId: 'agent-id',
          dateAppointed: '2026-05-02T00:00:00.000Z',
          dateTerminated: '2026-05-01T00:00:00.000Z',
          status: 'Terminated',
        },
        adminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('blocks duplicate active agent codes', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([{ id: 'agent-id', agentCode: 'AG-001', displayName: 'Alicia Agent', branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([{ id: 'existing-id' }]));

    await expect(
      adminRecruitmentService.createRecruitment(
        {
          agentId: 'agent-id',
          dateAppointed: '2026-05-01T00:00:00.000Z',
          status: 'Active',
        },
        adminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it('updates recruitment records for admin users', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([
        {
          id: 'recruitment-id',
          agentId: 'agent-id',
          agentCode: 'AG-001',
          agentName: 'Alicia Agent',
          recruiter: 'Coach Ray',
          umCode: null,
          umName: null,
          bmCode: null,
          bmName: null,
          team: 'Alpha',
          birthday: null,
          dateAppointed: new Date('2026-05-01T00:00:00.000Z'),
          dateTerminated: null,
          status: 'Active',
          contacts: null,
          notes: null,
        },
      ]))
      .mockImplementationOnce(() => selectBuilder([{ id: 'agent-id', agentCode: 'AG-001', displayName: 'Alicia Agent', branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([]));

    withDbTransactionMock.mockImplementation(async (_label, callback) =>
      callback({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      }),
    );

    const result = await adminRecruitmentService.updateRecruitment(
      'recruitment-id',
      {
        team: 'Beta',
        status: 'Reinstated',
      },
      adminActor,
    );

    expect(result.id).toBe('recruitment-id');
    expect(logSystemAuditMock).toHaveBeenCalled();
  });
});
