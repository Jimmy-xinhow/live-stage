CREATE INDEX "orders_session_status_idx" ON "orders" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "orders_performer_fan_idx" ON "orders" USING btree ("performer_id","fan_id","status");--> statement-breakpoint
CREATE INDEX "usage_events_time_idx" ON "usage_events" USING btree ("created_at");
