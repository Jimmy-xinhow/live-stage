import { describe, expect, it } from "vitest";
import {
  applyBoost, currentGame, endGame, GAME_TYPES, publicGame, quizAnswer, quizControl,
  startGame, tap, UNITS, wheelReview, wheelSpin, wheelSubmit,
} from "@/lib/games";
import { battleGamesOn } from "@/lib/features";
import { effectivePlan } from "@/lib/subscription";
import { sessionMode } from "@/lib/orders";
import { goLiveFor, mkFan, mkPerformer, yesterday } from "./helpers";

const base = { reward: "下一首你點", minutes: 10 };

/** 開一場指定類型的遊戲，表演者已經在室內直播模式演出中 */
async function arena(type: Parameters<typeof startGame>[1], lanes: string[], extra: Record<string, unknown> = {}) {
  const p = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
  const g = await startGame(p, type, { ...base, lanes, ...extra });
  return { p, g };
}

describe("互動遊戲：一場打到底", () => {
  it("開局→點按→付費加成→結算，分數一路對得上", async () => {
    const { p, g } = await arena("battle", ["紅隊", "藍隊"]);
    const f = await mkFan("阿明");

    const after = await tap(g.id, f.id, 0);
    expect(after!.state.lanes[0].score).toBe(GAME_TYPES.battle.tap);

    // 騎士 NT$50＝150 戰力；付 100 等於兩倍
    const boosted = await applyBoost(g.id, f.id, "阿明", 0, "knight", 100);
    expect(boosted!.state.lanes[0].score).toBe(GAME_TYPES.battle.tap + 300);
    expect(boosted!.state.feed[0].text).toContain("騎士");

    await applyBoost(g.id, null, "路人", 1, "dragon", 500);
    const ended = await endGame(p);
    expect(ended!.status).toBe("ended");
    expect(ended!.state.winner).toBe(1);
  });

  it("有冷卻的遊戲擋得住連點", async () => {
    const { g } = await arena("battle", ["紅隊", "藍隊"]);
    const f = await mkFan();
    await tap(g.id, f.id, 0);
    const again = await tap(g.id, f.id, 0);
    // 冷卻內的點按不改變狀態
    expect(again!.state.lanes[0].score).toBe(GAME_TYPES.battle.tap);
  });

  it("沒有冷卻的遊戲一次最多算 12 下", async () => {
    const { g } = await arena("race", ["歌 A", "歌 B"]);
    const f = await mkFan();
    const r = await tap(g.id, f.id, 0, 999);
    expect(r!.state.lanes[0].score).toBe(12 * GAME_TYPES.race.tap);
  });

  it("免費點按有上限，不會有人靠狂點蓋過付費的人", async () => {
    const { g } = await arena("siege", ["魔王"], { goal: 100_000 });
    const fans = await Promise.all([mkFan("a"), mkFan("b"), mkFan("c")]);
    let last = 0;
    for (let i = 0; i < 12; i++) {
      for (const f of fans) {
        const r = await tap(g.id, f.id, 0);
        if (r) last = r.state.lanes[0].score;
      }
    }
    // 免費分數不會無限成長：上限是 200 起步 + 已有付費分數的三成
    expect(last).toBeLessThanOrEqual(200 + GAME_TYPES.siege.tap * fans.length);
  });

  it("拔河差距達標就結束，贏的是領先那隊", async () => {
    const { g } = await arena("tug", ["左", "右"], { goal: 5 });
    const f = await mkFan();
    const r = await tap(g.id, f.id, 1, 6);
    expect(r!.status).toBe("ended");
    expect(r!.state.winner).toBe(1);
  });

  it("集氣解鎖只算支持金額，點按會被擋下來", async () => {
    const { g } = await arena("goal", ["合唱"], { goal: 1000 });
    const f = await mkFan();
    await expect(tap(g.id, f.id, 0)).rejects.toThrow(/只計算支持金額/);
    const r = await applyBoost(g.id, f.id, "阿明", 0, "support", 1000);
    expect(r!.state.lanes[0].score).toBe(1000);
    expect(r!.status).toBe("ended");
  });

  it("開一場新的會把前一場收掉，不會兩場同時跑", async () => {
    const { p, g } = await arena("battle", ["紅", "藍"]);
    const g2 = await startGame(p, "race", { ...base, lanes: ["A", "B"] });
    const now = await currentGame(p.id);
    expect(now!.id).toBe(g2.id);
    expect(now!.id).not.toBe(g.id);
  });
});

