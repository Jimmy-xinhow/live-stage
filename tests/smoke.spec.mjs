/**
 * 關鍵流程冒煙測試。用 node 內建的 test runner＋playwright，
 * 不另外裝測試框架。跑法：
 *
 *   npm run dev            # 另一個終端機，確定用的是乾淨的示範資料
 *   npm run test:smoke     # BASE=http://localhost:3000 可覆寫
 *
 * 涵蓋：公開頁面能開、點歌下單→模擬付款→進排隊→表演者結單→退款，
 * 以及頻率限制有在運作。
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
let browser;
let fan;      // 觀眾的 context
let artist;   // 表演者後台的 context

before(async () => {
  browser = await chromium.launch();
  fan = await browser.newContext();
  artist = await browser.newContext();
  // 表演者免登入入口（DEV_LOGIN=true 時才有）；重導到正式網域會失敗，忽略即可
  const p = await artist.newPage();
  await p.goto(`${BASE}/api/auth/dev?as=demo`).catch(() => {});
  await p.close();
});

after(async () => { await browser?.close(); });

test("公開頁面都開得起來", async () => {
  const p = await fan.newPage();
  // 收斂後對外只留這幾頁（見 lib/features.ts）
  for (const path of ["/", "/u/demo", "/p/demo", "/me", "/login"]) {
    const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    assert.equal(r.status(), 200, `${path} 應該回 200，實際 ${r.status()}`);
  }
  // 收起來的功能應該回 404，不是半開著
  for (const path of ["/find", "/events", "/map", "/invite", "/area", "/org"]) {
    const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    assert.equal(r.status(), 404, `${path} 已收斂，應該回 404，實際 ${r.status()}`);
  }
  await p.close();
});

test("點歌→付款→排隊→結單→退款", async () => {
  const p = await fan.newPage();
  await p.goto(`${BASE}/p/demo`, { waitUntil: "networkidle" });

  // 從頁面帶下來的資料裡挑一首歌（點歌才會進排隊；純打賞不會）
  const html = await p.content();
  const m = /\\"id\\":\\"([0-9a-f-]{36})\\",\\"title\\":\\"([^"\\]+)\\"/.exec(html) ?? /"id":"([0-9a-f-]{36})","title":"([^"]+)"/.exec(html);
  assert.ok(m, "應該在點歌頁找得到歌單項目");
  const menuItemId = m[1];

  // 直接打 API 下單，避開 UI 細節。
  // 連續跑測試時可能還卡在上一輪的頻率限制視窗，等過去再試一次。
  const place = () => p.evaluate(async (id) => {
    const r = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "demo", menuItemId: id, amount: 100, nickname: "冒煙測試", message: "e2e", payMode: "auto" }),
    });
    return { status: r.status, retryAfter: Number(r.headers.get("retry-after") ?? 0), body: await r.json().catch(() => null) };
  }, menuItemId);
  let order = await place();
  if (order.status === 429) {
    await new Promise((r) => setTimeout(r, (order.retryAfter + 1) * 1000));
    order = await place();
  }
  assert.equal(order.status, 200, `下單應該成功，實際 ${order.status} ${JSON.stringify(order.body)}`);
  const tradeNo = order.body.tradeNo;
  assert.ok(tradeNo, "下單結果要帶訂單號");

  // 模擬付款（ECPAY_ALLOW_MOCK=true 時才有）
  const paid = await p.evaluate(async (t) => {
    const r = await fetch(`/api/mock-pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ k: "order", t, result: "success" }),
    });
    return r.status;
  }, tradeNo);
  assert.ok(paid === 200 || paid === 302, `模擬付款應該成功，實際 ${paid}`);

  // 訂單狀態應該變成已付款
  const st = await p.evaluate(async (t) => {
    const r = await fetch(`/api/orders/${t}`);
    return r.ok ? await r.json() : null;
  }, tradeNo);
  assert.equal(st?.status, "paid", "付款後訂單應該是 paid");
  assert.equal(st?.queueStatus, "waiting", "點歌付款後應該進排隊");
  await p.close();

  // 表演者後台看得到這筆
  const a = await artist.newPage();
  await a.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  assert.ok(await a.getByText("冒煙測試").first().isVisible(), "後台總覽應該看得到這筆點歌");

  // 退款：訂單標成 refunded，服務費點數退回來
  const dash = await a.content();
  const om = /"id":"([0-9a-f-]{36})","name":"冒煙測試"/.exec(dash) ?? /\\"id\\":\\"([0-9a-f-]{36})\\",\\"name\\":\\"冒煙測試\\"/.exec(dash);
  assert.ok(om, "後台頁面裡應該找得到這筆訂單的 id");
  const refund = await a.evaluate(async (id) => {
    const r = await fetch(`/api/dashboard/orders/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refund", note: "e2e 測試" }),
    });
    return r.status;
  }, om[1]);
  assert.equal(refund, 200, "退款應該成功");
  await a.close();

  const after = await (async () => {
    const q = await fan.newPage();
    await q.goto(`${BASE}/o/${tradeNo}`, { waitUntil: "domcontentloaded" });
    const r = await q.evaluate(async (t) => {
      const res = await fetch(`/api/orders/${t}`);
      return res.ok ? await res.json() : null;
    }, tradeNo);
    await q.close();
    return r;
  })();
  assert.equal(after?.status, "refunded", "退款後訂單狀態應該是 refunded");
});

// 這支會把下單的額度用完，所以放在最後
test("頻率限制會擋住連續下單", async () => {
  const p = await fan.newPage();
  await p.goto(`${BASE}/p/demo`, { waitUntil: "domcontentloaded" });
  const codes = await p.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 20; i++) {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "demo", amount: 50, payMode: "auto" }),
      });
      out.push(r.status);
    }
    return out;
  });
  assert.ok(codes.includes(429), `連續 20 次下單應該出現 429，實際 ${[...new Set(codes)].join(",")}`);
  await p.close();
});

/**
 * 授權邊界。用一個完全沒有 cookie 的 context 打後台與 API，
 * 每一條都應該被擋下來——這類洞不會在畫面上看出來，只能靠測試守。
 */
