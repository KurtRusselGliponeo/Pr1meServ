import { readFileSync } from 'fs';
import postgres from 'postgres';
import 'dotenv/config';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const sql = postgres(connectionString);
  const query = readFileSync('./src/db/migrations/generated/0001_black_thing.sql', 'utf8');

  try {
    console.log('Running generated schema patch...');
    // Split on statement-breakpoint and execute
    const statements = query.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const stmt of statements) {
      console.log('Executing:', stmt);
      try {
        await sql.unsafe(stmt);
      } catch (err: any) {
        if (err.code === '42P07' || err.code === '42701') {
          console.log('Already exists, skipping...');
        } else {
          throw err;
        }
      }
    }
    console.log('Patch complete.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

run();
