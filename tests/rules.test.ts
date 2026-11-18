import { describe, expect, it } from "vitest";
import { GAME_TYPES, UNITS } from "../src/lib/games";
import { PROMO } from "../src/lib/market";
import { EVENT_PROMO } from "../src/lib/events";
import { streamInfo } from "../src/lib/acts";
import { fmtTaipei } from "../src/lib/format";
import { feeFor } from "../src/lib/billing";
import { planHasGames, planHasPro, breakEven, boughtForFeatures } from "../src/lib/plans";
import { effectivePlan } from "../src/lib/subscription";

describe("互動遊戲規則", () => {
  it("免費玩法沒有付費道具，付費遊戲的道具都有固定加成", () => {
    for (const [type, t] of Object.entries(GAME_TYPES)) {
      const units = UNITS[type as keyof typeof UNITS];
      if (!t.paid) expect(units).toHaveLength(0);
      for (const u of units) {
        expect(u.price).toBeGreaterThan(0);
        expect(u.power).toBeGreaterThan(0); // 效果固定、沒有機率
      }
    }
  });
  it("問答與轉盤完全免費", () => {
    expect(GAME_TYPES.quiz.paid).toBe(false);
    expect(GAME_TYPES.wheel.paid).toBe(false);
  });
  it("有冷卻的遊戲才靠狂點，拔河與賽跑沒有冷卻", () => {
    expect(GAME_TYPES.battle.cooldown).toBeGreaterThan(0);
    expect(GAME_TYPES.tug.cooldown).toBe(0);
    expect(GAME_TYPES.race.cooldown).toBe(0);
  });
});

describe("曝光版位", () => {
  it("每個版位都有每日點數與格數上限", () => {
    for (const cfg of [...Object.values(PROMO), ...Object.values(EVENT_PROMO)]) {
      expect(cfg.daily).toBeGreaterThan(0);
      expect(cfg.cap).toBeGreaterThan(0);
      expect(cfg.cap).toBeLessThanOrEqual(4);
    }
  });
});

describe("直播平台模式", () => {
  it("TikTok 與 17LIVE 是安全模式，YouTube、Twitch、FB、IG 是完整模式", () => {
    expect(streamInfo("https://www.tiktok.com/@someone/live")?.safe).toBe(true);
    expect(streamInfo("https://17.live/zh-TW/live/123")?.safe).toBe(true);
    for (const u of ["https://www.youtube.com/watch?v=abcd1234xyz", "https://twitch.tv/someone", "https://www.facebook.com/x/videos/1", "https://www.instagram.com/x/live"])
      expect(streamInfo(u)?.safe).toBe(false);
  });
  it("YouTube 與 Twitch 可以嵌入播放", () => {
    expect(streamInfo("https://www.youtube.com/watch?v=abcd1234xyz")?.embed).toContain("youtube.com/embed/");
    expect(streamInfo("https://twitch.tv/someone")?.embed).toContain("player.twitch.tv");
  });
});

describe("台北時間格式", () => {
  it("用固定換算，不受伺服器時區影響", () => {
    expect(fmtTaipei("2026-11-20T12:00:00.000Z")).toBe("11/20（週五） 20:00");
    expect(fmtTaipei("2026-11-20T16:30:00.000Z", false)).toBe("11/21（週六）");
  });
});

/* ───────── 方案與服務費 ─────────
   方案頁上寫了「免費 3%、付費 1%」。程式沒吃 plan 的話那就是不實陳述，
   所以這幾條是在守那個承諾。 */

