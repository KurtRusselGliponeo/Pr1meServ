import { beforeEach, describe, expect, it, vi } from 'vitest';

const { transactionMock, loggerErrorMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));

vi.mock('../../../db/client', () => ({
  db: {
    transaction: transactionMock,
  },
  withDbTransaction: async (_name: string, callback: (tx: unknown) => Promise<unknown>) =>
    transactionMock(callback),
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

import { db } from '../../../db/client';
import { logger } from '../../../lib/logger';
import { withDbTransaction } from '../../../lib/db-transaction';

describe('withDbTransaction', () => {
  beforeEach(() => {
    transactionMock.mockReset();
    loggerErrorMock.mockReset();
  });

  it('delegates to drizzle transaction and returns the callback result', async () => {
    const callback = vi.fn().mockResolvedValue({ ok: true });
    transactionMock.mockImplementation(async (handler: typeof callback) => handler({}));

    const result = await withDbTransaction<{ ok: boolean }>('multi-table-operation', callback);

    expect(result).toEqual({ ok: true });
    expect(db.transaction).toHaveBeenCalled();
  });

  it('logs and rethrows transaction failures', async () => {
    const error = new Error('transaction failed');
    transactionMock.mockRejectedValue(error);

    await expect(withDbTransaction('multi-table-operation', vi.fn())).rejects.toThrow(
      'transaction failed',
    );
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, operationName: 'multi-table-operation' },
      'Database transaction failed.',
    );
  });
});

