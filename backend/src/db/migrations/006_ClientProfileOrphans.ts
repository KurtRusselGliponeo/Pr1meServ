import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  // Check if constraint exists and drop it if it has the wrong behavior
  `DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = '"ClientProfiles"'::regclass
      AND conname = 'fk_clientprofiles_assignedagentid'
      AND pg_get_constraintdef(oid) NOT LIKE '%ON DELETE SET NULL%'
    ) THEN
      ALTER TABLE "ClientProfiles" DROP CONSTRAINT "fk_clientprofiles_assignedagentid";
    END IF;
  END $$`,
  // Make column nullable if it's not already
  `DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ClientProfiles'
      AND column_name = 'AssignedAgentId'
      AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE "ClientProfiles" ALTER COLUMN "AssignedAgentId" DROP NOT NULL;
    END IF;
  END $$`,
  // Add constraint if it doesn't exist
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = '"ClientProfiles"'::regclass
      AND conname = 'fk_clientprofiles_assignedagentid'
    ) THEN
      ALTER TABLE "ClientProfiles" ADD CONSTRAINT "fk_clientprofiles_assignedagentid" FOREIGN KEY ("AssignedAgentId") REFERENCES "AgentProfiles"("Id") ON DELETE SET NULL;
    END IF;
  END $$`,
];

const downStatements = [
  `UPDATE "ClientProfiles"
   SET "AssignedAgentId" = (
     SELECT "Id" FROM "AgentProfiles" ORDER BY "CreatedAtUtc" ASC LIMIT 1
   )
   WHERE "AssignedAgentId" IS NULL`,
  'ALTER TABLE "ClientProfiles" DROP CONSTRAINT IF EXISTS "fk_clientprofiles_assignedagentid"',
  'ALTER TABLE "ClientProfiles" ALTER COLUMN "AssignedAgentId" SET NOT NULL',
  'ALTER TABLE "ClientProfiles" ADD CONSTRAINT "fk_clientprofiles_assignedagentid" FOREIGN KEY ("AssignedAgentId") REFERENCES "AgentProfiles"("Id") ON DELETE RESTRICT',
];

export const clientProfileOrphansMigration: MigrationDefinition = {
  id: '006_ClientProfileOrphans',
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
