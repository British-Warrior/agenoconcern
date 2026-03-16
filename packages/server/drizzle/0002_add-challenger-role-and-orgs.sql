CREATE TYPE "public"."challenge_interest_status" AS ENUM('active', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."challenge_status" AS ENUM('draft', 'open', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."challenge_type" AS ENUM('paid', 'free');--> statement-breakpoint
CREATE TYPE "public"."circle_status" AS ENUM('forming', 'active', 'submitted', 'completed', 'dissolved');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('challenge_match', 'circle_formed', 'circle_activity', 'wellbeing_reminder', 'resolution_feedback', 'payment_received');--> statement-breakpoint
CREATE TYPE "public"."notify_circle_activity" AS ENUM('immediate', 'daily_digest', 'off');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('held', 'transferred', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."payment_type" AS ENUM('retainer', 'stipend', 'sme_subscription');--> statement-breakpoint
CREATE TYPE "public"."social_channel" AS ENUM('whatsapp', 'slack', 'discord', 'teams', 'signal');--> statement-breakpoint
ALTER TYPE "public"."contributor_role" ADD VALUE 'challenger';--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "api_keys_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "challenge_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"contributor_id" uuid NOT NULL,
	"status" "challenge_interest_status" DEFAULT 'active' NOT NULL,
	"note" text,
	"match_score" smallint,
	"last_withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_interests_unique" UNIQUE("challenge_id","contributor_id")
);
--> statement-breakpoint
CREATE TABLE "challenger_organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"api_key_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"brief" text NOT NULL,
	"domain" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills_needed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"type" "challenge_type" NOT NULL,
	"deadline" date,
	"circle_size" smallint DEFAULT 4 NOT NULL,
	"status" "challenge_status" DEFAULT 'open' NOT NULL,
	"interest_count" integer DEFAULT 0 NOT NULL,
	"stripe_customer_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"contributor_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_members_unique" UNIQUE("circle_id","contributor_id")
);
--> statement-breakpoint
CREATE TABLE "circle_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "circle_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"problem_summary" text NOT NULL,
	"recommendations" text NOT NULL,
	"evidence" text NOT NULL,
	"dissenting_views" text,
	"implementation_notes" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "circle_resolutions_unique_circle" UNIQUE("circle_id")
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"status" "circle_status" DEFAULT 'forming' NOT NULL,
	"social_channel" "social_channel",
	"social_channel_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contributor_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"circle_id" uuid NOT NULL,
	"hours_logged" smallint NOT NULL,
	"description" text,
	"is_paid" boolean DEFAULT false NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contributor_hours_unique" UNIQUE("contributor_id","circle_id","logged_at")
);
--> statement-breakpoint
CREATE TABLE "note_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note_id" uuid NOT NULL,
	"s3_key" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"url" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"challenge_id" uuid,
	"circle_id" uuid,
	"payment_type" "payment_type" NOT NULL,
	"status" "payment_status" DEFAULT 'held' NOT NULL,
	"amount_pence" integer NOT NULL,
	"total_amount_pence" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'gbp' NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"stripe_transfer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_event_id" varchar(255),
	"transferred_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "resolution_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resolution_id" uuid NOT NULL,
	"rater_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resolution_ratings_unique_resolution" UNIQUE("resolution_id")
);
--> statement-breakpoint
CREATE TABLE "wellbeing_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contributor_id" uuid NOT NULL,
	"consent_record_id" uuid NOT NULL,
	"ucla_item1" smallint NOT NULL,
	"ucla_item2" smallint NOT NULL,
	"ucla_item3" smallint NOT NULL,
	"ucla_score" smallint NOT NULL,
	"wemwbs_item1" smallint NOT NULL,
	"wemwbs_item2" smallint NOT NULL,
	"wemwbs_item3" smallint NOT NULL,
	"wemwbs_item4" smallint NOT NULL,
	"wemwbs_item5" smallint NOT NULL,
	"wemwbs_item6" smallint NOT NULL,
	"wemwbs_item7" smallint NOT NULL,
	"wemwbs_score" smallint NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contributor_profiles" ADD COLUMN "notify_circle_activity" "notify_circle_activity" DEFAULT 'immediate';--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_contributors_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."contributors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_interests" ADD CONSTRAINT "challenge_interests_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_interests" ADD CONSTRAINT "challenge_interests_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenger_organisations" ADD CONSTRAINT "challenger_organisations_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_contributors_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_notes" ADD CONSTRAINT "circle_notes_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_notes" ADD CONSTRAINT "circle_notes_author_id_contributors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_resolutions" ADD CONSTRAINT "circle_resolutions_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_resolutions" ADD CONSTRAINT "circle_resolutions_submitted_by_contributors_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_created_by_contributors_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_hours" ADD CONSTRAINT "contributor_hours_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contributor_hours" ADD CONSTRAINT "contributor_hours_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_attachments" ADD CONSTRAINT "note_attachments_note_id_circle_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."circle_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_ratings" ADD CONSTRAINT "resolution_ratings_resolution_id_circle_resolutions_id_fk" FOREIGN KEY ("resolution_id") REFERENCES "public"."circle_resolutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resolution_ratings" ADD CONSTRAINT "resolution_ratings_rater_id_contributors_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."contributors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellbeing_checkins" ADD CONSTRAINT "wellbeing_checkins_contributor_id_contributors_id_fk" FOREIGN KEY ("contributor_id") REFERENCES "public"."contributors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellbeing_checkins" ADD CONSTRAINT "wellbeing_checkins_consent_record_id_consent_records_id_fk" FOREIGN KEY ("consent_record_id") REFERENCES "public"."consent_records"("id") ON DELETE no action ON UPDATE no action;