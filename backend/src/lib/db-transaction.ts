import { db } from '../shared/db/client';
import { logger } from './logger';

/**
 * Executes a database operation inside a Drizzle transaction boundary.
 *
 * @param operationName Friendly operation name for server-side logging.
 * @param callback Work to execute inside the transaction.
 * @returns The callback result.
 * @throws Rethrows the original transaction error after logging it.
 */
export async function withDbTransaction<T>(
  operationName: string,
  callback: Parameters<typeof db.transaction>[0],
): Promise<T> {
  try {
    return (await db.transaction(callback)) as T;
  } catch (error) {
    logger.error({ err: error, operationName }, 'Database transaction failed.');
    throw error;
  }
}
