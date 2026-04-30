import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  'ALTER TABLE "ClientProfiles" DROP CONSTRAINT IF EXISTS "chk_clientprofiles_casestatus"',
  `ALTER TABLE "ClientProfiles"
   ADD CONSTRAINT "chk_clientprofiles_casestatus"
   CHECK ("CaseStatus" IN ('Uncontacted', 'Contacted', 'Forms Submitted', 'BM Signed', 'Done', 'Returned', 'Orphan'))`,
];

const downStatements = [
  'ALTER TABLE "ClientProfiles" DROP CONSTRAINT IF EXISTS "chk_clientprofiles_casestatus"',
  `ALTER TABLE "ClientProfiles"
   ADD CONSTRAINT "chk_clientprofiles_casestatus"
   CHECK ("CaseStatus" IN ('Uncontacted', 'Contacted', 'Submitted', 'Reviewed', 'Completed', 'Returned'))`,
];

export const clientProfileStatusesMigration: MigrationDefinition = {
  id: '008_ClientProfileStatuses',
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
