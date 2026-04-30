import type { MigrationDefinition } from './types';

const up = [
  `
    ALTER TABLE "AgentProfiles"
    ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED';
  `,
  `
    ALTER TABLE "AgentProfiles"
    ADD COLUMN IF NOT EXISTS "ProfileImageKey" varchar(255);
  `,
  `
    ALTER TABLE "ClientProfiles"
    ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50) NOT NULL DEFAULT 'UNASSIGNED';
  `,
  `
    ALTER TABLE "ClientProfiles"
    ADD COLUMN IF NOT EXISTS "ProductType" varchar(120);
  `,
  `
    ALTER TABLE "ClientProfiles"
    ADD COLUMN IF NOT EXISTS "PlanCode" varchar(50);
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_agentprofiles_branchcode" ON "AgentProfiles" ("BranchCode");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_clientprofiles_branchcode" ON "ClientProfiles" ("BranchCode");
  `,
  `
    CREATE TABLE IF NOT EXISTS "Policies" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "ClientProfileId" uuid NOT NULL REFERENCES "ClientProfiles"("Id"),
      "PolicyNumber" varchar(50) NOT NULL UNIQUE,
      "BranchCode" varchar(50) NOT NULL,
      "ProductType" varchar(120),
      "PlanCode" varchar(50),
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW(),
      "UpdatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_policies_clientprofileid" ON "Policies" ("ClientProfileId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_policies_branchcode" ON "Policies" ("BranchCode");
  `,
  `
    CREATE TABLE IF NOT EXISTS "PolicyTransactions" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "PolicyId" uuid NOT NULL REFERENCES "Policies"("Id"),
      "SourceType" varchar(20) NOT NULL,
      "SourceRecordId" uuid,
      "TransactionType" varchar(100) NOT NULL,
      "TransactionStatus" varchar(100),
      "EffectiveAtUtc" timestamptz,
      "Payload" text,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_policytransactions_policyid" ON "PolicyTransactions" ("PolicyId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_policytransactions_sourcetype" ON "PolicyTransactions" ("SourceType");
  `,
  `
    CREATE TABLE IF NOT EXISTS "ClientAssignmentHistory" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "ClientProfileId" uuid NOT NULL REFERENCES "ClientProfiles"("Id"),
      "FromAgentId" uuid REFERENCES "AgentProfiles"("Id"),
      "ToAgentId" uuid REFERENCES "AgentProfiles"("Id"),
      "ActorUserId" uuid REFERENCES "UserAccounts"("Id"),
      "BranchCode" varchar(50) NOT NULL,
      "Reason" text,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "Notifications" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "UserId" uuid REFERENCES "UserAccounts"("Id"),
      "Channel" varchar(30) NOT NULL,
      "Subject" varchar(255) NOT NULL,
      "Message" text NOT NULL,
      "Status" varchar(30) NOT NULL,
      "Metadata" text,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_notifications_userid" ON "Notifications" ("UserId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_notifications_status" ON "Notifications" ("Status");
  `,
  `
    CREATE TABLE IF NOT EXISTS "ImportValidationIssues" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "SourceType" varchar(20) NOT NULL,
      "IssueCode" varchar(80) NOT NULL,
      "Severity" varchar(20) NOT NULL DEFAULT 'error',
      "ExternalKey" varchar(255),
      "Details" text NOT NULL,
      "RawPayload" text,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_importissues_source" ON "ImportValidationIssues" ("SourceType");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_importissues_code" ON "ImportValidationIssues" ("IssueCode");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_clientassignmenthistory_client" ON "ClientAssignmentHistory" ("ClientProfileId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_clientassignmenthistory_actor" ON "ClientAssignmentHistory" ("ActorUserId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_clientassignmenthistory_branch" ON "ClientAssignmentHistory" ("BranchCode");
  `,
  `
    INSERT INTO "ClientAssignmentHistory" ("ClientProfileId", "FromAgentId", "ToAgentId", "ActorUserId", "BranchCode", "Reason", "CreatedAtUtc")
    SELECT
      cp."Id",
      NULL,
      cp."AssignedAgentId",
      NULL,
      COALESCE(ap."BranchCode", cp."BranchCode", 'UNASSIGNED'),
      'Initial backfill',
      cp."CreatedAtUtc"
    FROM "ClientProfiles" cp
    LEFT JOIN "AgentProfiles" ap ON ap."Id" = cp."AssignedAgentId"
    WHERE NOT EXISTS (
      SELECT 1 FROM "ClientAssignmentHistory" cah WHERE cah."ClientProfileId" = cp."Id"
    );
  `,
  `
    INSERT INTO "Policies" ("ClientProfileId", "PolicyNumber", "BranchCode", "ProductType", "PlanCode", "CreatedAtUtc", "UpdatedAtUtc")
    SELECT
      cp."Id",
      cp."PolicyNumber",
      cp."BranchCode",
      cp."ProductType",
      cp."PlanCode",
      cp."CreatedAtUtc",
      cp."UpdatedAtUtc"
    FROM "ClientProfiles" cp
    WHERE NOT EXISTS (
      SELECT 1 FROM "Policies" p WHERE p."PolicyNumber" = cp."PolicyNumber"
    );
  `,
];

const down = [
  `DROP TABLE IF EXISTS "ClientAssignmentHistory";`,
  `DROP TABLE IF EXISTS "ImportValidationIssues";`,
  `DROP TABLE IF EXISTS "Notifications";`,
  `DROP TABLE IF EXISTS "PolicyTransactions";`,
  `DROP TABLE IF EXISTS "Policies";`,
  `DROP INDEX IF EXISTS "idx_clientprofiles_branchcode";`,
  `DROP INDEX IF EXISTS "idx_agentprofiles_branchcode";`,
  `ALTER TABLE "ClientProfiles" DROP COLUMN IF EXISTS "PlanCode";`,
  `ALTER TABLE "ClientProfiles" DROP COLUMN IF EXISTS "ProductType";`,
  `ALTER TABLE "ClientProfiles" DROP COLUMN IF EXISTS "BranchCode";`,
  `ALTER TABLE "AgentProfiles" DROP COLUMN IF EXISTS "ProfileImageKey";`,
  `ALTER TABLE "AgentProfiles" DROP COLUMN IF EXISTS "BranchCode";`,
];

export const phaseTwoThreeFoundationMigration: MigrationDefinition = {
  id: '017_PhaseTwoThreeFoundation',
  async up(sql) {
    for (const statement of up) {
      await sql.unsafe(statement);
    }
  },
  async down(sql) {
    for (const statement of down) {
      await sql.unsafe(statement);
    }
  },
};
