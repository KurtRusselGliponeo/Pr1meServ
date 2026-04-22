CREATE TABLE "NapTransactions" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AgentId" uuid NOT NULL,
	"PolicyNumber" varchar(100) NOT NULL,
	"TransactionDate" timestamp with time zone NOT NULL,
	"TransactionType" varchar(50) NOT NULL,
	"API" varchar(50),
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ApePolicies" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AgentId" uuid NOT NULL,
	"PolicyNumber" varchar(100) NOT NULL,
	"API" varchar(50),
	"SumAssured" numeric(19, 4) NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PerPerformance" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AgentId" uuid NOT NULL,
	"PersonalPersistency" numeric(5, 2) NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RecRecruitment" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AgentId" uuid NOT NULL,
	"Status" varchar(50) NOT NULL,
	"DateAppointed" timestamp with time zone NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nap" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"UmCode" varchar(50),
	"UmName" varchar(255),
	"AgCode" varchar(50),
	"AgName" varchar(255),
	"AgentCode" varchar(50),
	"AgentName" varchar(255),
	"PolicyNumber" varchar(100),
	"TransactionDate" timestamp with time zone,
	"TempReceiptDate" timestamp with time zone,
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
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ape" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"UmCode" varchar(50),
	"UmName" varchar(255),
	"AgCode" varchar(50),
	"AgName" varchar(255),
	"AgentCode" varchar(50),
	"PolicyNumber" varchar(100),
	"PlanCode" varchar(50),
	"FirstIssueDate" timestamp with time zone,
	"Mode" varchar(50),
	"ModalPremium" numeric(19, 4),
	"PremiumBand" varchar(100),
	"SumAssured" numeric(19, 4),
	"Api" numeric(19, 4),
	"Currency" varchar(20),
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "per" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"Month" timestamp with time zone,
	"Branch" varchar(255),
	"AgentCode" varchar(50),
	"AgentName" varchar(255),
	"AgentType" varchar(100),
	"PersonalPersistency" numeric(10, 4),
	"UnitPersistency" numeric(10, 4),
	"BranchPersistency" numeric(10, 4),
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rec" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"UmCode" varchar(50),
	"UmName" varchar(255),
	"Recruiter" varchar(255),
	"AgentCode" varchar(50),
	"AgentName" varchar(255),
	"Birthday" timestamp with time zone,
	"DateAppointed" timestamp with time zone,
	"DateTerminated" timestamp with time zone,
	"TenureDays" integer,
	"Status" varchar(100),
	"Contacts" varchar(255),
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "CosafApprovals" ADD COLUMN "Reason" varchar(500);--> statement-breakpoint
ALTER TABLE "NapTransactions" ADD CONSTRAINT "NapTransactions_AgentId_AgentProfiles_Id_fk" FOREIGN KEY ("AgentId") REFERENCES "public"."AgentProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ApePolicies" ADD CONSTRAINT "ApePolicies_AgentId_AgentProfiles_Id_fk" FOREIGN KEY ("AgentId") REFERENCES "public"."AgentProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PerPerformance" ADD CONSTRAINT "PerPerformance_AgentId_AgentProfiles_Id_fk" FOREIGN KEY ("AgentId") REFERENCES "public"."AgentProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RecRecruitment" ADD CONSTRAINT "RecRecruitment_AgentId_AgentProfiles_Id_fk" FOREIGN KEY ("AgentId") REFERENCES "public"."AgentProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nap" ADD CONSTRAINT "nap_AgentCode_AgentProfiles_AgentCode_fk" FOREIGN KEY ("AgentCode") REFERENCES "public"."AgentProfiles"("AgentCode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ape" ADD CONSTRAINT "ape_AgentCode_AgentProfiles_AgentCode_fk" FOREIGN KEY ("AgentCode") REFERENCES "public"."AgentProfiles"("AgentCode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "per" ADD CONSTRAINT "per_AgentCode_AgentProfiles_AgentCode_fk" FOREIGN KEY ("AgentCode") REFERENCES "public"."AgentProfiles"("AgentCode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rec" ADD CONSTRAINT "rec_AgentCode_AgentProfiles_AgentCode_fk" FOREIGN KEY ("AgentCode") REFERENCES "public"."AgentProfiles"("AgentCode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_nap_agentid" ON "NapTransactions" USING btree ("AgentId");--> statement-breakpoint
CREATE INDEX "idx_nap_policynumber" ON "NapTransactions" USING btree ("PolicyNumber");--> statement-breakpoint
CREATE INDEX "idx_nap_transactiontype" ON "NapTransactions" USING btree ("TransactionType");--> statement-breakpoint
CREATE INDEX "idx_ape_agentid" ON "ApePolicies" USING btree ("AgentId");--> statement-breakpoint
CREATE INDEX "idx_ape_policynumber" ON "ApePolicies" USING btree ("PolicyNumber");--> statement-breakpoint
CREATE INDEX "idx_per_agentid" ON "PerPerformance" USING btree ("AgentId");--> statement-breakpoint
CREATE INDEX "idx_rec_agentid" ON "RecRecruitment" USING btree ("AgentId");--> statement-breakpoint
CREATE INDEX "idx_rec_status" ON "RecRecruitment" USING btree ("Status");