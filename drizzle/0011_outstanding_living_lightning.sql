CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(120) NOT NULL,
	"kind" varchar(10) DEFAULT 'street' NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"ip" varchar(45) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "leads_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "leads_at_idx" ON "leads" USING btree ("created_at");