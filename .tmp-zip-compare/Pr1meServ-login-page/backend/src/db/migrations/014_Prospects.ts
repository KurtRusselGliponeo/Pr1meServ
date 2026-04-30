import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

const upStatements = [
  `DO $$ BEGIN
      CREATE TYPE "ProspectTemperature" AS ENUM ('Warm', 'Cold');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,
  `DO $$ BEGIN
      CREATE TYPE "ProspectPipelineStage" AS ENUM ('Cold Prospect', 'Contacted', 'Presentation', 'Agreed', 'Closed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;`,
  `CREATE TABLE IF NOT EXISTS "Prospects" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "AgentCode" varchar(50) NOT NULL,
    "ClientName" varchar(200) NOT NULL,
    "ContactNumber" varchar(50) NOT NULL,
    "Temperature" "ProspectTemperature" NOT NULL,
    "PipelineStage" "ProspectPipelineStage" NOT NULL DEFAULT 'Cold Prospect',
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL
  )`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospects_agent_code ON "Prospects"("AgentCode")`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prospects_stage ON "Prospects"("PipelineStage")`,
];

const downStatements = [
  `DROP INDEX CONCURRENTLY IF EXISTS idx_prospects_stage`,
  `DROP INDEX CONCURRENTLY IF EXISTS idx_prospects_agent_code`,
  `DROP TABLE IF EXISTS "Prospects"`,
  `DROP TYPE IF EXISTS "ProspectPipelineStage"`,
  `DROP TYPE IF EXISTS "ProspectTemperature"`,
];

export const prospectsMigration: MigrationDefinition = {
  id: '014_Prospects',
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
