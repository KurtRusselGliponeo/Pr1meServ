import type { Sql } from 'postgres';
import type { MigrationDefinition } from './types';

const upStatements = [
  `CREATE TABLE IF NOT EXISTS "PlanCodes" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "PlanCode" varchar(50) NOT NULL UNIQUE,
    "PlanName" varchar(255) NOT NULL,
    "ProductCategory" varchar(120) NOT NULL,
    "Classification" varchar(20) NOT NULL,
    "IsActive" boolean DEFAULT true NOT NULL,
    "Notes" text,
    "CreatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    "UpdatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_plancodes_category" ON "PlanCodes" ("ProductCategory")`,
  `CREATE INDEX IF NOT EXISTS "idx_plancodes_active" ON "PlanCodes" ("IsActive")`,

  `ALTER TABLE "Policies"
    ADD COLUMN IF NOT EXISTS "AssignedAgentId" uuid REFERENCES "AgentProfiles"("Id"),
    ADD COLUMN IF NOT EXISTS "PolicyOwnerName" varchar(255),
    ADD COLUMN IF NOT EXISTS "LifeInsuredName" varchar(255),
    ADD COLUMN IF NOT EXISTS "PlanName" varchar(255),
    ADD COLUMN IF NOT EXISTS "Currency" varchar(20) DEFAULT 'PHP' NOT NULL,
    ADD COLUMN IF NOT EXISTS "FirstIssueDate" date,
    ADD COLUMN IF NOT EXISTS "Mode" varchar(50),
    ADD COLUMN IF NOT EXISTS "ModalPremium" numeric(19,4) DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "SumAssured" numeric(19,4) DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "Api" numeric(19,4) DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "PolicyStatus" varchar(32) DEFAULT 'Active' NOT NULL,
    ADD COLUMN IF NOT EXISTS "Notes" text,
    ADD COLUMN IF NOT EXISTS "CreatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedByUserId" uuid REFERENCES "UserAccounts"("Id")`,
  `CREATE INDEX IF NOT EXISTS "idx_policies_agentid" ON "Policies" ("AssignedAgentId")`,
  `CREATE INDEX IF NOT EXISTS "idx_policies_plancode" ON "Policies" ("PlanCode")`,
  `CREATE INDEX IF NOT EXISTS "idx_policies_firstissuedate" ON "Policies" ("FirstIssueDate")`,
  `CREATE INDEX IF NOT EXISTS "idx_policies_status" ON "Policies" ("PolicyStatus")`,

  `CREATE TABLE IF NOT EXISTS "PolicyStatusHistory" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "PolicyId" uuid NOT NULL REFERENCES "Policies"("Id"),
    "ChangedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    "PreviousStatus" varchar(32),
    "NextStatus" varchar(32) NOT NULL,
    "EffectiveAtUtc" timestamptz NOT NULL,
    "Reason" varchar(255),
    "Notes" text,
    "Metadata" jsonb,
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_policystatushistory_policyid" ON "PolicyStatusHistory" ("PolicyId")`,
  `CREATE INDEX IF NOT EXISTS "idx_policystatushistory_nextstatus" ON "PolicyStatusHistory" ("NextStatus")`,
  `CREATE INDEX IF NOT EXISTS "idx_policystatushistory_effectiveat" ON "PolicyStatusHistory" ("EffectiveAtUtc")`,

  `ALTER TABLE "NapTransactions"
    ADD COLUMN IF NOT EXISTS "PolicyId" uuid REFERENCES "Policies"("Id"),
    ADD COLUMN IF NOT EXISTS "AccountType" varchar(100),
    ADD COLUMN IF NOT EXISTS "ContractTypeCode" varchar(50),
    ADD COLUMN IF NOT EXISTS "TypeDesc" varchar(255),
    ADD COLUMN IF NOT EXISTS "TempReceiptDate" timestamptz,
    ADD COLUMN IF NOT EXISTS "CcCredit" integer,
    ADD COLUMN IF NOT EXISTS "CreditStatus" varchar(100),
    ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50),
    ADD COLUMN IF NOT EXISTS "Notes" text,
    ADD COLUMN IF NOT EXISTS "CreatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "idx_nap_policyid" ON "NapTransactions" ("PolicyId")`,
  `CREATE INDEX IF NOT EXISTS "idx_nap_transactiondate" ON "NapTransactions" ("TransactionDate")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ux_nap_manual_dedupe"
    ON "NapTransactions" ("PolicyNumber", "TransactionType", "TransactionDate")
    WHERE "PolicyNumber" IS NOT NULL`,

  `ALTER TABLE "RecRecruitment"
    ADD COLUMN IF NOT EXISTS "AgentCode" varchar(50),
    ADD COLUMN IF NOT EXISTS "AgentName" varchar(255),
    ADD COLUMN IF NOT EXISTS "Recruiter" varchar(255),
    ADD COLUMN IF NOT EXISTS "UmCode" varchar(50),
    ADD COLUMN IF NOT EXISTS "UmName" varchar(255),
    ADD COLUMN IF NOT EXISTS "BmCode" varchar(50),
    ADD COLUMN IF NOT EXISTS "BmName" varchar(255),
    ADD COLUMN IF NOT EXISTS "Team" varchar(120),
    ADD COLUMN IF NOT EXISTS "Birthday" date,
    ADD COLUMN IF NOT EXISTS "DateTerminated" timestamptz,
    ADD COLUMN IF NOT EXISTS "Contacts" varchar(255),
    ADD COLUMN IF NOT EXISTS "Notes" text,
    ADD COLUMN IF NOT EXISTS "CreatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "idx_rec_agentcode" ON "RecRecruitment" ("AgentCode")`,
  `CREATE INDEX IF NOT EXISTS "idx_rec_dateappointed" ON "RecRecruitment" ("DateAppointed")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ux_rec_active_agentcode"
    ON "RecRecruitment" ("AgentCode")
    WHERE "AgentCode" IS NOT NULL AND "DateTerminated" IS NULL`,

  `ALTER TABLE "PerPerformance"
    ADD COLUMN IF NOT EXISTS "RecordMonth" varchar(7) DEFAULT '1970-01' NOT NULL,
    ADD COLUMN IF NOT EXISTS "BranchCode" varchar(50),
    ADD COLUMN IF NOT EXISTS "AgentType" varchar(50),
    ADD COLUMN IF NOT EXISTS "Team" varchar(120),
    ADD COLUMN IF NOT EXISTS "UnitPersistency" numeric(5,2) DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "BranchPersistency" numeric(5,2) DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "Notes" text,
    ADD COLUMN IF NOT EXISTS "CreatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    ADD COLUMN IF NOT EXISTS "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL`,
  `CREATE INDEX IF NOT EXISTS "idx_per_recordmonth" ON "PerPerformance" ("RecordMonth")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "ux_per_agent_month"
    ON "PerPerformance" ("AgentId", "RecordMonth")
    WHERE "RecordMonth" <> '1970-01'`,

  `CREATE TABLE IF NOT EXISTS "DataValidationIssues" (
    "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "Module" varchar(50) NOT NULL,
    "EntityName" varchar(100),
    "EntityId" uuid,
    "IssueCode" varchar(80) NOT NULL,
    "Severity" varchar(20) DEFAULT 'error' NOT NULL,
    "Status" varchar(20) DEFAULT 'Open' NOT NULL,
    "Details" text NOT NULL,
    "RecommendedFix" text,
    "RawPayload" jsonb,
    "CreatedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    "ResolvedByUserId" uuid REFERENCES "UserAccounts"("Id"),
    "ResolvedAtUtc" timestamptz,
    "CreatedAtUtc" timestamptz DEFAULT NOW() NOT NULL,
    "UpdatedAtUtc" timestamptz DEFAULT NOW() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "idx_datavalidationissues_module" ON "DataValidationIssues" ("Module")`,
  `CREATE INDEX IF NOT EXISTS "idx_datavalidationissues_status" ON "DataValidationIssues" ("Status")`,
  `CREATE INDEX IF NOT EXISTS "idx_datavalidationissues_entity" ON "DataValidationIssues" ("EntityName", "EntityId")`,
  `CREATE INDEX IF NOT EXISTS "idx_datavalidationissues_code" ON "DataValidationIssues" ("IssueCode")`,
];

