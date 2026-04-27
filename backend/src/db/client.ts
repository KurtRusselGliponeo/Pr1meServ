import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { logger } from '../lib/logger';
import * as schema from '../schema';

const connectionString = process.env.DATABASE_URL!;
const databasePoolMax = Number.parseInt(process.env.DB_POOL_MAX ?? '5', 10);
const databaseIdleTimeoutSeconds = Number.parseInt(process.env.DB_IDLE_TIMEOUT_SECONDS ?? '20', 10);
const databaseConnectTimeoutSeconds = Number.parseInt(
  process.env.DB_CONNECT_TIMEOUT_SECONDS ?? '10',
  10,
);
const connectionUsesPooler =
  connectionString.includes('.pooler.supabase.com') || /:6543(?:\/|$)/.test(connectionString);
const usePgBouncer =
  process.env.DB_USE_PGBOUNCER?.trim() === 'true' ||
  (process.env.DB_USE_PGBOUNCER == null && connectionUsesPooler);

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

const client = postgres(connectionString, {
  max: Number.isNaN(databasePoolMax) ? 5 : databasePoolMax,
  idle_timeout: Number.isNaN(databaseIdleTimeoutSeconds) ? 20 : databaseIdleTimeoutSeconds,
  connect_timeout: Number.isNaN(databaseConnectTimeoutSeconds) ? 10 : databaseConnectTimeoutSeconds,
  prepare: !usePgBouncer,
});

export const db = drizzle(client, { schema });
export const dbClient = client;

export type DatabaseClient = typeof db;
export type DbTransactionCallback = Parameters<DatabaseClient['transaction']>[0];
export type DbTransaction = Parameters<DbTransactionCallback>[0];

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

export async function assertDatabaseConnection(): Promise<void> {
  await db.execute(sql`select 1`);
}

export async function assertRequiredDatabaseSchema(): Promise<void> {
  const requiredSchemaChecks = [
    sql`select 1 from "ClientProfiles" limit 1`,
    sql`select "ProductType" from "ClientProfiles" limit 1`,
    sql`select "OriginalFileName" from "DocumentLibrary" limit 1`,
    sql`select 1 from "Policies" limit 1`,
    sql`select 1 from "PolicyTransactions" limit 1`,
    sql`select 1 from "Notifications" limit 1`,
  ];

  for (const check of requiredSchemaChecks) {
    await db.execute(check);
  }
}
