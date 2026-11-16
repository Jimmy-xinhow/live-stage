-- 新增的資料表同樣只允許伺服器端連線
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_performers" ENABLE ROW LEVEL SECURITY;
