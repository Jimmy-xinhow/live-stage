ALTER TABLE "live_sessions" ADD COLUMN "mode" varchar(10) DEFAULT 'onsite' NOT NULL;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "kind" varchar(10) DEFAULT 'street' NOT NULL;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "stream_platform" varchar(12);--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "fan_cap_cents" integer DEFAULT 0 NOT NULL;