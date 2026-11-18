ALTER TABLE "performers" ADD COLUMN "plan_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "plan_auto_renew" boolean DEFAULT true NOT NULL;