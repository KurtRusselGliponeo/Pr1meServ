import 'dotenv/config';
import postgres from 'postgres';

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Set a higher statement timeout (5 minutes)
    await sql.unsafe('SET statement_timeout = 300000');

    console.log('Running migration 006_ClientProfileOrphans...');

    // Drop the existing constraint
    await sql.unsafe('ALTER TABLE "ClientProfiles" DROP CONSTRAINT IF EXISTS "fk_clientprofiles_assignedagentid"');
    console.log('✓ Dropped existing constraint');

    // Make the column nullable
    await sql.unsafe('ALTER TABLE "ClientProfiles" ALTER COLUMN "AssignedAgentId" DROP NOT NULL');
    console.log('✓ Made AssignedAgentId nullable');

    // Add the new constraint with SET NULL on delete
    await sql.unsafe('ALTER TABLE "ClientProfiles" ADD CONSTRAINT "fk_clientprofiles_assignedagentid" FOREIGN KEY ("AssignedAgentId") REFERENCES "AgentProfiles"("Id") ON DELETE SET NULL');
    console.log('✓ Added new foreign key constraint');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });