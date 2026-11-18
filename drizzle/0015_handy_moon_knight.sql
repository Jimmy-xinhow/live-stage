CREATE TABLE "band_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"share_permille" integer NOT NULL,
	"invite_code" varchar(12) NOT NULL,
	"line_user_id" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "band_members_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "order_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"member_id" uuid,
	"member_name" varchar(40) NOT NULL,
	"share_permille" integer NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performers" ADD COLUMN "stream_delay_sec" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "band_members" ADD CONSTRAINT "band_members_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_splits" ADD CONSTRAINT "order_splits_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_splits" ADD CONSTRAINT "order_splits_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "band_perf_idx" ON "band_members" USING btree ("performer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "band_line_idx" ON "band_members" USING btree ("performer_id","line_user_id");--> statement-breakpoint
CREATE INDEX "split_perf_idx" ON "order_splits" USING btree ("performer_id","created_at");--> statement-breakpoint
CREATE INDEX "split_order_idx" ON "order_splits" USING btree ("order_id");