CREATE TABLE "UserAccounts" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"EmailHash" varchar(64) NOT NULL,
	"Email" text NOT NULL,
	"PasswordHash" varchar(255) NOT NULL,
	"RefreshTokenHash" varchar(64),
	"RefreshTokenExpiresAtUtc" timestamp with time zone,
	"FirstName" varchar(100) NOT NULL,
	"LastName" varchar(100) NOT NULL,
	"SystemRole" varchar(32) NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"DeletedAtUtc" timestamp with time zone,
	CONSTRAINT "UserAccounts_EmailHash_unique" UNIQUE("EmailHash")
);
--> statement-breakpoint
CREATE TABLE "AgentProfiles" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"UserId" uuid NOT NULL,
	"AgentCode" varchar(50) NOT NULL,
	"DisplayName" varchar(200) NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"DeletedAtUtc" timestamp with time zone,
	CONSTRAINT "AgentProfiles_UserId_unique" UNIQUE("UserId"),
	CONSTRAINT "AgentProfiles_AgentCode_unique" UNIQUE("AgentCode")
);
--> statement-breakpoint
CREATE TABLE "ClientProfiles" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AssignedAgentId" uuid NOT NULL,
	"FirstName" varchar(100) NOT NULL,
	"LastName" varchar(100) NOT NULL,
	"PolicyNumber" varchar(50) NOT NULL,
	"ModalPremium" numeric(19, 4) NOT NULL,
	"Api" numeric(19, 4) NOT NULL,
	"SumAssured" numeric(19, 4) NOT NULL,
	"CommissionAmount" numeric(19, 4) NOT NULL,
	"CaseStatus" varchar(32) NOT NULL,
	"PolicyStatus" varchar(32) NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"DeletedAtUtc" timestamp with time zone,
	CONSTRAINT "ClientProfiles_PolicyNumber_unique" UNIQUE("PolicyNumber")
);
--> statement-breakpoint
CREATE TABLE "PerformanceMetrics" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AgentId" uuid NOT NULL,
	"RecordMonth" varchar(7) NOT NULL,
	"ModalPremium" numeric(19, 4) NOT NULL,
	"Api" numeric(19, 4) NOT NULL,
	"SumAssured" numeric(19, 4) NOT NULL,
	"CommissionAmount" numeric(19, 4) NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SystemAuditLogs" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ActorUserId" uuid,
	"Action" text NOT NULL,
	"EntityName" text NOT NULL,
	"EntityId" uuid,
	"OldValue" jsonb,
	"NewValue" jsonb,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AgentProfiles" ADD CONSTRAINT "AgentProfiles_UserId_UserAccounts_Id_fk" FOREIGN KEY ("UserId") REFERENCES "public"."UserAccounts"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ClientProfiles" ADD CONSTRAINT "ClientProfiles_AssignedAgentId_AgentProfiles_Id_fk" FOREIGN KEY ("AssignedAgentId") REFERENCES "public"."AgentProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PerformanceMetrics" ADD CONSTRAINT "PerformanceMetrics_AgentId_AgentProfiles_Id_fk" FOREIGN KEY ("AgentId") REFERENCES "public"."AgentProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "SystemAuditLogs" ADD CONSTRAINT "SystemAuditLogs_ActorUserId_UserAccounts_Id_fk" FOREIGN KEY ("ActorUserId") REFERENCES "public"."UserAccounts"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agentprofiles_userid" ON "AgentProfiles" USING btree ("UserId");--> statement-breakpoint
CREATE INDEX "idx_clientprofiles_agentid" ON "ClientProfiles" USING btree ("AssignedAgentId");--> statement-breakpoint
CREATE INDEX "idx_perfmetrics_agentid" ON "PerformanceMetrics" USING btree ("AgentId");--> statement-breakpoint
CREATE INDEX "idx_auditlogs_actoruserid" ON "SystemAuditLogs" USING btree ("ActorUserId");