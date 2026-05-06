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

import { BadRequestError } from '@/lib/errors';
import { policiesService } from '@/features/policies/policies.service';

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

describe('policies.service', () => {
  beforeEach(() => {
    selectMock.mockReset();
    withDbTransactionMock.mockReset();
    logSystemAuditMock.mockReset();
    vi.spyOn(policiesService, 'getPolicyDetail').mockResolvedValue({
      id: 'policy-id',
      clientProfileId: null,
      assignedAgentId: 'agent-id',
      agentCode: 'AG-001',
      agentName: 'Alicia Agent',
      branchCode: 'BR-01',
      policyNumber: 'POL-001',
      policyOwnerName: 'Jamie Client',
      lifeInsuredName: 'Jamie Client',
      planCode: 'PRU123',
      planName: 'PRU Plan 123',
      currency: 'PHP',
      firstIssueDate: '2026-05-01',
      mode: 'Monthly',
      modalPremium: '1000',
      sumAssured: '50000',
      api: '12000',
      policyStatus: 'Active',
      notes: null,
      createdAtUtc: new Date().toISOString(),
      updatedAtUtc: new Date().toISOString(),
      validationIssues: [],
      timeline: {
        statusHistory: [],
        auditEvents: [],
      },
    });
  });

  it('rejects duplicate policy numbers', async () => {
    selectMock.mockImplementationOnce(() => selectBuilder([{ id: 'existing-policy' }]));

    await expect(
      policiesService.createPolicy(
        {
          assignedAgentId: 'agent-id',
          policyNumber: 'POL-001',
          branchCode: 'BR-01',
          policyOwnerName: 'Jamie Client',
          lifeInsuredName: 'Jamie Client',
          currency: 'PHP',
          mode: 'Monthly',
          modalPremium: 1000,
          sumAssured: 50000,
          api: 12000,
          policyStatus: 'Active',
        },
        adminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(withDbTransactionMock).not.toHaveBeenCalled();
  });

  it('rejects invalid plan codes', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([]))
      .mockImplementationOnce(() => selectBuilder([{ id: 'agent-id', branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([]));

    await expect(
      policiesService.createPolicy(
        {
          assignedAgentId: 'agent-id',
          policyNumber: 'POL-001',
          branchCode: 'BR-01',
          policyOwnerName: 'Jamie Client',
          currency: 'PHP',
          planCode: 'BAD123',
          mode: 'Monthly',
          modalPremium: 1000,
          sumAssured: 50000,
          api: 12000,
          policyStatus: 'Active',
        },
        adminActor,
      ),
    ).rejects.toThrow(/Plan code BAD123 is invalid or inactive/i);
  });

  it('rejects invalid assigned agents', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([]))
      .mockImplementationOnce(() => selectBuilder([]))
      .mockImplementationOnce(() => selectBuilder([{ planCode: 'PRU123', planName: 'Plan', isActive: true }]));

    await expect(
      policiesService.createPolicy(
        {
          assignedAgentId: 'missing-agent',
          policyNumber: 'POL-001',
          branchCode: 'BR-01',
          policyOwnerName: 'Jamie Client',
          currency: 'PHP',
          planCode: 'PRU123',
          mode: 'Monthly',
          modalPremium: 1000,
          sumAssured: 50000,
          api: 12000,
          policyStatus: 'Active',
        },
        adminActor,
      ),
    ).rejects.toThrow(/Assigned agent does not exist/i);
  });

  it('creates policies for admin users', async () => {
    selectMock
      .mockImplementationOnce(() => selectBuilder([]))
      .mockImplementationOnce(() => selectBuilder([{ id: 'agent-id', branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([{ planCode: 'PRU123', planName: 'PRU Plan 123', isActive: true }]));

    withDbTransactionMock.mockImplementation(async (_label, callback) =>
      callback({
        insert: vi
          .fn()
          .mockReturnValueOnce({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'policy-id' }]),
            }),
          })
          .mockReturnValueOnce({
            values: vi.fn().mockResolvedValue(undefined),
          }),
      }),
    );

    const result = await policiesService.createPolicy(
      {
        assignedAgentId: 'agent-id',
        policyNumber: 'POL-001',
        branchCode: 'BR-01',
        policyOwnerName: 'Jamie Client',
        lifeInsuredName: 'Jamie Client',
        currency: 'PHP',
        planCode: 'PRU123',
        mode: 'Monthly',
        modalPremium: 1000,
        sumAssured: 50000,
        api: 12000,
        policyStatus: 'Active',
      },
      adminActor,
    );

    expect(result.policyNumber).toBe('POL-001');
    expect(withDbTransactionMock).toHaveBeenCalled();
  });

  it('updates policies for admin users', async () => {
    selectMock
      .mockImplementationOnce(() =>
        selectBuilder([
          {
            id: 'policy-id',
            assignedAgentId: 'agent-id',
            policyNumber: 'POL-001',
            branchCode: 'BR-01',
            planCode: 'PRU123',
            planName: 'PRU Plan 123',
            policyStatus: 'Active',
            notes: null,
          },
        ]),
      )
      .mockImplementationOnce(() => selectBuilder([{ id: 'agent-id', branchCode: 'BR-01' }]))
      .mockImplementationOnce(() => selectBuilder([{ planCode: 'PRU123', planName: 'PRU Plan 123', isActive: true }]));

    withDbTransactionMock.mockImplementation(async (_label, callback) =>
      callback({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    );

    const result = await policiesService.updatePolicy(
      'policy-id',
      {
        assignedAgentId: 'agent-id',
        planCode: 'PRU123',
        policyStatus: 'Reinstated',
        notes: 'Updated status',
      },
      adminActor,
    );

    expect(result.policyStatus).toBe('Active');
    expect(withDbTransactionMock).toHaveBeenCalled();
  });
});
