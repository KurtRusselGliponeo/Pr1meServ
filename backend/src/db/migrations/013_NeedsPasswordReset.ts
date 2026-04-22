import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

export const needsPasswordResetMigration: MigrationDefinition = {
  id: '013_NeedsPasswordReset',
  async up(sql: Sql) {
    await sql.unsafe(`
      ALTER TABLE "UserAccounts"
      ADD COLUMN IF NOT EXISTS "NeedsPasswordReset" boolean NOT NULL DEFAULT true
    `);
  },
  async down(sql: Sql) {
    await sql.unsafe(`
      ALTER TABLE "UserAccounts"
      DROP COLUMN IF EXISTS "NeedsPasswordReset"
    `);
  },
};
