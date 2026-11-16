CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"name" varchar(20) NOT NULL,
	"emoji" varchar(8) DEFAULT '🏅' NOT NULL,
	"kind" varchar(10) DEFAULT 'total' NOT NULL,
	"threshold" integer NOT NULL,
	"reward" varchar(100),
	"stock" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"session_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_session_id_fan_id_pk" PRIMARY KEY("session_id","fan_id")
);
--> statement-breakpoint
CREATE TABLE "fan_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"achievement_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"status" varchar(10) DEFAULT 'unlocked' NOT NULL,
	"claim_code" varchar(6),
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_at" timestamp with time zone,
	"redeemed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "fans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_user_id" varchar(64) NOT NULL,
	"name" varchar(60) DEFAULT '' NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fans_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"performer_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"notify_live" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_performer_id_fan_id_pk" PRIMARY KEY("performer_id","fan_id")
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"session_id" uuid,
	"type" varchar(8) NOT NULL,
	"status" varchar(8) DEFAULT 'running' NOT NULL,
	"config" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"kind" varchar(6) NOT NULL,
	"text" varchar(80) DEFAULT '' NOT NULL,
	"status" varchar(8) DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fan_id" uuid NOT NULL,
	"contact_name" varchar(30) NOT NULL,
	"occasion" varchar(20) NOT NULL,
	"act_type" varchar(12),
	"event_date" varchar(10) NOT NULL,
	"time_text" varchar(40) DEFAULT '' NOT NULL,
	"city" varchar(20) NOT NULL,
	"place" varchar(60) DEFAULT '' NOT NULL,
	"guests" varchar(20) DEFAULT '' NOT NULL,
	"budget" varchar(30) DEFAULT '' NOT NULL,
	"note" varchar(300) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiry_targets" (
	"inquiry_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"status" varchar(10) DEFAULT 'new' NOT NULL,
	"quote_amount" integer,
	"quote_note" varchar(300),
	"replied_at" timestamp with time zone,
	CONSTRAINT "inquiry_targets_inquiry_id_performer_id_pk" PRIMARY KEY("inquiry_id","performer_id")
);
--> statement-breakpoint
CREATE TABLE "live_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"location" varchar(60) DEFAULT '' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"notified_count" integer DEFAULT 0 NOT NULL,
	"hype" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lotteries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"performer_id" uuid NOT NULL,
	"prize" varchar(40) NOT NULL,
	"status" varchar(6) DEFAULT 'open' NOT NULL,
	"winner_fan_id" uuid,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lottery_entries" (
	"lottery_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	CONSTRAINT "lottery_entries_lottery_id_fan_id_pk" PRIMARY KEY("lottery_id","fan_id")
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"title" varchar(60) NOT NULL,
	"subtitle" varchar(60) DEFAULT '' NOT NULL,
	"category" varchar(20) DEFAULT '' NOT NULL,
	"price" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"session_id" uuid,
	"kind" varchar(10) NOT NULL,
	"menu_item_id" uuid,
	"item_title" varchar(60),
	"trade_no" varchar(20) NOT NULL,
	"amount" integer NOT NULL,
	"nickname" varchar(30) DEFAULT '' NOT NULL,
	"message" varchar(120) DEFAULT '' NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"fan_id" uuid,
	"pay_mode" varchar(10) DEFAULT 'auto' NOT NULL,
	"pay_code" varchar(4),
	"claimed_at" timestamp with time zone,
	"follow_on_pay" boolean DEFAULT true NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"queue_status" varchar(10),
	"queue_seq" integer,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"payment_type" varchar(40),
	"gateway_trade_no" varchar(40),
	"paid_at" timestamp with time zone,
	"fee_cents" integer DEFAULT 0 NOT NULL,
	"reply" varchar(200),
	"replied_at" timestamp with time zone,
	"hidden" boolean DEFAULT false NOT NULL,
	"game_id" uuid,
	"game_lane" integer,
	"game_unit" varchar(12),
	"raw_notify" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_trade_no_unique" UNIQUE("trade_no")
);
--> statement-breakpoint
CREATE TABLE "performers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(40) NOT NULL,
	"line_user_id" varchar(64),
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text DEFAULT '' NOT NULL,
	"category" varchar(20) DEFAULT 'busker' NOT NULL,
	"city" varchar(20),
	"district" varchar(30) DEFAULT '' NOT NULL,
	"theme_color" varchar(9) DEFAULT '#e8590c' NOT NULL,
	"thank_you_text" text DEFAULT '謝謝你的支持！' NOT NULL,
	"preset_amounts" jsonb DEFAULT '[50,100,200,500]'::jsonb NOT NULL,
	"min_amount" integer DEFAULT 30 NOT NULL,
	"max_amount" integer DEFAULT 20000 NOT NULL,
	"show_amounts" boolean DEFAULT false NOT NULL,
	"notify_line" boolean DEFAULT true NOT NULL,
	"pay_methods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gateway" varchar(10) DEFAULT 'none' NOT NULL,
	"gateway_merchant_id" varchar(20),
	"gateway_hash_key_enc" text,
	"gateway_hash_iv_enc" text,
	"points_cents" integer DEFAULT 0 NOT NULL,
	"low_balance_notified_at" timestamp with time zone,
	"live_session_id" uuid,
	"queue_open" boolean DEFAULT true NOT NULL,
	"max_queue" integer DEFAULT 15 NOT NULL,
	"avg_song_minutes" integer DEFAULT 4 NOT NULL,
	"status" varchar(12) DEFAULT 'active' NOT NULL,
	"act_type" varchar(12) DEFAULT 'busker' NOT NULL,
	"bookable" boolean DEFAULT true NOT NULL,
	"price_from" integer,
	"occasions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"service_areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"genres" varchar(60) DEFAULT '' NOT NULL,
	"cover_url" text,
	"video_url" text,
	"stream_url" text,
	"overlay_token" varchar(24),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "performers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "performers_line_user_id_unique" UNIQUE("line_user_id")
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"delta_cents" integer NOT NULL,
	"balance_after_cents" integer NOT NULL,
	"reason" varchar(20) NOT NULL,
	"order_id" uuid,
	"purchase_id" uuid,
	"note" varchar(120) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"trade_no" varchar(20) NOT NULL,
	"package_id" varchar(20) NOT NULL,
	"price_nt" integer NOT NULL,
	"points_cents" integer NOT NULL,
	"status" varchar(10) DEFAULT 'pending' NOT NULL,
	"paid_at" timestamp with time zone,
	"raw_notify" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_purchases_trade_no_unique" UNIQUE("trade_no")
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"slot" varchar(12) NOT NULL,
	"city" varchar(20) NOT NULL,
	"act_type" varchar(12) NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cost_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"location" varchar(60) NOT NULL,
	"note" varchar(120) DEFAULT '' NOT NULL,
	"notified_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wish_votes" (
	"wish_id" uuid NOT NULL,
	"fan_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wish_votes_wish_id_fan_id_pk" PRIMARY KEY("wish_id","fan_id")
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"performer_id" uuid NOT NULL,
	"title" varchar(60) NOT NULL,
	"status" varchar(8) DEFAULT 'open' NOT NULL,
	"votes" integer DEFAULT 1 NOT NULL,
	"note" varchar(100) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_achievements" ADD CONSTRAINT "fan_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_achievements" ADD CONSTRAINT "fan_achievements_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_achievements" ADD CONSTRAINT "fan_achievements_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hands" ADD CONSTRAINT "hands_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_targets" ADD CONSTRAINT "inquiry_targets_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiry_targets" ADD CONSTRAINT "inquiry_targets_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_sessions" ADD CONSTRAINT "live_sessions_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotteries" ADD CONSTRAINT "lotteries_session_id_live_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."live_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotteries" ADD CONSTRAINT "lotteries_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD CONSTRAINT "lottery_entries_lottery_id_lotteries_id_fk" FOREIGN KEY ("lottery_id") REFERENCES "public"."lotteries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lottery_entries" ADD CONSTRAINT "lottery_entries_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_purchases" ADD CONSTRAINT "point_purchases_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_votes" ADD CONSTRAINT "wish_votes_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wish_votes" ADD CONSTRAINT "wish_votes_fan_id_fans_id_fk" FOREIGN KEY ("fan_id") REFERENCES "public"."fans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_performer_idx" ON "achievements" USING btree ("performer_id");--> statement-breakpoint
CREATE INDEX "checkins_fan_idx" ON "checkins" USING btree ("fan_id","performer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fan_achievements_once" ON "fan_achievements" USING btree ("achievement_id","fan_id");--> statement-breakpoint
CREATE INDEX "fan_achievements_performer_idx" ON "fan_achievements" USING btree ("performer_id","status");--> statement-breakpoint
CREATE INDEX "games_performer_idx" ON "games" USING btree ("performer_id","status");--> statement-breakpoint
CREATE INDEX "hands_session_idx" ON "hands" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "inquiry_targets_performer_idx" ON "inquiry_targets" USING btree ("performer_id","status");--> statement-breakpoint
CREATE INDEX "menu_items_performer_idx" ON "menu_items" USING btree ("performer_id","sort");--> statement-breakpoint
CREATE INDEX "orders_performer_paid_idx" ON "orders" USING btree ("performer_id","status","paid_at");--> statement-breakpoint
CREATE INDEX "orders_session_queue_idx" ON "orders" USING btree ("session_id","queue_status","queue_seq");--> statement-breakpoint
CREATE INDEX "orders_fan_idx" ON "orders" USING btree ("fan_id");--> statement-breakpoint
CREATE INDEX "orders_awaiting_idx" ON "orders" USING btree ("performer_id","status","pay_code");--> statement-breakpoint
CREATE INDEX "point_ledger_performer_idx" ON "point_ledger" USING btree ("performer_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "point_ledger_fee_once" ON "point_ledger" USING btree ("order_id","reason");--> statement-breakpoint
CREATE INDEX "promotions_lookup_idx" ON "promotions" USING btree ("slot","city","act_type","ends_at");--> statement-breakpoint
CREATE INDEX "shows_performer_starts_idx" ON "shows" USING btree ("performer_id","starts_at");--> statement-breakpoint
CREATE INDEX "wishes_performer_idx" ON "wishes" USING btree ("performer_id","status");