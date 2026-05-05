import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

const upStatements = [
  // Add extra columns to ClientProfiles for per-policy tracking
  `ALTER TABLE "ClientProfiles"
    ADD COLUMN IF NOT EXISTS "DateIssued" date,
    ADD COLUMN IF NOT EXISTS "DateClosed" date,
    ADD COLUMN IF NOT EXISTS "Notes" text,
    ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'A1PRIME'`,
];

const downStatements = [
  `ALTER TABLE "ClientProfiles"
    DROP COLUMN IF EXISTS "DateIssued",
    DROP COLUMN IF EXISTS "DateClosed",
    DROP COLUMN IF EXISTS "Notes",
    DROP COLUMN IF EXISTS "BranchCode"`,
];

export const policyRecordsMigration: MigrationDefinition = {
  id: '022_PolicyRecordsAdminFields',
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
