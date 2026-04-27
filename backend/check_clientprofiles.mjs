import 'dotenv/config';
import postgres from 'postgres';

async function checkClientProfiles() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set.');
  }

  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Checking ClientProfiles table...');

    // Check constraints
    const constraints = await sql.unsafe(`SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = '"ClientProfiles"'::regclass AND conname LIKE '%assignedagentid%'`);
    console.log('Current constraints:', constraints);

    // Check column nullability
    const columns = await sql.unsafe(`SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'ClientProfiles' AND column_name = 'AssignedAgentId'`);
    console.log('AssignedAgentId column:', columns);

  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

checkClientProfiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });