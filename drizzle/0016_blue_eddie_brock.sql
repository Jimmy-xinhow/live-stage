ALTER TABLE "orders" ADD COLUMN "client_key" varchar(36);--> statement-breakpoint
CREATE UNIQUE INDEX "orders_client_key_idx" ON "orders" USING btree ("client_key");