CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"platform" varchar(10) NOT NULL,
	"external_id" varchar(80) NOT NULL,
	"author" varchar(40) NOT NULL,
	"text" varchar(200) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_sessions" ADD COLUMN "chat_platform" varchar(10);--> statement-breakpoint
ALTER TABLE "live_sessions" ADD COLUMN "chat_id" varchar(120);--> statement-breakpoint
ALTER TABLE "live_sessions" ADD COLUMN "chat_token" varchar(200);--> statement-breakpoint
ALTER TABLE "live_sessions" ADD COLUMN "chat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_external_idx" ON "chat_messages" USING btree ("session_id","external_id");--> statement-breakpoint
CREATE INDEX "chat_session_idx" ON "chat_messages" USING btree ("session_id","created_at");