import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, withDbTransactionMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
  },
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
import { planCodesService } from '@/features/admin/plan-codes.service';

const adminActor = {
  id: 'admin-id',
  sub: 'admin-id',
  role: 'Admin',
  agentId: null,
  agentCode: null,
  tokenType: 'access',
} as const;

describe('planCodesService', () => {
  beforeEach(() => {
    dbMock.select.mockReset();
    withDbTransactionMock.mockReset();
  });

  it('prevents duplicate active plan codes on create', async () => {
    const limitMock = vi.fn().mockResolvedValue([{ id: 'existing-plan-code-id' }]);
    const whereMock = vi.fn(() => ({ limit: limitMock }));
    const fromMock = vi.fn(() => ({ where: whereMock }));
    dbMock.select.mockReturnValue({ from: fromMock });

    await expect(
      planCodesService.createPlanCode(
        {
          planCode: 'PRU123',
          planName: 'PRU Plan 123',
          productCategory: 'Traditional',
          classification: 'OLUL',
          isActive: true,
          notes: null,
        },
        adminActor,
      ),
    ).rejects.toBeInstanceOf(BadRequestError);

    expect(withDbTransactionMock).not.toHaveBeenCalled();
  });
});
