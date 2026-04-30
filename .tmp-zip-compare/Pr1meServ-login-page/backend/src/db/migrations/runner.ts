import 'dotenv/config';
import postgres from 'postgres';

import { applicationMigrations } from '.';

async function run() {
  const direction = process.argv[2];
  const startAtMigrationId = process.argv[3];
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  if (direction !== 'up' && direction !== 'down') {
    throw new Error('Pass "up" or "down" to the migration runner.');
  }

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 30,
    // Disable statement timeout at the driver level for long-running DDL migrations.
    // Supabase / Postgres may set a default statement_timeout; we override it per-session below.
    connection: {
      statement_timeout: 0,
    },
  });

  try {
    const migrations =
      direction === 'up' ? applicationMigrations : [...applicationMigrations].reverse();
    const selectedMigrations = startAtMigrationId
      ? (() => {
          const startIndex = migrations.findIndex((migration) => migration.id === startAtMigrationId);

          if (startIndex === -1) {
            throw new Error(`Migration "${startAtMigrationId}" was not found.`);
          }

          return migrations.slice(startIndex);
        })()
      : migrations;

    for (const migration of selectedMigrations) {
      console.log(`${direction.toUpperCase()}: ${migration.id}`);

      // Explicitly disable statement_timeout for this session so long-running DDL
      // (e.g. CREATE INDEX CONCURRENTLY, RLS policy creation) is never cancelled
      // by a server-level or Supabase-level timeout override.
      await sql`SET statement_timeout = 0`;

      const start = Date.now();
      if (direction === 'up') {
        await migration.up(sql);
      } else {
        await migration.down(sql);
      }
      console.log(`  ✓ done in ${((Date.now() - start) / 1000).toFixed(2)}s`);
    }
  } finally {
    await sql.end();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
