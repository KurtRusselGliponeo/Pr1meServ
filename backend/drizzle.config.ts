import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/schema.ts',
  out: './src/shared/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Verbose output during migrations
  verbose: true,
  strict: true,
} satisfies Config;
