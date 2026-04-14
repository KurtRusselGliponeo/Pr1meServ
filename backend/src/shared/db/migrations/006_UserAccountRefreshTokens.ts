import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  'ALTER TABLE "UserAccounts" ADD COLUMN IF NOT EXISTS "RefreshTokenHash" varchar(64)',
  'ALTER TABLE "UserAccounts" ADD COLUMN IF NOT EXISTS "RefreshTokenExpiresAtUtc" timestamptz',
];

const downStatements = [
  'ALTER TABLE "UserAccounts" DROP COLUMN IF EXISTS "RefreshTokenExpiresAtUtc"',
  'ALTER TABLE "UserAccounts" DROP COLUMN IF EXISTS "RefreshTokenHash"',
];

export const userAccountRefreshTokensMigration: MigrationDefinition = {
  id: '006_UserAccountRefreshTokens',
  async up(sql: Sql) {
    // Raw SQL is required because this change must be safely additive against existing databases.
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    // Raw SQL is required so the rollback removes the added columns explicitly.
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
