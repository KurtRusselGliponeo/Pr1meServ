import 'dotenv/config';
import postgres from 'postgres';

function getConfiguredDatabaseUrl() {
  return process.env.LOCAL_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || '';
}

function getAdminDatabaseUrl(targetUrl: URL) {
  const explicitAdminUrl = process.env.LOCAL_DATABASE_ADMIN_URL?.trim();

  if (explicitAdminUrl) {
    return new URL(explicitAdminUrl);
  }

  const adminUrl = new URL(targetUrl.toString());
  adminUrl.pathname = '/postgres';
  adminUrl.search = '';
  adminUrl.hash = '';
  return adminUrl;
}

async function ensureLocalDatabase(action: 'create' | 'reset') {
  const configuredUrl = getConfiguredDatabaseUrl();

  if (!configuredUrl) {
    throw new Error('Set LOCAL_DATABASE_URL or DATABASE_URL before managing the local database.');
  }

  const targetUrl = new URL(configuredUrl);
  const databaseName = decodeURIComponent(targetUrl.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('The configured database URL must include a database name.');
  }

  const adminUrl = getAdminDatabaseUrl(targetUrl);
  const sql = postgres(adminUrl.toString(), {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    if (action === 'reset') {
      console.log(`Resetting local database "${databaseName}"...`);

      await sql.unsafe(
        `
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = $1
            AND pid <> pg_backend_pid()
        `,
        [databaseName],
      );

      await sql.unsafe(`DROP DATABASE IF EXISTS "${databaseName.replace(/"/g, '""')}"`);
    } else {
      console.log(`Creating local database "${databaseName}" if needed...`);
    }

    await sql.unsafe(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
    console.log(`Database "${databaseName}" is ready.`);
  } catch (error) {
    if (
      action === 'create' &&
      error instanceof postgres.PostgresError &&
      error.code === '42P04'
    ) {
      console.log(`Database "${databaseName}" already exists.`);
      return;
    }

    throw error;
  } finally {
    await sql.end();
  }
}

async function run() {
  const action = process.argv[2];

  if (action !== 'create' && action !== 'reset') {
    throw new Error('Pass "create" or "reset" to manage-local-db.ts.');
  }

  await ensureLocalDatabase(action);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
