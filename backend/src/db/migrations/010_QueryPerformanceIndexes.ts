import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
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
