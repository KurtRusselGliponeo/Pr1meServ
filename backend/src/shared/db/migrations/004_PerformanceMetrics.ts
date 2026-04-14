import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `CREATE TABLE IF NOT EXISTS "PerformanceMetrics" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "AgentId" uuid NOT NULL,
    "RecordMonth" varchar(7) NOT NULL,
    "ModalPremium" decimal(19,4) NOT NULL,
    "Api" decimal(19,4) NOT NULL,
    "SumAssured" decimal(19,4) NOT NULL,
    "CommissionAmount" decimal(19,4) NOT NULL,
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    CONSTRAINT "fk_perfmetrics_agentid" FOREIGN KEY ("AgentId") REFERENCES "AgentProfiles"("Id") ON DELETE RESTRICT
  )`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perfmetrics_agentid ON "PerformanceMetrics"("AgentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_perfmetrics_agent_month ON "PerformanceMetrics"("AgentId", "RecordMonth")',
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_perfmetrics_agent_month',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_perfmetrics_agentid',
  'ALTER TABLE IF EXISTS "PerformanceMetrics" DROP CONSTRAINT IF EXISTS "fk_perfmetrics_agentid"',
  'DROP TABLE IF EXISTS "PerformanceMetrics"',
];

export const performanceMetricsMigration: MigrationDefinition = {
  id: '004_PerformanceMetrics',
  async up(sql: Sql) {
    // Raw SQL is required because the migration needs explicit CONCURRENTLY indexes and rollback support.
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    // Raw SQL is required to remove the FK and both indexes explicitly before the table is dropped.
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
