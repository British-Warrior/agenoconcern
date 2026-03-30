ALTER TABLE "institutions" ADD COLUMN "contact_email" varchar(255);--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "report_delivery_enabled" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "report_cadence" varchar(10);--> statement-breakpoint
ALTER TABLE "institutions" ADD COLUMN "report_next_run_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "report_delivery_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"error_message" text,
	"attempt_number" integer NOT NULL DEFAULT 1,
	"next_retry_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_delivery_logs" ADD CONSTRAINT "report_delivery_logs_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;