const downStatements = [
  `DROP TABLE IF EXISTS "DataValidationIssues"`,
  `DROP INDEX IF EXISTS "ux_per_agent_month"`,
  `DROP INDEX IF EXISTS "idx_per_recordmonth"`,
  `ALTER TABLE "PerPerformance"
    DROP COLUMN IF EXISTS "RecordMonth",
    DROP COLUMN IF EXISTS "BranchCode",
    DROP COLUMN IF EXISTS "AgentType",
    DROP COLUMN IF EXISTS "Team",
    DROP COLUMN IF EXISTS "UnitPersistency",
    DROP COLUMN IF EXISTS "BranchPersistency",
    DROP COLUMN IF EXISTS "Notes",
    DROP COLUMN IF EXISTS "CreatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedAtUtc"`,
  `DROP INDEX IF EXISTS "ux_rec_active_agentcode"`,
  `DROP INDEX IF EXISTS "idx_rec_dateappointed"`,
  `DROP INDEX IF EXISTS "idx_rec_agentcode"`,
  `ALTER TABLE "RecRecruitment"
    DROP COLUMN IF EXISTS "AgentCode",
    DROP COLUMN IF EXISTS "AgentName",
    DROP COLUMN IF EXISTS "Recruiter",
    DROP COLUMN IF EXISTS "UmCode",
    DROP COLUMN IF EXISTS "UmName",
    DROP COLUMN IF EXISTS "BmCode",
    DROP COLUMN IF EXISTS "BmName",
    DROP COLUMN IF EXISTS "Team",
    DROP COLUMN IF EXISTS "Birthday",
    DROP COLUMN IF EXISTS "DateTerminated",
    DROP COLUMN IF EXISTS "Contacts",
    DROP COLUMN IF EXISTS "Notes",
    DROP COLUMN IF EXISTS "CreatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedAtUtc"`,
  `DROP INDEX IF EXISTS "ux_nap_manual_dedupe"`,
  `DROP INDEX IF EXISTS "idx_nap_transactiondate"`,
  `DROP INDEX IF EXISTS "idx_nap_policyid"`,
  `ALTER TABLE "NapTransactions"
    DROP COLUMN IF EXISTS "PolicyId",
    DROP COLUMN IF EXISTS "AccountType",
    DROP COLUMN IF EXISTS "ContractTypeCode",
    DROP COLUMN IF EXISTS "TypeDesc",
    DROP COLUMN IF EXISTS "TempReceiptDate",
    DROP COLUMN IF EXISTS "CcCredit",
    DROP COLUMN IF EXISTS "CreditStatus",
    DROP COLUMN IF EXISTS "BranchCode",
    DROP COLUMN IF EXISTS "Notes",
    DROP COLUMN IF EXISTS "CreatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedAtUtc"`,
  `DROP TABLE IF EXISTS "PolicyStatusHistory"`,
  `DROP INDEX IF EXISTS "idx_policies_status"`,
  `DROP INDEX IF EXISTS "idx_policies_firstissuedate"`,
  `DROP INDEX IF EXISTS "idx_policies_plancode"`,
  `DROP INDEX IF EXISTS "idx_policies_agentid"`,
  `ALTER TABLE "Policies"
    DROP COLUMN IF EXISTS "AssignedAgentId",
    DROP COLUMN IF EXISTS "PolicyOwnerName",
    DROP COLUMN IF EXISTS "LifeInsuredName",
    DROP COLUMN IF EXISTS "PlanName",
    DROP COLUMN IF EXISTS "Currency",
    DROP COLUMN IF EXISTS "FirstIssueDate",
    DROP COLUMN IF EXISTS "Mode",
    DROP COLUMN IF EXISTS "ModalPremium",
    DROP COLUMN IF EXISTS "SumAssured",
    DROP COLUMN IF EXISTS "Api",
    DROP COLUMN IF EXISTS "PolicyStatus",
    DROP COLUMN IF EXISTS "Notes",
    DROP COLUMN IF EXISTS "CreatedByUserId",
    DROP COLUMN IF EXISTS "UpdatedByUserId"`,
  `DROP TABLE IF EXISTS "PlanCodes"`,
];

export const adminDataCenterFoundationMigration: MigrationDefinition = {
  id: '023_AdminDataCenterFoundation',
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
