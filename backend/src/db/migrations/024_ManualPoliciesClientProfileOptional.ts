import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

const upStatements = [
  `ALTER TABLE "Policies"
    ALTER COLUMN "ClientProfileId" DROP NOT NULL`,
];

const downStatements = [
  `ALTER TABLE "Policies"
    ALTER COLUMN "ClientProfileId" SET NOT NULL`,
];

export const manualPoliciesClientProfileOptionalMigration: MigrationDefinition = {
  id: '024_ManualPoliciesClientProfileOptional',
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
