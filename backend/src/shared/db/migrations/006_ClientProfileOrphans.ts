import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  'ALTER TABLE "ClientProfiles" DROP CONSTRAINT IF EXISTS "fk_clientprofiles_assignedagentid"',
  'ALTER TABLE "ClientProfiles" ALTER COLUMN "AssignedAgentId" DROP NOT NULL',
  'ALTER TABLE "ClientProfiles" ADD CONSTRAINT "fk_clientprofiles_assignedagentid" FOREIGN KEY ("AssignedAgentId") REFERENCES "AgentProfiles"("Id") ON DELETE SET NULL',
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