test("沒登入進不了後台，API 也拿不到資料", async () => {
  const anon = await browser.newContext();
  const p = await anon.newPage();

  for (const path of ["/dashboard", "/dashboard/band", "/dashboard/ledger", "/dashboard/plan", "/dashboard/interact", "/dashboard/settings", "/dashboard/fans"]) {
    const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    const url = p.url();
    assert.ok(
      url.includes("/login") || r.status() === 404 || r.status() === 401 || r.status() === 403,
      `${path} 沒登入應該被擋，實際停在 ${url}（${r.status()}）`,
    );
    assert.ok(!url.includes("/dashboard/"), `${path} 沒登入不該留在後台頁，實際 ${url}`);
  }

  // 平台後台
  const admin = await p.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
  assert.ok(p.url().includes("/admin/login") || admin.status() === 404, `/admin 沒登入應該被擋，實際 ${p.url()}`);

  // 寫入型 API 一律要身分
  for (const path of ["/api/dashboard/ledger", "/api/dashboard/band", "/api/dashboard/plan", "/api/dashboard/settings"]) {
    const r = await anon.request.get(BASE + path);
    assert.ok([401, 403, 404, 405].includes(r.status()), `${path} 沒登入應該被擋，實際 ${r.status()}`);
  }

  // 團員頁要先登入才看得到拆帳
  await p.goto(`${BASE}/band/me`, { waitUntil: "domcontentloaded" });
  assert.ok(!p.url().endsWith("/band/me") || (await p.content()).includes("登入"), "團員頁沒登入應該要求登入");

  await anon.close();
});

test("互動遊戲只在室內直播開，街頭場的端點不存在", async () => {
  const anon = await browser.newContext();
  // demo 是街頭場（kind=street），對戰類遊戲的 API 應該回 404 而不是半開著
  const r = await anon.request.get(`${BASE}/api/p/demo/game`);
  assert.equal(r.status(), 404, `街頭場的遊戲端點應該回 404，實際 ${r.status()}`);
  await anon.close();
});

test("法務三份文件都開得起來，而且頁尾連得到", async () => {
  const p = await fan.newPage();
  for (const path of ["/terms", "/privacy", "/refund"]) {
    const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded" });
    assert.equal(r.status(), 200, `${path} 應該回 200，實際 ${r.status()}`);
  }
  await p.goto(`${BASE}/pricing`, { waitUntil: "domcontentloaded" });
  for (const label of ["服務條款", "隱私權政策", "退款與爭議"]) {
    assert.ok(await p.locator(`footer a:has-text("${label}")`).count(), `頁尾應該要有「${label}」連結`);
  }
  await p.close();
});
