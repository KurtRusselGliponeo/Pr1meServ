import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `ALTER TABLE "Prospects" ALTER COLUMN "PipelineStage" DROP DEFAULT`,
  `ALTER TABLE "AgentProfiles" ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED'`,
  `ALTER TABLE "Prospects"
   ALTER COLUMN "PipelineStage" TYPE varchar(50)
   USING "PipelineStage"::text`,
  `UPDATE "Prospects"
   SET "PipelineStage" = CASE
     WHEN "PipelineStage" = 'Agreed' THEN 'Client Agreed'
     WHEN "PipelineStage" = 'Cold Prospect' THEN 'Contacted'
     ELSE "PipelineStage"
   END`,
  `DROP TYPE IF EXISTS "ProspectPipelineStage"`,
  `DO $$ BEGIN
      CREATE TYPE "ProspectPipelineStage" AS ENUM ('Contacted', 'Client Agreed', 'Presentation', 'Approved', 'Closed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,
  `ALTER TABLE "Prospects"
   ALTER COLUMN "PipelineStage" TYPE "ProspectPipelineStage"
   USING "PipelineStage"::"ProspectPipelineStage"`,
  `ALTER TABLE "Prospects"
   ALTER COLUMN "PipelineStage" SET DEFAULT 'Contacted'`,
  `ALTER TABLE "Prospects" ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED'`,
  `ALTER TABLE "Prospects" ADD COLUMN IF NOT EXISTS "Email" varchar(255)`,
  `ALTER TABLE "Prospects" ADD COLUMN IF NOT EXISTS "Notes" varchar(4000)`,
  `ALTER TABLE "Prospects" ADD COLUMN IF NOT EXISTS "FollowUpDateUtc" timestamptz`,
  `ALTER TABLE "Prospects" ADD COLUMN IF NOT EXISTS "LastContactedAtUtc" timestamptz`,
  `UPDATE "Prospects" p
   SET "BranchCode" = COALESCE(ap."BranchCode", 'UNASSIGNED')
   FROM "AgentProfiles" ap
   WHERE ap."AgentCode" = p."AgentCode"`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospects_branch_code ON "Prospects"("BranchCode")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospects_followup ON "Prospects"("FollowUpDateUtc")`,
];

const downStatements = [
  `DROP INDEX CONCURRENTLY IF EXISTS idx_prospects_followup`,
  `DROP INDEX CONCURRENTLY IF EXISTS idx_prospects_branch_code`,
  `ALTER TABLE "Prospects" DROP COLUMN IF EXISTS "LastContactedAtUtc"`,
  `ALTER TABLE "Prospects" DROP COLUMN IF EXISTS "FollowUpDateUtc"`,
  `ALTER TABLE "Prospects" DROP COLUMN IF EXISTS "Notes"`,
  `ALTER TABLE "Prospects" DROP COLUMN IF EXISTS "Email"`,
  `ALTER TABLE "Prospects" DROP COLUMN IF EXISTS "BranchCode"`,
];

export const phaseTenProspectingMigration: MigrationDefinition = {
  id: '020_PhaseTenProspecting',
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
