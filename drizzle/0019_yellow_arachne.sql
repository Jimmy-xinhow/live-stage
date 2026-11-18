CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(40) NOT NULL,
	"performer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "usage_events_idx" ON "usage_events" USING btree ("name","created_at");--> statement-breakpoint
ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY;
