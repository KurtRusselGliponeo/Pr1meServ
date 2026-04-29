import type { Sql } from 'postgres';

import type { MigrationDefinition } from './types';

const upStatements = [
  `CREATE TABLE IF NOT EXISTS "ClientProfiles" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "AssignedAgentId" uuid NOT NULL,
    "FirstName" varchar(100) NOT NULL,
    "LastName" varchar(100) NOT NULL,
    "PolicyNumber" varchar(50) NOT NULL,
    "ModalPremium" decimal(19,4) NOT NULL,
    "Api" decimal(19,4) NOT NULL,
    "SumAssured" decimal(19,4) NOT NULL,
    "CommissionAmount" decimal(19,4) NOT NULL,
    "CaseStatus" varchar(32) NOT NULL,
    "PolicyStatus" varchar(32) NOT NULL,
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "DeletedAtUtc" timestamptz,
    CONSTRAINT "ux_clientprofiles_policynumber" UNIQUE ("PolicyNumber"),
    CONSTRAINT "chk_clientprofiles_casestatus" CHECK ("CaseStatus" IN ('Uncontacted', 'Contacted', 'Submitted', 'Reviewed', 'Completed', 'Returned')),
    CONSTRAINT "chk_clientprofiles_policystatus" CHECK ("PolicyStatus" IN ('Active', 'Lapsed', 'Cancelled', 'Matured')),
    CONSTRAINT "fk_clientprofiles_assignedagentid" FOREIGN KEY ("AssignedAgentId") REFERENCES "AgentProfiles"("Id") ON DELETE RESTRICT
  )`,
  // Local fresh-install compatibility:
  // align the bootstrap table with the current schema expected by later migrations and the rich seed.
  `ALTER TABLE "ClientProfiles"
   ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED'`,
  `ALTER TABLE "ClientProfiles"
   ADD COLUMN IF NOT EXISTS "ProductType" varchar(120)`,
  `ALTER TABLE "ClientProfiles"
   ADD COLUMN IF NOT EXISTS "PlanCode" varchar(50)`,
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_agentid ON "ClientProfiles"("AssignedAgentId")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_active ON "ClientProfiles"("AssignedAgentId") WHERE "DeletedAtUtc" IS NULL',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_agent_status ON "ClientProfiles"("AssignedAgentId", "PolicyStatus")',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clientprofiles_branchcode ON "ClientProfiles"("BranchCode")',
];

const downStatements = [
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_branchcode',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_agent_status',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_active',
  'DROP INDEX CONCURRENTLY IF EXISTS idx_clientprofiles_agentid',
  'ALTER TABLE IF EXISTS "ClientProfiles" DROP COLUMN IF EXISTS "PlanCode"',
  'ALTER TABLE IF EXISTS "ClientProfiles" DROP COLUMN IF EXISTS "ProductType"',
  'ALTER TABLE IF EXISTS "ClientProfiles" DROP COLUMN IF EXISTS "BranchCode"',
  'ALTER TABLE IF EXISTS "ClientProfiles" DROP CONSTRAINT IF EXISTS "fk_clientprofiles_assignedagentid"',
  'DROP TABLE IF EXISTS "ClientProfiles"',
];

export const clientProfilesMigration: MigrationDefinition = {
  id: '003_ClientProfiles',
  async up(sql: Sql) {
    // Raw SQL is required because this migration needs DB-level CHECK constraints and CONCURRENTLY indexes.
    for (const statement of upStatements) {
      await sql.unsafe(statement);
    }
  },
  async down(sql: Sql) {
    // Raw SQL is required so every index and FK is removed explicitly before dropping the table.
    for (const statement of downStatements) {
      await sql.unsafe(statement);
    }
  },
};
