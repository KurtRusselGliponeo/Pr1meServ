CREATE TABLE "user_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_hash" varchar(256) NOT NULL,
	"encrypted_email" text NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at_utc" timestamp,
	CONSTRAINT "user_accounts_email_hash_unique" UNIQUE("email_hash")
);
--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"policy_number" varchar(50) NOT NULL,
	"annual_premium" numeric(19, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at_utc" timestamp,
	CONSTRAINT "client_profiles_policy_number_unique" UNIQUE("policy_number")
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_agent_id_user_accounts_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."user_accounts"("id") ON DELETE no action ON UPDATE no action;