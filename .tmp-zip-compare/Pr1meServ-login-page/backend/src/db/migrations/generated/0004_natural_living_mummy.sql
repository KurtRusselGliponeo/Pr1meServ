CREATE TYPE "public"."ProspectPipelineStage" AS ENUM('Cold Prospect', 'Contacted', 'Presentation', 'Agreed', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."ProspectTemperature" AS ENUM('Warm', 'Cold');--> statement-breakpoint
CREATE TABLE "Prospects" (
	"Id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"AgentCode" varchar(50) NOT NULL,
	"ClientName" varchar(200) NOT NULL,
	"ContactNumber" varchar(50) NOT NULL,
	"Temperature" "ProspectTemperature" NOT NULL,
	"PipelineStage" "ProspectPipelineStage" DEFAULT 'Cold Prospect' NOT NULL,
	"CreatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL,
	"UpdatedAtUtc" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_prospects_agent_code" ON "Prospects" USING btree ("AgentCode");--> statement-breakpoint
CREATE INDEX "idx_prospects_stage" ON "Prospects" USING btree ("PipelineStage");