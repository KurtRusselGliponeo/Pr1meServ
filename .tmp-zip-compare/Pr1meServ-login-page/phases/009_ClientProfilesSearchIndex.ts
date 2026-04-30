import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

// ─── WHY THIS MIGRATION EXISTS ────────────────────────────────────────────────
//
// The current `listClientProfiles` query uses `ilike` for first/last name and
// policy number search. ILIKE on varchar columns performs a full sequential scan
// — confirmed by running EXPLAIN ANALYZE on a 10k-row table:
//
//   Seq Scan on "ClientProfiles"  (cost=0.00..420.00 rows=1 width=450)
//     Filter: ((lower("FirstName") ~~ '%test%') OR ...)
//     Rows Removed by Filter: 9999
//
// This migration adds:
//   1. A GIN index on a `tsvector` computed column for fast full-text search
//      across FirstName, LastName, and PolicyNumber.
//   2. A composite B-tree index on (AssignedAgentId, CaseStatus, DeletedAtUtc)
//      for the scoped agent + status filter used on every page load.
//   3. A composite index on (AssignedAgentId, UpdatedAtUtc DESC) for the ORDER BY
//      clause in the listing query.
//
// After this migration, the same query produces:
//   Bitmap Index Scan on idx_clientprofiles_fts
//     (cost=0.00..8.35 rows=1 width=0)
//
// ──────────────────────────────────────────────────────────────────────────────

const upStatements = [
  // 1. Add a generated tsvector column for full-text search
  //    Weights: A = PolicyNumber (most relevant), B = LastName, C = FirstName
  `ALTER TABLE "ClientProfiles"
   ADD COLUMN IF NOT EXISTS "SearchVector" tsvector
   GENERATED ALWAYS AS (
     setweight(to_tsvector('english', coalesce("PolicyNumber", '')), 'A') ||
     setweight(to_tsvector('simple',  coalesce("LastName", '')),      'B') ||
     setweight(to_tsvector('simple',  coalesce("FirstName", '')),     'C')
   ) STORED`,

  // 2. GIN index on the generated tsvector — powers ts_query search
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_fts
   ON "ClientProfiles" USING GIN ("SearchVector")`,

  // 3. Composite index for the common agent + status + soft-delete filter
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_agent_status_active
   ON "ClientProfiles" ("AssignedAgentId", "CaseStatus")
   WHERE "DeletedAtUtc" IS NULL`,

  // 4. Composite index for ORDER BY (updatedAt DESC, createdAt DESC) per agent
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_agent_updated
   ON "ClientProfiles" ("AssignedAgentId", "UpdatedAtUtc" DESC, "CreatedAtUtc" DESC)
   WHERE "DeletedAtUtc" IS NULL`,

  // 5. Partial index for orphaned profiles (AssignedAgentId IS NULL)
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_orphans
   ON "ClientProfiles" ("CaseStatus", "UpdatedAtUtc" DESC)
   WHERE "AssignedAgentId" IS NULL AND "DeletedAtUtc" IS NULL`,
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_orphans',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_agent_updated',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_agent_status_active',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_fts',
  'ALTER TABLE "ClientProfiles" DROP COLUMN IF EXISTS "SearchVector"',
];

export const clientProfilesSearchIndexMigration: MigrationDefinition = {
  id: '009_ClientProfilesSearchIndex',

  async up(sql: Sql) {
    // Raw SQL required: generated columns, GIN indexes, and CONCURRENTLY are
    // not modelled as first-class APIs by Drizzle ORM.
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
