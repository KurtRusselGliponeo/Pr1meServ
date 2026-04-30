import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `ALTER TABLE "ClientProfiles"
   ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED'`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_branch_updated_active
   ON "ClientProfiles" ("BranchCode", "UpdatedAtUtc" DESC, "CreatedAtUtc" DESC)
   WHERE "DeletedAtUtc" IS NULL`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_branch_status_updated_active
   ON "ClientProfiles" ("BranchCode", "CaseStatus", "UpdatedAtUtc" DESC)
   WHERE "DeletedAtUtc" IS NULL`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_branch_orphans_active
   ON "ClientProfiles" ("BranchCode", "UpdatedAtUtc" DESC)
   WHERE "AssignedAgentId" IS NULL AND "CaseStatus" = 'Orphan' AND "DeletedAtUtc" IS NULL`,
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_branch_orphans_active',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_branch_status_updated_active',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_branch_updated_active',
];

export const phaseNineFivePerformanceIndexesMigration: MigrationDefinition = {
  id: '019_PhaseNineFivePerformanceIndexes',
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
