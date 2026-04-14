import 'dotenv/config';
import postgres from 'postgres';

import { phaseOneMigrations } from '.';

async function run() {
  const direction = process.argv[2];
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
    connect_timeout: 10,
  });

  try {
    const migrations = direction === 'up' ? phaseOneMigrations : [...phaseOneMigrations].reverse();

    for (const migration of migrations) {
      console.log(`${direction.toUpperCase()}: ${migration.id}`);
      if (direction === 'up') {
        await migration.up(sql);
      } else {
        await migration.down(sql);
      }
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
