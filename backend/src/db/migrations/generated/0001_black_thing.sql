CREATE TABLE "LapsationRecords" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"PolicyNumberId" uuid NOT NULL,
	"IsAtRisk" boolean DEFAULT true NOT NULL,
	"ReinstatedAtUtc" timestamp with time zone,
	"LapseDateUtc" timestamp with time zone NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "DocumentLibrary" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"UploadedByUserId" uuid NOT NULL,
	"FileUrl" text NOT NULL,
	"FileName" varchar(255) NOT NULL,
	"Category" varchar(50) NOT NULL,
	"MimeType" varchar(50) NOT NULL,
	"Version" varchar(16) DEFAULT '1.0' NOT NULL,
	"IsPinned" boolean DEFAULT false NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "CosafApprovals" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ClientProfileId" uuid NOT NULL,
	"ReviewingBmId" uuid NOT NULL,
	"Status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "idx_clientprofiles_agentid";--> statement-breakpoint
ALTER TABLE "ClientProfiles" ALTER COLUMN "AssignedAgentId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "PerformanceMetrics" ADD COLUMN "RecruitmentCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "PerformanceMetrics" ADD COLUMN "YtdSurplus" numeric(19, 4) DEFAULT '0.0000' NOT NULL;--> statement-breakpoint
ALTER TABLE "LapsationRecords" ADD CONSTRAINT "LapsationRecords_PolicyNumberId_ClientProfiles_Id_fk" FOREIGN KEY ("PolicyNumberId") REFERENCES "public"."ClientProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DocumentLibrary" ADD CONSTRAINT "DocumentLibrary_UploadedByUserId_UserAccounts_Id_fk" FOREIGN KEY ("UploadedByUserId") REFERENCES "public"."UserAccounts"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CosafApprovals" ADD CONSTRAINT "CosafApprovals_ClientProfileId_ClientProfiles_Id_fk" FOREIGN KEY ("ClientProfileId") REFERENCES "public"."ClientProfiles"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "CosafApprovals" ADD CONSTRAINT "CosafApprovals_ReviewingBmId_UserAccounts_Id_fk" FOREIGN KEY ("ReviewingBmId") REFERENCES "public"."UserAccounts"("Id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_lapsation_policynumber" ON "LapsationRecords" USING btree ("PolicyNumberId");--> statement-breakpoint
CREATE INDEX "idx_doclibrary_userid" ON "DocumentLibrary" USING btree ("UploadedByUserId");--> statement-breakpoint
CREATE INDEX "idx_doclibrary_pinned" ON "DocumentLibrary" USING btree ("IsPinned");--> statement-breakpoint
CREATE INDEX "idx_cosafapprovals_clientprofileid" ON "CosafApprovals" USING btree ("ClientProfileId");--> statement-breakpoint
CREATE INDEX "idx_cosafapprovals_reviewingbmid" ON "CosafApprovals" USING btree ("ReviewingBmId");--> statement-breakpoint
CREATE INDEX "idx_perfmetrics_recordmonth" ON "PerformanceMetrics" USING btree ("RecordMonth");--> statement-breakpoint
CREATE INDEX "idx_auditlogs_entity" ON "SystemAuditLogs" USING btree ("EntityName","EntityId");--> statement-breakpoint
CREATE INDEX "idx_clientprofiles_agentid" ON "ClientProfiles" USING btree ("AssignedAgentId") WHERE "ClientProfiles"."DeletedAtUtc" IS NULL;