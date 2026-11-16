# 現場（暫定名）｜舞台表演者的現場互動＋曝光媒合平台

> 品牌名未定，`APP_NAME` 預設「現場」只是工作代號，改環境變數即可全站替換。

對象是所有舞台表演者（街頭藝人、駐唱、樂團、DJ、魔術、舞蹈、主持、樂器、特技、脫口秀）。平台只做資訊媒合與互動工具：不抽成、不經手演出款項、不賣代幣、不做場地或公部門合作。只有網頁版。

**帳號兩種**
- 表演者：建立作品頁、現場點歌與互動、收邀約、買曝光（`/dashboard`）。
- 店家／主辦：刊登演出活動、標記平台上的表演者、買活動曝光（`/org`）。兩種都用 LINE 登入，點數共用一套購買流程；店家帳號不會出現在表演者的搜尋與地區頁。

**雙入口**
- 去看表演：首頁／`/find` 依名字、類型、縣市找正在演出與近兩週行程。
- 請人來表演：`/invite` 填場合、日期、預算，一次最多發給 5 位表演者；表演者在 `/dashboard/inquiries` 回覆報價，邀請人在 `/me` 與 LINE 收到。平台不介入成交。

**活動（店家／主辦）**：`/org/events` 刊登，標記的表演者在 `/dashboard/events` 確認後才公開顯示；主辦勾選「通知粉絲」時，確認當下用主辦的點數發 LINE 通知。活動頁 `/e/[id]`、列表 `/events`（可依縣市），首頁與地區頁也會帶出近期活動，並寫入 sitemap 與 MusicEvent 結構化資料。

**邀約評價**：活動日之後，送出邀約並收到報價的人可以在 `/me` 給 1–5 顆星與評語，顯示在作品頁，一筆只能評一次，表演者不能修改或刪除。

**作品頁 `/u/[slug]`**：類型、曲風、起價、可接場合、服務地區、歌單，加上系統自動累積、表演者不能改的「平台演出紀錄」（場次、被點播數、粉絲、現場簽到、邀約回覆率）。

**自助曝光（`/dashboard/promote`、`/org/promote`）**：表演者買搜尋置頂（30 點／天，每區每類型 2 格）或首頁精選（50 點／天，4 格）；店家主辦買活動列表置頂（40 點／天）或首頁活動推薦（60 點／天）。一律標示「付費推薦」，價格在 `src/lib/market.ts` 的 `PROMO` 與 `src/lib/events.ts` 的 `EVENT_PROMO`。
刊登期間會記錄**曝光**（版位被渲染的次數）與**點擊**（從版位點進去的次數，前台用 `navigator.sendBeacon` 回報），表演者版位另外顯示期間內新增的追蹤與邀約。

**直播**：平台不代管串流。表演者貼自己的 YouTube／Twitch／Facebook／Instagram／TikTok／17LIVE 網址，粉絲在本站互動與打賞；`/overlay/[slug]?k=token` 給 OBS 當瀏覽器來源。TikTok、17LIVE 屬「安全模式」，浮層不顯示 QR、金額與打賞提示（`src/lib/acts.ts` 的 `streamInfo`）。

**粉絲互動（免費，`/p/[slug]/hub`）**：應援能量、現場簽到集章、免費抽獎、舉手、許願池、護照（`/me`）。表演者在 `/dashboard/interact` 操作。

**互動遊戲（`src/lib/games.ts`）**：
- 可付費加成：兵團對戰、拔河、歌曲賽跑、攻城、集氣解鎖，共用一個 lane 引擎。免費狂點有冷卻與三成上限；付費加成走一般訂單（款項直接給表演者），效果固定、立即生效，不含機率、獎金或可保留的餘額。
- 完全免費：猜歌王／鐵粉測驗（表演者出題，答對且越快分數越高）、命運轉盤（觀眾投稿、表演者審核後才進轉盤、觀眾沒有獎品）。
- 跨表演者 PK：和另一位正在演出的表演者對戰，對方會收到 LINE 通知；兩邊的觀眾在各自的頁面只能幫自己這邊加分，付費加成也一律算給付款頁面所屬的表演者（款項自然也進他的帳戶）。
- 結果只決定表演內容。手機、大螢幕（`/live/[slug]/game`）與 OBS 浮層同步。

**地圖（`/map`）**：正在演出的表演者與近兩週的活動標在地圖上，可依縣市篩選。底圖用 OpenStreetMap＋Leaflet（CDN），載不到時自動改成依經緯度排列的簡易位置圖，清單一樣可用。表演者在「對外頁面」、主辦在活動表單可填精確經緯度，不填就標在縣市中心（`src/lib/areas.ts` 內建 22 縣市座標）。

