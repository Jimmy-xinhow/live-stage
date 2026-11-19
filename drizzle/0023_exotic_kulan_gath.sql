CREATE TABLE "rate_hits" (
	"key" varchar(160) NOT NULL,
	"window" integer NOT NULL,
	"n" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "rate_hits_key_window_pk" PRIMARY KEY("key","window")
);
--> statement-breakpoint
CREATE INDEX "rate_hits_exp_idx" ON "rate_hits" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "rate_hits" ENABLE ROW LEVEL SECURITY;
