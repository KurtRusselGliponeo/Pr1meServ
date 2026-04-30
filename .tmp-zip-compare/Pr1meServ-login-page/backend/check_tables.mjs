import 'dotenv/config';
import postgres from 'postgres';

async function checkTables() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Checking available tables...');

    // List all tables
    const tables = await sql.unsafe(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    console.log('Tables in public schema:', tables.map(t => t.tablename));

    // Check if ClientProfiles exists with different cases
    const clientTables = await sql.unsafe(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ILIKE '%client%' ORDER BY tablename`);
    console.log('Client-related tables:', clientTables.map(t => t.tablename));

  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });