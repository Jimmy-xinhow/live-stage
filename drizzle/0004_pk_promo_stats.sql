ALTER TABLE "games" ADD COLUMN "opponent_id" uuid;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "impressions" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "promotions" ADD COLUMN "clicks" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_opponent_id_performers_id_fk" FOREIGN KEY ("opponent_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "games_opponent_idx" ON "games" USING btree ("opponent_id","status");