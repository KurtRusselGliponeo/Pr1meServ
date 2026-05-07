import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock } = vi.hoisted(() => ({
  dbMock: { select: vi.fn() },
}));

vi.mock('@/db/client', () => ({
  db: dbMock,
  withDbTransaction: vi.fn(),
}));

import { metricsService } from '@/features/phase-5-performance/metrics/metrics.service';

function queryResult<T>(result: T[]) {
  const chain = {
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    groupBy: vi.fn(() => Promise.resolve(result)),
    orderBy: vi.fn(() => Promise.resolve(result)),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: T[]) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

describe('metricsService persistency integration', () => {
  beforeEach(() => {
    dbMock.select.mockReset();
  });

  it('uses manual monthly persistency records in leaderboard rows', async () => {
    dbMock.select
      .mockReturnValueOnce(
        queryResult([
          {
            agentId: 'agent-id',
            agentName: 'Agent One',
            agentCode: 'AG-001',
            branchCode: 'A1',
            recordMonth: '2026-03',
            api: '1000.00',
            modalPremium: '500.00',
            commissionAmount: '100.00',
            recruitmentCount: 0,
          },
        ]),
      )
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(queryResult([]))
      .mockReturnValueOnce(
        queryResult([
          {
            agentId: 'agent-id',
            personalPersistency: '82.50',
          },
        ]),
      );

    const rows = await metricsService.getLeaderboardRows(
      { month: 3, year: 2026 },
      {
        id: 'admin-id',
        sub: 'admin-id',
        role: 'Admin',
        agentId: null,
        agentCode: null,
        tokenType: 'access',
      },
    );

    expect(rows[0]?.persistencyRate).toBe(82.5);
  });
});
