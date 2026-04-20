import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../schema';
import { logger } from '../lib/logger';

// Singleton pattern — prevents multiple DB connections in development (HMR)
const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const client = postgres(connectionString, {
  // For Supabase/Neon free tier: limit connection pool
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export const dbClient = client;

export type DatabaseClient = typeof db;
export type DbTransactionCallback = Parameters<DatabaseClient['transaction']>[0];
export type DbTransaction = Parameters<DbTransactionCallback>[0];

/**
 * Executes a typed Drizzle transaction boundary and preserves the schema-aware tx object
 * for downstream service composition.
 *
 * @param operationName Friendly operation name for structured logging.
 * @param callback Work executed inside the transaction.
 * @returns The callback result.
 * @throws Rethrows the original error so Drizzle performs the rollback automatically.
 */
export async function withDbTransaction<TResult>(
  operationName: string,
  callback: (tx: DbTransaction) => Promise<TResult>,
): Promise<TResult> {
  try {
    return await db.transaction(callback);
  } catch (error) {
    logger.error({ err: error, operationName }, 'Database transaction failed.');
    throw error;
  }
}

/**
 * Checks whether the database connection is responsive.
 *
 * @param No parameters are required.
 * @returns A promise that resolves when the database is reachable.
 * @throws Rethrows any database connectivity error.
 */
export async function assertDatabaseConnection(): Promise<void> {
  await db.execute(sql`select 1`);
}