**直播聊天室（選用）**：設定 `YOUTUBE_API_KEY` 後，YouTube 直播的聊天室留言會進到大螢幕與 OBS 浮層，並累積應援能量與「聊天室熱度」排行（算留言數，不是金額）。沒設金鑰就整個功能關閉，其他流程不受影響。輪詢由大螢幕／浮層觸發，伺服器端有 8 秒間隔保護（`src/lib/chat.ts`）。

**點歌回憶卡**：付款完成的點歌在 `/o/[tradeNo]` 可以存下 1080×1920 的分享圖（`/api/card/[tradeNo]`，用 sharp 把 SVG 轉成 PNG，環境缺字型時自動退回 SVG）。

**設計系統「演出刊物」**：紙色底 #F4F1EA、墨色字、單一強調色 #FF4F1F；Noto Sans TC＋Archivo 數字；按鈕三層（內亮邊、2px 底座、柔影，按下下沉）圓角 14。類別都在 `src/app/globals.css`（`.btn-primary/.btn-secondary/.btn-now/.btn-quiet`、`.field`、`.tag`、`.sec`、`.night` 等）。

**平台管理（`/admin`）**：近 30 天成交、服務費、曝光收入與邀約數；表演者與店家主辦清單（可調點數、停用）；活動清單可直接下架（下架後活動頁標示已取消，也不進列表與 sitemap）。

**LINE 操作**：表演者可在 LINE 直接確認轉帳、兌換獎勵、確認或婉拒被標記的活動；輸入「邀約」看待回覆的需求、「活動」看被標記的活動、「今日」看業績、「點數」查餘額。

**尚未做**：活動售票（只放外部連結）、Twitch 聊天室（目前只接 YouTube）、原生 App。

以下為點歌打賞核心（沿用）：

**金流（雙軌，平台都不經手）**
- 免申請模式（預設）：藝人上傳自己的 LINE Pay／街口／全支付收款碼截圖（自動解碼，網址型收款碼觀眾可直接點開）。觀眾點歌拿到 4 碼點歌碼 → 轉帳備註填碼 → 按「我付好了」→ 藝人在控制台「待確認收款」按「已收到」，或在 LINE 官方帳號按快速回覆／直接輸入 4 碼 → 進排隊。15 分鐘未確認自動逾時，2 小時內仍可補確認；「金額不同」可修正實收金額，「沒收到」會通知觀眾取消。
- 刷卡模式（選用）：藝人串自己的綠界或藍新，信用卡／Apple Pay 付款後自動確認。兩種都開時觀眾可自選。
**收費**：點數制，每筆成交扣 3%（1 點 = NT$1），新手送 200 點，可透支 100 點避免演出中斷；點數向平台購買。

**粉絲追蹤**
- 觀眾：點歌表單預設勾選「追蹤藝人」（付款確認後生效）、結果頁一鍵追蹤、`/me` 我的追蹤（正在表演・去點歌、演出預告、我的點歌、通知開關）、官方帳號輸入「追蹤」回傳清單。
- 藝人：`/dashboard/fans` 演出預告（通知追蹤者）、粉絲分群（新粉／常客／大粉／沉睡）、看個別粉絲點歌紀錄、分群群發與一對一感謝（由平台官方帳號發送，依人數扣點，群發每天上限 3 次）。

**排行榜與成就**
- 觀眾頁「排行榜」分頁：本場／本月／總榜（只計入用 LINE 身分的支持，全匿名者顯示匿名；金額是否公開跟著藝人設定）、我的名次與「再支持 NT$X 就能超越第 N 名」、大螢幕顯示本場前三。本場第一名被超越時 LINE 通知原第一名。
- 藝人自訂成就（`/dashboard/rewards`）：累計金額或次數門檻、徽章、獎勵、數量上限；一鍵套用 4 個建議成就；新增時自動補發給已達標粉絲。付款確認後自動解鎖並 LINE 通知；徽章顯示在排行榜、排隊、留言牆、大螢幕。
- 領取：粉絲按「領取獎勵」得到 4 碼兌換碼 → 藝人收到 LINE 通知（可按快速回覆「已兌換」）或在控制台／成就頁按「已兌換」→ 粉絲收到確認。