describe("猜歌王・鐵粉測驗", () => {
  const qs = [{ q: "這首歌誰唱的？", options: ["A", "B", "C"], answer: 1 }];

  it("答對才得分，答越快分數越高，同一題不能答兩次", async () => {
    const { g } = await arena("quiz", ["全場"], { questions: qs });
    const f = await mkFan("阿華");
    await quizControl(g.id, "open", 15);
    const r = await quizAnswer(g.id, f.id, "阿華", 1);
    expect(r!.state.quiz!.players[f.id].score).toBe(100);
    await expect(quizAnswer(g.id, f.id, "阿華", 1)).rejects.toThrow(/已經答過/);

    const wrong = await mkFan("阿強");
    const r2 = await quizAnswer(g.id, wrong.id, "阿強", 0);
    expect(r2!.state.quiz!.players[wrong.id].score).toBe(0);
  });

  it("還沒開放作答就不能答", async () => {
    const { g } = await arena("quiz", ["全場"], { questions: qs });
    const f = await mkFan();
    await expect(quizAnswer(g.id, f.id, "x", 1)).rejects.toThrow(/現在不能作答/);
  });

  it("公布答案前，正解不會出現在觀眾拿到的資料裡", async () => {
    const { g } = await arena("quiz", ["全場"], { questions: qs });
    const f = await mkFan();
    await quizControl(g.id, "open");
    expect(publicGame(await currentGame(g.performerId), f.id)!.quiz!.question!.answer).toBeNull();
    await quizControl(g.id, "reveal");
    expect(publicGame(await currentGame(g.performerId), f.id)!.quiz!.question!.answer).toBe(1);
  });

  it("問答完全免費，沒有任何付費道具", () => {
    expect(GAME_TYPES.quiz.paid).toBe(false);
    expect(UNITS.quiz ?? []).toHaveLength(0);
  });
});

describe("命運轉盤", () => {
  it("每人最多投稿 2 個，審核過才會被轉到", async () => {
    const { g } = await arena("wheel", ["轉盤"]);
    const f = await mkFan("阿美");
    await wheelSubmit(g.id, f.id, "阿美", "唱一首台語歌");
    const r = await wheelSubmit(g.id, f.id, "阿美", "跟全場合唱");
    await expect(wheelSubmit(g.id, f.id, "阿美", "第三個")).rejects.toThrow(/最多投稿 2 個/);

    // 都還沒審核，轉不動
    await expect(wheelSpin(g.id)).rejects.toThrow(/還沒有通過審核/);

    const [e1, e2] = r!.state.wheel!.entries;
    await wheelReview(g.id, e1.id, true);
    await wheelReview(g.id, e2.id, false);
    const spun = await wheelSpin(g.id);
    // 只會轉到通過審核的那一個
    expect(spun!.state.wheel!.resultId).toBe(e1.id);
  });

  it("轉盤完全免費，沒有付費道具", () => {
    expect(GAME_TYPES.wheel.paid).toBe(false);
    expect(UNITS.wheel ?? []).toHaveLength(0);
  });
});

describe("跨表演者 PK", () => {
  it("對方沒在演出就約不成，也不能跟自己 PK", async () => {
    const a = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
    const idle = await mkPerformer();
    await expect(startGame(a, "pk", { ...base, lanes: [], opponentSlug: idle.slug })).rejects.toThrow(/沒有在演出/);
    await expect(startGame(a, "pk", { ...base, lanes: [], opponentSlug: a.slug })).rejects.toThrow(/不能跟自己/);
  });

  it("兩邊各自被鎖在自己的跑道，不能幫對面加分", async () => {
    const a = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
    const b = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
    const g = await startGame(a, "pk", { ...base, lanes: [], opponentSlug: b.slug });

    // 同一場遊戲，兩邊的頁面拿到的鎖定跑道不一樣
    expect(publicGame(g, null, a.id)!.lockedLane).toBe(0);
    expect(publicGame(g, null, b.id)!.lockedLane).toBe(1);
    // 這一場在雙方的控制台都看得到
    expect((await currentGame(b.id))!.id).toBe(g.id);
  });
});

