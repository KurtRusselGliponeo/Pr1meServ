import type { MigrationDefinition } from './types';

const up = [
  // Local fresh-install compatibility:
  // raw analytics/import tables existed in older environments but are missing from the checked-in early migration chain.
  `
    CREATE TABLE IF NOT EXISTS "nap" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "UmCode" varchar(50),
      "UmName" varchar(255),
      "AgCode" varchar(50),
      "AgName" varchar(255),
      "AgentCode" varchar(50) REFERENCES "AgentProfiles"("AgentCode"),
      "AgentName" varchar(255),
      "PolicyNumber" varchar(100),
      "TransactionDate" timestamptz,
      "TempReceiptDate" timestamptz,
      "ProcessingDays" integer,
      "ContractTypeCode" varchar(50),
      "TypeDesc" varchar(255),
      "AccountType" varchar(100),
      "TransactionType" varchar(100),
      "Api" numeric(19, 4),
      "CcCredit" integer,
      "CreditStatus" varchar(100),
      "BranchName" varchar(255),
      "SuCode" varchar(50),
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW(),
      "UpdatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "ape" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "UmCode" varchar(50),
      "UmName" varchar(255),
      "AgCode" varchar(50),
      "AgName" varchar(255),
      "AgentCode" varchar(50) REFERENCES "AgentProfiles"("AgentCode"),
      "PolicyNumber" varchar(100),
      "PlanCode" varchar(50),
      "FirstIssueDate" timestamptz,
      "Mode" varchar(50),
      "ModalPremium" numeric(19, 4),
      "PremiumBand" varchar(100),
      "SumAssured" numeric(19, 4),
      "Api" numeric(19, 4),
      "Currency" varchar(20),
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW(),
      "UpdatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "per" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "Month" timestamptz,
      "Branch" varchar(255),
      "AgentCode" varchar(50) REFERENCES "AgentProfiles"("AgentCode"),
      "AgentName" varchar(255),
      "AgentType" varchar(100),
      "PersonalPersistency" numeric(10, 4),
      "UnitPersistency" numeric(10, 4),
      "BranchPersistency" numeric(10, 4),
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW(),
      "UpdatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS "rec" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "UmCode" varchar(50),
      "UmName" varchar(255),
      "Recruiter" varchar(255),
      "AgentCode" varchar(50) REFERENCES "AgentProfiles"("AgentCode"),
      "AgentName" varchar(255),
      "Birthday" timestamptz,
      "DateAppointed" timestamptz,
      "DateTerminated" timestamptz,
      "TenureDays" integer,
      "Status" varchar(100),
      "Contacts" varchar(255),
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW(),
      "UpdatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
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
    CREATE TABLE IF NOT EXISTS "NapTransactions" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "AgentId" uuid NOT NULL REFERENCES "AgentProfiles"("Id"),
      "PolicyNumber" varchar(100) NOT NULL,
      "TransactionDate" timestamptz NOT NULL,
      "TransactionType" varchar(50) NOT NULL,
      "API" varchar(50),
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_nap_agentid" ON "NapTransactions" ("AgentId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_nap_policynumber" ON "NapTransactions" ("PolicyNumber");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_nap_transactiontype" ON "NapTransactions" ("TransactionType");
  `,
  `
    CREATE TABLE IF NOT EXISTS "PerPerformance" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "AgentId" uuid NOT NULL REFERENCES "AgentProfiles"("Id"),
      "PersonalPersistency" decimal(5, 2) NOT NULL,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_per_agentid" ON "PerPerformance" ("AgentId");
  `,
  `
    CREATE TABLE IF NOT EXISTS "RecRecruitment" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "AgentId" uuid NOT NULL REFERENCES "AgentProfiles"("Id"),
      "Status" varchar(50) NOT NULL,
      "DateAppointed" timestamptz NOT NULL,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_rec_agentid" ON "RecRecruitment" ("AgentId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_rec_status" ON "RecRecruitment" ("Status");
  `,
  `
    CREATE TABLE IF NOT EXISTS "ApePolicies" (
      "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "AgentId" uuid NOT NULL REFERENCES "AgentProfiles"("Id"),
      "PolicyNumber" varchar(100) NOT NULL,
      "API" varchar(50),
      "SumAssured" decimal(19, 4) NOT NULL,
      "CreatedAtUtc" timestamptz NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_ape_agentid" ON "ApePolicies" ("AgentId");
  `,
  `
    CREATE INDEX IF NOT EXISTS "idx_ape_policynumber" ON "ApePolicies" ("PolicyNumber");
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
  `DROP TABLE IF EXISTS "ApePolicies";`,
  `DROP TABLE IF EXISTS "RecRecruitment";`,
  `DROP TABLE IF EXISTS "PerPerformance";`,
  `DROP TABLE IF EXISTS "NapTransactions";`,
  `DROP TABLE IF EXISTS "ClientAssignmentHistory";`,
  `DROP TABLE IF EXISTS "ImportValidationIssues";`,
  `DROP TABLE IF EXISTS "Notifications";`,
  `DROP TABLE IF EXISTS "PolicyTransactions";`,
  `DROP TABLE IF EXISTS "Policies";`,
  `DROP TABLE IF EXISTS "rec";`,
  `DROP TABLE IF EXISTS "per";`,
  `DROP TABLE IF EXISTS "ape";`,
  `DROP TABLE IF EXISTS "nap";`,
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