**地區與類型頁（SEO）**
- `/area` 全台總覽、`/area/[slug]` 縣市頁、`/area/[slug]/[act]` 縣市＋表演類型頁；縣市資料在 `src/lib/areas.ts`，類型在 `src/lib/acts.ts`。
- 只有「啟用中＋已設縣市＋有介紹或歌單」的表演者會上架（`src/lib/discover.ts` 的 `listable`）；沒有表演者的頁面 `noindex,follow`，也不進 sitemap。作品頁 `/u/[slug]` 是 canonical。
- JSON-LD：首頁 WebSite／WebApplication／FAQPage，地區頁 BreadcrumbList／ItemList／MusicEvent／FAQPage，藝人頁 PerformingGroup／MusicEvent（`src/lib/seo.tsx`）。`/sitemap.xml`、`/robots.txt` 自動產生。
- 藝人在「收款與頁面設定」選演出縣市＋常駐行政區／地點；後台開通清單會提示。
- 平台定位：只做系統，不做場地、商圈或公部門合作。

## 本機啟動
```bash
npm install
printf 'APP_BASE_URL=http://localhost:3000\nECPAY_ALLOW_MOCK=true\nDEV_LOGIN=true\n' > .env.local
npm run dev
```
未設 `DATABASE_URL` 時使用內嵌 PGlite（`.data/`），自動建立 demo（演出中、已有排隊）與 demo-mia、demo-mc、demo-magic、demo-dj 四個示範表演者：
- 觀眾頁 http://localhost:3000/p/demo（「追蹤」在開發模式會用測試觀眾身分）
- 店家主辦後台：登入頁的「以示範主辦登入」（demo-venue，已有一場示範活動）
- 大螢幕 http://localhost:3000/live/demo
- 藝人後台 http://localhost:3000/login →「開發模式登入」→ 演出控制台
- `npm test`：綠界 CheckMacValue（官方範例）、藍新 AES／TradeSha、計費、遊戲與曝光規則、直播平台判斷、台北時間格式

## 主要頁面
`/` 首頁（去看表演／請人來表演）・`/map` 地圖・`/events`、`/e/[id]` 活動・`/find` 搜尋結果・`/u/[slug]` 表演者作品頁・`/invite` 邀請演出・`/area`、`/area/[slug]`、`/area/[slug]/[act]` 地區頁・`/p/[slug]/hub` 互動中心・`/p/[slug]/game` 遊戲・`/live/[slug]/game` 遊戲大螢幕・`/overlay/[slug]?k=` OBS 浮層・`/me` 護照與我的邀約・`/dashboard/profile` 作品頁資料・`/dashboard/inquiries` 邀約・`/dashboard/promote` 曝光版位・`/dashboard/interact` 互動與遊戲・`/dashboard/events` 被標記的活動・`/org`、`/org/events`、`/org/promote`、`/org/profile`、`/org/points` 店家主辦後台・`/p/[slug]` 觀眾頁（歌單搜尋分類、排隊、留言牆、追蹤、直接打賞）・`/o/[tradeNo]` 我的點歌即時排位・`/live/[slug]` 大螢幕・`/dashboard` 總覽・`/dashboard/stage` 演出控制台・`/dashboard/menu` 歌單（整份貼上匯入）・`/dashboard/fans` 粉絲排行・`/dashboard/points` 點數・`/dashboard/settings` 收款與頁面設定・`/dashboard/poster` A5 立牌・`/admin` 平台管理

## 上線
1. Postgres（Supabase/Railway）設 `DATABASE_URL`，執行 `npm run db:migrate`。
2. LINE：同一 Provider 建 LINE Login（含 LIFF，Endpoint `{APP_BASE_URL}/p`）與 Messaging API（Webhook `/api/line/webhook`）。QR 會自動改指向 `https://liff.line.me/{LIFF_ID}/{slug}`，相機掃描直接開 LINE 並帶出身分。
3. 平台收點數用的綠界或藍新設在 `PLATFORM_*`；`PAYMENT_ENV=production`、`ECPAY_ALLOW_MOCK=false`、`DEV_LOGIN=false`。
4. 想開直播聊天室：在 Google Cloud 開 YouTube Data API v3 金鑰，設成 `YOUTUBE_API_KEY`（可另設 `CHAT_HYPE_PER_MESSAGE`，預設每則留言 +1% 應援）。
5. `npm run build && npm start`（Railway / Vercel 皆可）。
6. 到 Google Search Console 驗證網域並提交 `{APP_BASE_URL}/sitemap.xml`。

## 安全與一致性
- 付款通知 URL 帶訂單號，用該藝人的金鑰驗章（綠界 CheckMacValue／藍新 TradeSha＋AES 解密），比對商店代號與金額。
- `pending→paid` 單向更新；排隊序號、3% 扣點在同一個交易內完成並鎖定藝人列，重送通知不重複扣點、不重複推播。
- 藝人金鑰 AES-256-GCM 加密；LINE 身分只採信伺服器驗證的 ID token。
