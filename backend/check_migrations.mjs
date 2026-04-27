import 'dotenv/config';
import postgres from 'postgres';

async function checkMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Checking migration tracking...');

    // Check if there's a migration tracking table
    const tables = await sql.unsafe(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%migration%'`);
    console.log('Migration tables:', tables.map(t => t.tablename));

    // Check for common migration tracking table names
    const migrationTables = ['_prisma_migrations', 'schema_migrations', 'migrations'];
    for (const tableName of migrationTables) {
      try {
        const migrations = await sql.unsafe(`SELECT * FROM "${tableName}" ORDER BY id`);
        console.log(`Migrations in ${tableName}:`, migrations.length, 'records');
        if (migrations.length > 0) {
          console.log('Latest migrations:', migrations.slice(-3));
        }
      } catch (error) {
        // Table doesn't exist, continue
      }
    }

  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });