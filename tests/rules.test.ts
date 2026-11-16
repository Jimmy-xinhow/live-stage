import { describe, expect, it } from "vitest";
import { GAME_TYPES, UNITS } from "../src/lib/games";
import { PROMO } from "../src/lib/market";
import { EVENT_PROMO } from "../src/lib/events";
import { streamInfo } from "../src/lib/acts";
import { fmtTaipei } from "../src/lib/format";

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