describe("方案", () => {
  it("服務費率跟著方案走", () => {
    expect(feeFor(200, "free")).toBe(600);   // 200 × 3%
    expect(feeFor(200, "base")).toBe(200);   // 200 × 1%
    expect(feeFor(200, "play")).toBe(200);
    expect(feeFor(200, "all")).toBe(200);
    // 認不得的方案當成免費，不能因為資料髒就少收
    expect(feeFor(200, "???")).toBe(600);
  });

  it("過期的付費方案等於免費", () => {
    const past = new Date(Date.now() - 1000);
    const future = new Date(Date.now() + 86_400_000);
    expect(effectivePlan({ plan: "all", planUntil: past })).toBe("free");
    expect(effectivePlan({ plan: "all", planUntil: future })).toBe("all");
    // 付費方案沒有到期日是資料壞了，當免費處理比較安全
    expect(effectivePlan({ plan: "all", planUntil: null })).toBe("free");
    expect(effectivePlan({ plan: "free", planUntil: null })).toBe("free");
  });

  it("功能閘門分得清楚哪一層買得到什麼", () => {
    expect(planHasGames("free")).toBe(false);
    expect(planHasGames("base")).toBe(false);
    expect(planHasGames("play")).toBe(true);
    expect(planHasGames("all")).toBe(true);
    expect(planHasPro("play")).toBe(false);
    expect(planHasPro("all")).toBe(true);
  });

  it("回本點講得出來才能寫在頁面上", () => {
    // 免費 3% 與點歌台 1% 差 2%，299 ÷ 2% = 14,950，進位到整千
    expect(breakEven()).toBe(15000);
    // 互動與全部的費率和點歌台一樣，所以是買功能不是買費率
    expect(boughtForFeatures("base")).toBe(false);
    expect(boughtForFeatures("play")).toBe(true);
    expect(boughtForFeatures("all")).toBe(true);
  });
});

describe("上線前檢查", () => {
  // 這組測試的目的不是驗證環境，是驗證「這個檢查真的會擋」。
  // 它跑在沒有任何正式設定的測試環境，所以 block 項目本來就該全部沒過。
  it("開發後門在 LIVE_MODE 下一定是 block 等級", async () => {
    const { preflight } = await import("@/lib/preflight");
    const byKey = new Map(preflight().map((c) => [c.key, c]));
    for (const k of ["dev_login", "mock_pay", "seed_demo", "session_secret", "encryption_key", "admin_2fa", "payment_env"]) {
      expect(byKey.get(k)?.level, k).toBe("block");
    }
  });

  it("測試環境沒設正式值，所以檢查抓得到問題", async () => {
    const { preflightSummary } = await import("@/lib/preflight");
    const s = preflightSummary();
    expect(s.blocking.length).toBeGreaterThan(0);
    expect(s.launchable).toBe(false);
  });

  it("沒宣告 LIVE_MODE 就不擋啟動", async () => {
    const { assertLaunchable, liveMode } = await import("@/lib/preflight");
    expect(liveMode).toBe(false);
    expect(() => assertLaunchable()).not.toThrow();
  });

  it("每個沒過的項目都講得出要做什麼", async () => {
    const { preflight } = await import("@/lib/preflight");
    for (const c of preflight()) {
      expect(c.fix.length, c.key).toBeGreaterThan(10);
      expect(c.title.length, c.key).toBeGreaterThan(4);
    }
  });
});

describe("功能埋點", () => {
  it("每個事件名稱都有看得懂的中文標籤", async () => {
    const { EVENTS } = await import("@/lib/usage");
    for (const [k, v] of Object.entries(EVENTS)) {
      expect(k).toMatch(/^[a-z_]+$/);
      expect(v.length, k).toBeGreaterThan(1);
    }
  });

  it("埋點壞掉不會把正事一起拖下水", async () => {
    const { track } = await import("@/lib/usage");
    // 不存在的表演者 id：外鍵會失敗，但 track 要自己吞掉
    await expect(track("go_live", "00000000-0000-0000-0000-000000000000")).resolves.toBeUndefined();
  });

  it("記錄得到、也算得出有幾位表演者在用", async () => {
    const { track, usageSummary, unusedFeatures } = await import("@/lib/usage");
    const { mkPerformer } = await import("./helpers");
    const [a, b] = await Promise.all([mkPerformer(), mkPerformer()]);
    await track("game_start", a.id);
    await track("game_start", a.id);
    await track("game_start", b.id);

    const row = (await usageSummary(1)).find((r) => r.name === "game_start")!;
    expect(row.count).toBeGreaterThanOrEqual(3);
    expect(row.people).toBeGreaterThanOrEqual(2);
    expect(row.label).toBe("開一場遊戲");

    // 沒被用過的功能要列得出來，那才是這張表的用處
    expect((await unusedFeatures(1)).some((u) => u.name === "refund")).toBe(true);
  });
});
