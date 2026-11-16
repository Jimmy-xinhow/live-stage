CREATE TABLE "event_performers" (
	"event_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"notified" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_performers_event_id_performer_id_pk" PRIMARY KEY("event_id","performer_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"title" varchar(60) NOT NULL,
	"city" varchar(20) NOT NULL,
	"place" varchar(60) NOT NULL,
	"address" varchar(100) DEFAULT '' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"description" varchar(800) DEFAULT '' NOT NULL,
	"price_text" varchar(40) DEFAULT '' NOT NULL,
	"link" varchar(300) DEFAULT '' NOT NULL,
	"cover_url" text,
	"guest_acts" varchar(200) DEFAULT '' NOT NULL,
	"notify_fans" boolean DEFAULT false NOT NULL,
	"status" varchar(10) DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiry_targets" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "inquiry_targets" ADD COLUMN "review" varchar(300);--> statement-breakpoint
ALTER TABLE "inquiry_targets" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "account_type" varchar(10) DEFAULT 'performer' NOT NULL;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "org_kind" varchar(12) DEFAULT 'venue' NOT NULL;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "address" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "website" varchar(200) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "event_performers" ADD CONSTRAINT "event_performers_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_performers" ADD CONSTRAINT "event_performers_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_organizer_id_performers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_performers_performer_idx" ON "event_performers" USING btree ("performer_id","status");--> statement-breakpoint
CREATE INDEX "events_time_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX "events_org_idx" ON "events" USING btree ("organizer_id");