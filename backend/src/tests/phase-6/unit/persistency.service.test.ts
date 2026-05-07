import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, withDbTransactionMock } = vi.hoisted(() => ({
  dbMock: { select: vi.fn() },
  withDbTransactionMock: vi.fn(),
}));

vi.mock('@/db/client', () => ({
  db: dbMock,
  withDbTransaction: withDbTransactionMock,
}));

vi.mock('@/shared/lib/audit', () => ({
  logSystemAudit: vi.fn().mockResolvedValue(undefined),
}));

import { BadRequestError } from '@/lib/errors';
import { persistencyService } from '@/features/admin/persistency.service';

const adminActor = {
  id: 'admin-id',
  sub: 'admin-id',
  role: 'Admin',
  agentId: null,
  agentCode: null,
  tokenType: 'access',
} as const;

function chainSelectOnce(result: unknown[]) {
  const limitMock = vi.fn().mockResolvedValue(result);
  const whereMock = vi.fn(() => ({ limit: limitMock }));
  const fromMock = vi.fn(() => ({ where: whereMock }));
  dbMock.select.mockReturnValueOnce({ from: fromMock });
}

describe('persistencyService', () => {
  beforeEach(() => {
    dbMock.select.mockReset();
    withDbTransactionMock.mockReset();
  });

  it('blocks duplicate agent-month records', async () => {
    chainSelectOnce([{ id: 'agent-id', branchCode: 'A1' }]);
    chainSelectOnce([{ id: 'existing-persistency-id' }]);

    await expect(
      persistencyService.createPersistencyRecord(
        {
          agentId: '7f5e658f-9b80-4c98-a7ca-53d08b2b4ad2',
          recordMonth: '2026-03',
          personalPersistency: 90,
          unitPersistency: 91,
          branchPersistency: 92,
          notes: null,
        },
        adminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(withDbTransactionMock).not.toHaveBeenCalled();
  });
});
