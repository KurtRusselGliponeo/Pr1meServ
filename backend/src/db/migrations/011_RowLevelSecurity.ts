import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

const upStatements = [
  // Enable RLS on core tables
  `ALTER TABLE "ClientProfiles" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "AgentProfiles" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "PerformanceMetrics" ENABLE ROW LEVEL SECURITY`,

  // Drop-before-create pattern: Postgres < 17 has no CREATE POLICY IF NOT EXISTS,
  // so we drop each policy first to make this migration idempotent on re-runs.
  `DROP POLICY IF EXISTS client_profiles_isolation_policy ON "ClientProfiles"`,
  `CREATE POLICY client_profiles_isolation_policy ON "ClientProfiles"
   FOR ALL
   USING (
     "AssignedAgentId"::text = current_setting('app.current_agent_id', true)
     OR current_setting('app.current_role', true) = 'branch_manager'
     OR current_setting('app.current_role', true) = 'admin'
   )`,

  `DROP POLICY IF EXISTS agent_profiles_isolation_policy ON "AgentProfiles"`,
  `CREATE POLICY agent_profiles_isolation_policy ON "AgentProfiles"
   FOR ALL
   USING (
     "Id"::text = current_setting('app.current_agent_id', true)
     OR current_setting('app.current_role', true) = 'branch_manager'
     OR current_setting('app.current_role', true) = 'admin'
   )`,

  `DROP POLICY IF EXISTS performance_metrics_isolation_policy ON "PerformanceMetrics"`,
  `CREATE POLICY performance_metrics_isolation_policy ON "PerformanceMetrics"
   FOR ALL
   USING (
     "AgentId"::text = current_setting('app.current_agent_id', true)
     OR current_setting('app.current_role', true) = 'branch_manager'
     OR current_setting('app.current_role', true) = 'admin'
   )`,
];

const downStatements = [
  `DROP POLICY IF EXISTS performance_metrics_isolation_policy ON "PerformanceMetrics";`,
  `DROP POLICY IF EXISTS agent_profiles_isolation_policy ON "AgentProfiles";`,
  `DROP POLICY IF EXISTS client_profiles_isolation_policy ON "ClientProfiles";`,

  `ALTER TABLE "PerformanceMetrics" DISABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "AgentProfiles" DISABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE "ClientProfiles" DISABLE ROW LEVEL SECURITY;`,
];

export const rowLevelSecurityMigration: MigrationDefinition = {
  id: '011_RowLevelSecurity',
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
