import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

/**
 * Migration 012 — Application-enforced Row Level Security
 *
 * IMPORTANT: The application connects as a superuser (postgres) which bypasses
 * RLS by default. To activate isolation for a specific query you must SET LOCAL
 * the app.* GUC variables inside a transaction BEFORE executing the query.
 *
 * The RLS helper in src/shared/lib/rls.ts provides a typed wrapper for this.
 *
 * These policies form the SECOND layer of data isolation — the first being the
 * WHERE clause filters already present in every service query.
 *
 * Policy matrix:
 * ┌─────────────────────┬───────────────────────────────────────────────────┐
 * │ Table               │ Isolation rule                                    │
 * ├─────────────────────┼───────────────────────────────────────────────────┤
 * │ ClientProfiles      │ Agent sees only own; BM/Admin see all             │
 * │ AgentProfiles       │ Agent sees only own; BM/Admin see all             │
 * │ PerformanceMetrics  │ Agent sees only own; BM/Admin see all             │
 * │ LapsationRecords    │ Agent sees only records linked to own clients     │
 * │ CosafApprovals      │ BM sees only own queue; Admin sees all            │
 * │ DocumentLibrary     │ All authenticated users can read; BM/Admin write  │
 * └─────────────────────┴───────────────────────────────────────────────────┘
 */

const upStatements = [
  // ── Enable RLS ────────────────────────────────────────────────────────────
  `ALTER TABLE "ClientProfiles"     ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "AgentProfiles"      ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "PerformanceMetrics" ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "LapsationRecords"   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CosafApprovals"     ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "DocumentLibrary"    ENABLE ROW LEVEL SECURITY`,

  // ── ClientProfiles ────────────────────────────────────────────────────────
  // Drop-before-create: Postgres < 17 has no CREATE POLICY IF NOT EXISTS.
  `DROP POLICY IF EXISTS rls_client_profiles_select ON "ClientProfiles"`,
  `CREATE POLICY rls_client_profiles_select
   ON "ClientProfiles"
   FOR SELECT
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
     OR "AssignedAgentId"::text = current_setting('app.current_agent_id', true)
     OR current_setting('app.current_agent_id', true) IS NULL
   )`,

  `DROP POLICY IF EXISTS rls_client_profiles_insert ON "ClientProfiles"`,
  `CREATE POLICY rls_client_profiles_insert
   ON "ClientProfiles"
   FOR INSERT
   WITH CHECK (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
   )`,

  `DROP POLICY IF EXISTS rls_client_profiles_update ON "ClientProfiles"`,
  `CREATE POLICY rls_client_profiles_update
   ON "ClientProfiles"
   FOR UPDATE
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
     OR "AssignedAgentId"::text = current_setting('app.current_agent_id', true)
   )`,

  `DROP POLICY IF EXISTS rls_client_profiles_delete ON "ClientProfiles"`,
  `CREATE POLICY rls_client_profiles_delete
   ON "ClientProfiles"
   FOR DELETE
   USING (
     current_setting('app.current_role', true) = 'admin'
   )`,

  // ── AgentProfiles ─────────────────────────────────────────────────────────
  `DROP POLICY IF EXISTS rls_agent_profiles_select ON "AgentProfiles"`,
  `CREATE POLICY rls_agent_profiles_select
   ON "AgentProfiles"
   FOR SELECT
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
     OR "Id"::text = current_setting('app.current_agent_id', true)
     OR current_setting('app.current_agent_id', true) IS NULL
   )`,

  `DROP POLICY IF EXISTS rls_agent_profiles_update ON "AgentProfiles"`,
  `CREATE POLICY rls_agent_profiles_update
   ON "AgentProfiles"
   FOR UPDATE
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
     OR "Id"::text = current_setting('app.current_agent_id', true)
   )`,

  // ── PerformanceMetrics ────────────────────────────────────────────────────
  `DROP POLICY IF EXISTS rls_perf_metrics_select ON "PerformanceMetrics"`,
  `CREATE POLICY rls_perf_metrics_select
   ON "PerformanceMetrics"
   FOR SELECT
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
     OR "AgentId"::text = current_setting('app.current_agent_id', true)
     OR current_setting('app.current_agent_id', true) IS NULL
   )`,

  `DROP POLICY IF EXISTS rls_perf_metrics_write ON "PerformanceMetrics"`,
  `CREATE POLICY rls_perf_metrics_write
   ON "PerformanceMetrics"
   FOR ALL
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
   )`,

  // ── LapsationRecords ──────────────────────────────────────────────────────
  `DROP POLICY IF EXISTS rls_lapsation_select ON "LapsationRecords"`,
  `CREATE POLICY rls_lapsation_select
   ON "LapsationRecords"
   FOR SELECT
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
     OR current_setting('app.current_agent_id', true) IS NULL
     OR EXISTS (
       SELECT 1 FROM "ClientProfiles" cp
       WHERE cp."Id" = "LapsationRecords"."PolicyNumberId"
         AND cp."AssignedAgentId"::text = current_setting('app.current_agent_id', true)
     )
   )`,

  `DROP POLICY IF EXISTS rls_lapsation_write ON "LapsationRecords"`,
  `CREATE POLICY rls_lapsation_write
   ON "LapsationRecords"
   FOR ALL
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
   )`,

  // ── CosafApprovals ────────────────────────────────────────────────────────
  `DROP POLICY IF EXISTS rls_cosaf_select ON "CosafApprovals"`,
  `CREATE POLICY rls_cosaf_select
   ON "CosafApprovals"
   FOR SELECT
   USING (
     current_setting('app.current_role', true) = 'admin'
     OR (
       current_setting('app.current_role', true) = 'branch_manager'
       AND "ReviewingBmId"::text = current_setting('app.current_user_id', true)
     )
     OR current_setting('app.current_user_id', true) IS NULL
   )`,

  `DROP POLICY IF EXISTS rls_cosaf_write ON "CosafApprovals"`,
  `CREATE POLICY rls_cosaf_write
   ON "CosafApprovals"
   FOR ALL
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
   )`,

  // ── DocumentLibrary — All authenticated users may read; BM/Admin may write ─
  `DROP POLICY IF EXISTS rls_docs_select ON "DocumentLibrary"`,
  `CREATE POLICY rls_docs_select
   ON "DocumentLibrary"
   FOR SELECT
   USING (true)`,

  `DROP POLICY IF EXISTS rls_docs_write ON "DocumentLibrary"`,
  `CREATE POLICY rls_docs_write
   ON "DocumentLibrary"
   FOR ALL
   USING (
     current_setting('app.current_role', true) IN ('branch_manager', 'admin')
   )`,
];

