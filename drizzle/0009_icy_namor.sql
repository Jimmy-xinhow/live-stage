CREATE TABLE "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" varchar(60) NOT NULL,
	"action" varchar(24) NOT NULL,
	"target_type" varchar(12) NOT NULL,
	"target_id" uuid,
	"target_name" varchar(60) DEFAULT '' NOT NULL,
	"detail" varchar(200) DEFAULT '' NOT NULL,
	"ip" varchar(45) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" varchar(12) NOT NULL,
	"target_id" uuid NOT NULL,
	"fan_id" uuid,
	"reason" varchar(20) NOT NULL,
	"note" varchar(200) DEFAULT '' NOT NULL,
	"status" varchar(10) DEFAULT 'new' NOT NULL,
	"handled_at" timestamp with time zone,
	"ip" varchar(45) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refunded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_by" varchar(10);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "refund_note" varchar(120);--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_logs_at_idx" ON "admin_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_target_idx" ON "admin_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "reports_target_idx" ON "reports" USING btree ("target_type","target_id");