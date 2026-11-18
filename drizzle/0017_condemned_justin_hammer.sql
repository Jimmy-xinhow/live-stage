CREATE TABLE "line_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" varchar(64) NOT NULL,
	"messages" jsonb NOT NULL,
	"kind" varchar(16) DEFAULT 'other' NOT NULL,
	"performer_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"status" varchar(8) DEFAULT 'pending' NOT NULL,
	"error" varchar(200) DEFAULT '' NOT NULL,
	"next_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "line_usage" (
	"month" varchar(7) PRIMARY KEY NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "line_outbox" ADD CONSTRAINT "line_outbox_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_outbox_due_idx" ON "line_outbox" USING btree ("status","next_at");