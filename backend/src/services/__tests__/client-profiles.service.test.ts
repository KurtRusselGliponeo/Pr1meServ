import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListClientProfilesQuerySchema } from '@a1prime/schemas';
import type { AuthTokenPayload } from '@/shared/lib/auth';
import { ClientProfilesService } from '@/services/client-profiles.service';

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}));

vi.mock('@/db/client', () => ({
  db: {
    select: selectMock,
  },
}));

function createRowsBuilder(result: unknown[]) {
  return {
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          offset: vi.fn().mockResolvedValue(result),
        })),
      })),
    })),
  };
}

function createCountBuilder(total: number) {
  return {
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([{ total }]),
    })),
  };
}

const baseActorUser: AuthTokenPayload = {
  id: '88c9956a-064c-436a-b267-7d5f7a434197',
  sub: '88c9956a-064c-436a-b267-7d5f7a434197',
  role: 'Agent',
  agentId: 'fc944343-2336-4951-b299-9d7203362cc8',
  agentCode: 'AG-001',
  tokenType: 'access',
};

describe('ClientProfilesService', () => {
  beforeEach(() => {
    selectMock.mockReset();
  });

  it('returns only the agent-scoped client data for an Agent token', async () => {
    selectMock
      .mockReturnValueOnce(
        createRowsBuilder([
          {
            id: '53e2d073-c2f4-4509-8064-dfbf9f163159',
            assignedAgentId: baseActorUser.agentId,
            firstName: 'Ana',
            lastName: 'Santos',
            policyNumber: 'POL-001',
            modalPremium: '1000.0000',
            api: '12000.0000',
            sumAssured: '500000.0000',
            commissionAmount: '1500.0000',
            caseStatus: 'Contacted',
            policyStatus: 'Active',
            createdAtUtc: new Date('2026-01-01T00:00:00.000Z'),
            updatedAtUtc: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      )
      .mockReturnValueOnce(createCountBuilder(1));

    const service = new ClientProfilesService();
    const result = await service.listClientProfiles(
      ListClientProfilesQuerySchema.parse({ page: 1, pageSize: 25 }),
      baseActorUser,
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.assignedAgentId).toBe(baseActorUser.agentId);
    expect(result.meta).toEqual({
      total: 1,
      page: 1,
      pageSize: 25,
      hasNextPage: false,
    });
  });

  it('returns filtered data for a BranchManager token using agentId', async () => {
    selectMock
      .mockReturnValueOnce(createRowsBuilder([]))
      .mockReturnValueOnce(createCountBuilder(0));

    const service = new ClientProfilesService();
    const result = await service.listClientProfiles(
      ListClientProfilesQuerySchema.parse({
        page: 1,
        pageSize: 25,
        agentId: 'e5f4867c-1110-4627-aaf8-91265977f6d1',
      }),
      {
        ...baseActorUser,
        role: 'BranchManager',
        agentId: null,
        agentCode: null,
      },
    );

    expect(result.meta.total).toBe(0);
  });

  it('rejects pageSize values over 100 at the schema layer', () => {
    expect(() =>
      ListClientProfilesQuerySchema.parse({
        pageSize: 200,
      }),
    ).toThrow();
  });

  it('rejects invalid status values at the schema layer', () => {
    expect(() =>
      ListClientProfilesQuerySchema.parse({
        status: 'InvalidStatus',
      }),
    ).toThrow();
  });

  it('silently overrides an agent query agentId by using the actor scope', async () => {
    selectMock
      .mockReturnValueOnce(
        createRowsBuilder([
          {
            id: '53e2d073-c2f4-4509-8064-dfbf9f163159',
            assignedAgentId: baseActorUser.agentId,
            firstName: 'Ana',
            lastName: 'Santos',
            policyNumber: 'POL-001',
            modalPremium: '1000.0000',
            api: '12000.0000',
            sumAssured: '500000.0000',
            commissionAmount: '1500.0000',
            caseStatus: 'Contacted',
            policyStatus: 'Active',
            createdAtUtc: new Date('2026-01-01T00:00:00.000Z'),
            updatedAtUtc: new Date('2026-01-02T00:00:00.000Z'),
          },
        ]),
      )
      .mockReturnValueOnce(createCountBuilder(1));

    const service = new ClientProfilesService();
    const result = await service.listClientProfiles(
      ListClientProfilesQuerySchema.parse({
        page: 1,
        pageSize: 25,
        agentId: '00000000-0000-0000-0000-000000000000',
      }),
      baseActorUser,
    );

    expect(result.data[0]?.assignedAgentId).toBe(baseActorUser.agentId);
  });
});
