CREATE TYPE "public"."ithink_signal_type" AS ENUM('attention_flag');--> statement-breakpoint
ALTER TYPE "public"."challenge_type" ADD VALUE 'community';--> statement-breakpoint
ALTER TYPE "public"."challenge_type" ADD VALUE 'premium';--> statement-breakpoint
ALTER TYPE "public"."challenge_type" ADD VALUE 'knowledge_transition';--> statement-breakpoint
CREATE TABLE "contributor_institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" uuid,
	CONSTRAINT "contributor_institutions_unique" UNIQUE("contributor_id","institution_id")
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"city" varchar(100),
	"stats_json" jsonb DEFAULT '{"contributors":0,"challenges":0,"hours":0}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ithink_attention_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"institution_id" uuid NOT NULL,
	"delivery_id" varchar(255) NOT NULL,
	"signal_type" "ithink_signal_type" NOT NULL,
	"cohort_size" integer,
	"flagged_count" integer,
	"cleared_by" uuid,
	"cleared_at" timestamp with time zone,
	"follow_up_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ithink_attention_flags_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" varchar(255) NOT NULL,
	"source" varchar(50) DEFAULT 'ithink' NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "webhook_deliveries_delivery_id_unique" UNIQUE("delivery_id")
);
--> statement-breakpoint
ALTER TABLE "wellbeing_checkins" ADD COLUMN "institutional_reporting" boolean;--> statement-breakpoint
ALTER TABLE "contributor_institutions" ADD CONSTRAINT "contributor_institutions_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_institutions" ADD CONSTRAINT "contributor_institutions_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_institutions" ADD CONSTRAINT "contributor_institutions_assigned_by_contributors_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."contributors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ithink_attention_flags" ADD CONSTRAINT "ithink_attention_flags_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ithink_attention_flags" ADD CONSTRAINT "ithink_attention_flags_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ithink_attention_flags" ADD CONSTRAINT "ithink_attention_flags_cleared_by_contributors_id_fk" FOREIGN KEY ("cleared_by") REFERENCES "public"."contributors"("id") ON DELETE set null ON UPDATE no action;