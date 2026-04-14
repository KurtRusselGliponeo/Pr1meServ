jest.mock('../shared/db/client', () => ({
  db: {
    transaction: jest.fn(),
  },
}));

jest.mock('./logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

import { db } from '../shared/db/client';
import { logger } from './logger';
import { withDbTransaction } from './db-transaction';

describe('withDbTransaction', () => {
  it('delegates to drizzle transaction and returns the callback result', async () => {
    const callback = jest.fn().mockResolvedValue({ ok: true });
    (db.transaction as jest.Mock).mockImplementation(async (handler: typeof callback) =>
      handler({}),
    );

    const result = await withDbTransaction<{ ok: boolean }>('multi-table-operation', callback);

    expect(result).toEqual({ ok: true });
    expect(db.transaction).toHaveBeenCalled();
  });

  it('logs and rethrows transaction failures', async () => {
    const error = new Error('transaction failed');
    (db.transaction as jest.Mock).mockRejectedValue(error);

    await expect(withDbTransaction('multi-table-operation', jest.fn())).rejects.toThrow(
      'transaction failed',
    );
    expect(logger.error).toHaveBeenCalledWith(
      { err: error, operationName: 'multi-table-operation' },
      'Database transaction failed.',
    );
  });
});
