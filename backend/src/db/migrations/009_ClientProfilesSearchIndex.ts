import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

const upStatements = [
  `ALTER TABLE "ClientProfiles"
   ADD COLUMN IF NOT EXISTS "SearchVector" tsvector
   GENERATED ALWAYS AS (
     setweight(to_tsvector('english', coalesce("PolicyNumber", '')), 'A') ||
     setweight(to_tsvector('simple', coalesce("LastName", '')), 'B') ||
     setweight(to_tsvector('simple', coalesce("FirstName", '')), 'C')
   ) STORED`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_fts
   ON "ClientProfiles" USING GIN ("SearchVector")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_agent_status_active
   ON "ClientProfiles" ("AssignedAgentId", "CaseStatus")
   WHERE "DeletedAtUtc" IS NULL`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_agent_updated
   ON "ClientProfiles" ("AssignedAgentId", "UpdatedAtUtc" DESC, "CreatedAtUtc" DESC)
   WHERE "DeletedAtUtc" IS NULL`,
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