describe("大螢幕與觀眾看到的是同一份狀態", () => {
  it("分數、隊名、順序三邊一致，只有「我」的部分不同", async () => {
    const { p, g } = await arena("battle", ["紅隊", "藍隊"]);
    const f = await mkFan("阿明");
    await tap(g.id, f.id, 0);
    await applyBoost(g.id, f.id, "阿明", 0, "knight", 50);

    const fresh = await currentGame(p.id);
    const screen = publicGame(fresh, null, p.id); // 大螢幕沒有觀眾身分
    const phone = publicGame(fresh, f.id, p.id);

    expect(screen!.lanes.map((l) => [l.name, l.score])).toEqual(phone!.lanes.map((l) => [l.name, l.score]));
    expect(screen!.winner).toBe(phone!.winner);
    expect(screen!.endsAt).toBe(phone!.endsAt);
    expect(screen!.me).toBeNull();
    expect(phone!.me!.lane).toBe(0);
    expect(phone!.me!.rank).toBe(1);
  });

  it("前三名榜是分跑道算的", async () => {
    const { p, g } = await arena("battle", ["紅隊", "藍隊"]);
    const [a, b] = await Promise.all([mkFan("甲"), mkFan("乙")]);
    await applyBoost(g.id, a.id, "甲", 0, "dragon", 500);
    await applyBoost(g.id, b.id, "乙", 1, "knight", 50);
    const s = publicGame(await currentGame(p.id), null, p.id)!;
    expect(s.lanes[0].top.map((x) => x.name)).toEqual(["甲"]);
    expect(s.lanes[1].top.map((x) => x.name)).toEqual(["乙"]);
  });
});

describe("遊戲的三道門", () => {
  it("方案沒買互動就不開", async () => {
    expect(battleGamesOn("indoor", "free")).toBe(false);
    expect(battleGamesOn("indoor", "base")).toBe(false);
    expect(battleGamesOn("indoor", "play")).toBe(true);
    expect(battleGamesOn("indoor", "all")).toBe(true);
  });

  it("街頭與室外直播不開對戰，只有室內直播開", async () => {
    expect(battleGamesOn("onsite", "all")).toBe(false);
    expect(battleGamesOn("outdoor", "all")).toBe(false);
    expect(battleGamesOn(null, "all")).toBe(false);
  });

  it("方案過期就等於沒買，和路由的判斷順序一致", async () => {
    const p = await goLiveFor(await mkPerformer({ plan: "all", planUntil: yesterday() }), "indoor");
    expect(battleGamesOn(await sessionMode(p.liveSessionId), effectivePlan(p))).toBe(false);
  });
});

describe("授權邊界", () => {
  it("一位表演者的遊戲不會出現在另一位的控制台", async () => {
    const { p, g } = await arena("battle", ["紅", "藍"]);
    const other = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
    expect((await currentGame(p.id))!.id).toBe(g.id);
    expect(await currentGame(other.id)).toBeNull();
  });

  it("沒開演不能開遊戲", async () => {
    const p = await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) });
    await expect(startGame(p, "battle", { ...base, lanes: ["紅", "藍"] })).rejects.toThrow(/開演後/);
  });

  it("隊伍數量不符就開不起來", async () => {
    const p = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
    await expect(startGame(p, "battle", { ...base, lanes: ["只有一隊"] })).rejects.toThrow(/隊伍|選項/);
    await expect(startGame(p, "race", { ...base, lanes: ["A", "B", "C", "D", "E"] })).rejects.toThrow(/隊伍|選項/);
  });

  it("問答沒題目開不起來", async () => {
    const p = await goLiveFor(await mkPerformer({ plan: "all", planUntil: new Date(Date.now() + 86400_000) }), "indoor");
    await expect(startGame(p, "quiz", { ...base, lanes: ["全場"], questions: [] })).rejects.toThrow(/至少要有一題/);
  });
});
