import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../../schema';

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
