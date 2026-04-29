import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  // Local fresh-install compatibility:
  // later features assume these tables already exist, so bootstrap them here for clean local DBs.
  `CREATE TABLE IF NOT EXISTS "LapsationRecords" (
     "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "PolicyNumberId" uuid NOT NULL REFERENCES "ClientProfiles"("Id"),
     "IsAtRisk" boolean DEFAULT true NOT NULL,
     "ReinstatedAtUtc" timestamptz,
     "LapseDateUtc" timestamptz NOT NULL,
     "CreatedAtUtc" timestamptz DEFAULT now() NOT NULL
   )`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lapsation_policynumber ON "LapsationRecords"("PolicyNumberId")',
  `CREATE TABLE IF NOT EXISTS "CosafApprovals" (
     "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "ClientProfileId" uuid NOT NULL REFERENCES "ClientProfiles"("Id"),
     "ReviewingBmId" uuid NOT NULL REFERENCES "UserAccounts"("Id"),
     "Status" varchar(20) DEFAULT 'PENDING' NOT NULL,
     "Reason" varchar(500),
     "CreatedAtUtc" timestamptz DEFAULT now() NOT NULL
   )`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cosafapprovals_clientprofileid ON "CosafApprovals"("ClientProfileId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cosafapprovals_reviewingbmid ON "CosafApprovals"("ReviewingBmId")',
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perfmetrics_recordmonth_agent
   ON "PerformanceMetrics" ("RecordMonth", "AgentId")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perfmetrics_agent_recordmonth
   ON "PerformanceMetrics" ("AgentId", "RecordMonth")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lapsation_open_policy
   ON "LapsationRecords" ("PolicyNumberId")
   WHERE "ReinstatedAtUtc" IS NULL AND "IsAtRisk" = true`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_status_updated_active
   ON "ClientProfiles" ("CaseStatus", "UpdatedAtUtc" DESC)
   WHERE "DeletedAtUtc" IS NULL`,
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_status_updated_active',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_lapsation_open_policy',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_perfmetrics_agent_recordmonth',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_perfmetrics_recordmonth_agent',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_cosafapprovals_reviewingbmid',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_cosafapprovals_clientprofileid',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_lapsation_policynumber',
];

export const queryPerformanceIndexesMigration: MigrationDefinition = {
  id: '010_QueryPerformanceIndexes',
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
