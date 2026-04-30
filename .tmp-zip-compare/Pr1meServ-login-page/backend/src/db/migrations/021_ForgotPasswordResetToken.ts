import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `ALTER TABLE "UserAccounts"
    ADD COLUMN IF NOT EXISTS "PasswordResetTokenHash" varchar(64)`,
  `ALTER TABLE "UserAccounts"
    ADD COLUMN IF NOT EXISTS "PasswordResetTokenExpiresAtUtc" timestamptz`,
];

const downStatements = [
  `ALTER TABLE "UserAccounts"
    DROP COLUMN IF EXISTS "PasswordResetTokenExpiresAtUtc"`,
  `ALTER TABLE "UserAccounts"
    DROP COLUMN IF EXISTS "PasswordResetTokenHash"`,
];

export const forgotPasswordResetTokenMigration: MigrationDefinition = {
  id: '021_ForgotPasswordResetToken',
  async up(sql: Sql) {
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
