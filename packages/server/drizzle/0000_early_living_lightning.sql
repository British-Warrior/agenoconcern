CREATE TYPE "public"."auth_provider" AS ENUM('email', 'google', 'linkedin', 'phone', 'cm_created');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('full_time', 'part_time', 'occasional', 'project_only');--> statement-breakpoint
CREATE TYPE "public"."comm_channel" AS ENUM('email', 'phone');--> statement-breakpoint
CREATE TYPE "public"."comm_frequency" AS ENUM('immediate', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."contributor_role" AS ENUM('contributor', 'community_manager', 'admin');--> statement-breakpoint
CREATE TYPE "public"."contributor_status" AS ENUM('onboarding', 'active', 'paused', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."cv_parse_status" AS ENUM('pending', 'processing', 'complete', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stripe_status" AS ENUM('not_started', 'pending', 'complete');--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid,
	"purpose" varchar(50) NOT NULL,
	"granted" boolean NOT NULL,
	"policy_version" varchar(20) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contributor_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"cv_s3_key" text,
	"cv_parse_status" "cv_parse_status" DEFAULT 'pending',
	"roles_and_titles" jsonb,
	"skills" jsonb,
	"qualifications" jsonb,
	"sectors" jsonb,
	"years_of_experience" smallint,
	"professional_summary" text,
	"affirmation_message" text,
	"availability" "availability",
	"max_circles" smallint DEFAULT 3,
	"domain_preferences" jsonb,
	"domain_other" text,
	"willing_to_mentor" boolean DEFAULT false,
	"comm_channel" "comm_channel",
	"comm_frequency" "comm_frequency",
	"stripe_account_id" varchar(255),
	"stripe_status" "stripe_status" DEFAULT 'not_started',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributor_profiles_contributor_id_unique" UNIQUE("contributor_id")
);
--> statement-breakpoint
CREATE TABLE "contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255),
	"username" varchar(100),
	"phone_number" varchar(20),
	"password_hash" text,
	"auth_provider" "auth_provider" NOT NULL,
	"auth_provider_id" varchar(255),
	"role" "contributor_role" DEFAULT 'contributor' NOT NULL,
	"status" "contributor_status" DEFAULT 'onboarding' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "contributors_email_unique" UNIQUE("email"),
	CONSTRAINT "contributors_username_unique" UNIQUE("username"),
	CONSTRAINT "contributors_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "cv_parse_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"s3_key" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"status" "cv_parse_status" DEFAULT 'pending',
	"error_message" text,
	"raw_text" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"provider" varchar(20) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"profile_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_profiles" ADD CONSTRAINT "contributor_profiles_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_parse_jobs" ADD CONSTRAINT "cv_parse_jobs_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;