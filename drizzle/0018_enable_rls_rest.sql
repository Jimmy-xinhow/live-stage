-- 後來新增的資料表補上 RLS。
-- 所有存取都經過 Next.js 伺服器端連線（服務角色），對 Supabase 的 anon/authenticated
-- 角色一律拒絕：不開政策就等於沒有人能直接從前端讀到。
-- 這幾張表尤其不該外露：後台操作紀錄、檢舉、樂團拆帳、推播佇列、名單。
ALTER TABLE "admin_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "band_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_splits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "line_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "line_outbox" ENABLE ROW LEVEL SECURITY;
