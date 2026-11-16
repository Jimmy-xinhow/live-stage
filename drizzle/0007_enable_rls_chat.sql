-- 聊天室紀錄同樣只允許伺服器端連線
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