const downStatements = [
  // Drop policies in reverse order
  `DROP POLICY IF EXISTS rls_docs_write          ON "DocumentLibrary"`,
  `DROP POLICY IF EXISTS rls_docs_select         ON "DocumentLibrary"`,
  `DROP POLICY IF EXISTS rls_cosaf_write         ON "CosafApprovals"`,
  `DROP POLICY IF EXISTS rls_cosaf_select        ON "CosafApprovals"`,
  `DROP POLICY IF EXISTS rls_lapsation_write     ON "LapsationRecords"`,
  `DROP POLICY IF EXISTS rls_lapsation_select    ON "LapsationRecords"`,
  `DROP POLICY IF EXISTS rls_perf_metrics_write  ON "PerformanceMetrics"`,
  `DROP POLICY IF EXISTS rls_perf_metrics_select ON "PerformanceMetrics"`,
  `DROP POLICY IF EXISTS rls_agent_profiles_update ON "AgentProfiles"`,
  `DROP POLICY IF EXISTS rls_agent_profiles_select ON "AgentProfiles"`,
  `DROP POLICY IF EXISTS rls_client_profiles_delete ON "ClientProfiles"`,
  `DROP POLICY IF EXISTS rls_client_profiles_update ON "ClientProfiles"`,
  `DROP POLICY IF EXISTS rls_client_profiles_insert ON "ClientProfiles"`,
  `DROP POLICY IF EXISTS rls_client_profiles_select ON "ClientProfiles"`,
  // Disable RLS
  `ALTER TABLE "DocumentLibrary"    DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "CosafApprovals"     DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "LapsationRecords"   DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "PerformanceMetrics" DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "AgentProfiles"      DISABLE ROW LEVEL SECURITY`,
  `ALTER TABLE "ClientProfiles"     DISABLE ROW LEVEL SECURITY`,
];

export const rlsPoliciesMigration: MigrationDefinition = {
  id: '012_RlsPolicies',
  async up(sql: Sql) {
    for (const stmt of upStatements) {
      await sql.unsafe(stmt);
    }
  },
  async down(sql: Sql) {
    for (const stmt of downStatements) {
      await sql.unsafe(stmt);
    }
  },
};
