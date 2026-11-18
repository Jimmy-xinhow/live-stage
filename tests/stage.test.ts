import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { createOrder, markOrderPaid, publicState, queueAction, endLive, sessionMode } from "@/lib/orders";
import { hubState } from "@/lib/hub";
import { goLiveFor, mkFan, mkPerformer, pay, reload } from "./helpers";

/** 點一首歌並付款，回傳訂單 */
async function request(p: Awaited<ReturnType<typeof mkPerformer>>, title: string, amount = 100, fanId: string | null = null) {
  const o = await createOrder(p, { amount, nickname: "聽眾", message: "", isAnonymous: false, payMode: "manual" }, fanId);
  const db = await getDb();
  await db.update(orders).set({ kind: "request", itemTitle: title }).where(eq(orders.id, o.id));
  return (await markOrderPaid(o.tradeNo, pay))!;
}

describe("排隊與大螢幕同步", () => {
  it("付款順序就是排隊順序，大螢幕和點歌頁看到的是同一份", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00 }), "onsite");
    await request(p, "第一首");
    await request(p, "第二首");
    await request(p, "第三首");

    const s = await publicState(await reload(p.id));
    expect(s.queue.map((q) => q.title)).toEqual(["第一首", "第二首", "第三首"]);
    expect(s.queue.map((q) => q.seq)).toEqual([1, 2, 3]);
    expect(s.queue.every((q) => q.status === "waiting")).toBe(true);

    // 大螢幕、OBS 疊層、點歌頁都讀同一個 publicState，所以再讀一次必須一致
    const again = await publicState(await reload(p.id));
    expect(again.queue).toEqual(s.queue);
  });

  it("開始唱之後，正在唱的那首在最前面且狀態改變", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00 }), "onsite");
    const first = await request(p, "愛拚才會贏");
    await request(p, "海闊天空");

    await queueAction(await reload(p.id), first.id, "start");
    const s = await publicState(await reload(p.id));
    expect(s.queue[0].title).toBe("愛拚才會贏");
    expect(s.queue[0].status).toBe("playing");
    expect(s.queue[1].status).toBe("waiting");
  });

  it("唱完就離開排隊，但留在留言牆上", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00 }), "onsite");
    const o = await request(p, "唱完的歌");
    await queueAction(await reload(p.id), o.id, "start");
    await queueAction(await reload(p.id), o.id, "done");

    const s = await publicState(await reload(p.id));
    expect(s.queue.map((q) => q.title)).not.toContain("唱完的歌");
    expect(s.wall.map((w) => w.itemTitle)).toContain("唱完的歌");
  });

  it("排隊滿了就不讓再點，訊息講得出上限", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00, maxQueue: 2 }), "onsite");
    const db = await getDb();
    const [item] = await db
      .insert((await import("@/lib/db/schema")).menuItems)
      .values({ performerId: p.id, title: "指定曲", price: 100, enabled: true })
      .returning();
    for (let i = 0; i < 2; i++) {
      const o = await createOrder(await reload(p.id), { menuItemId: item.id, amount: 100, nickname: "a", message: "", isAnonymous: false, payMode: "manual" }, null);
      await markOrderPaid(o.tradeNo, pay);
    }
    await expect(
      createOrder(await reload(p.id), { menuItemId: item.id, amount: 100, nickname: "a", message: "", isAnonymous: false, payMode: "manual" }, null),
    ).rejects.toThrow(/排隊已滿（2 首）/);
  });

  it("金額沒開放顯示時，大螢幕不會漏出數字", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00, showAmounts: false }), "onsite");
    await request(p, "一首歌", 3000);
    const s = await publicState(await reload(p.id));
    expect(s.wall[0].amount).toBeNull();
    expect(s.today.sum).toBeNull();
    expect(s.today.count).toBe(1);

    const open = await mkPerformer({ pointsCents: 5000_00, showAmounts: true });
    const live = await goLiveFor(open, "onsite");
    await request(live, "另一首", 3000);
    const s2 = await publicState(await reload(live.id));
    expect(s2.wall[0].amount).toBe(3000);
  });

  it("匿名的人在大螢幕上不會被認出來", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00 }), "onsite");
    const f = await mkFan("本名");
    const o = await createOrder(p, { amount: 200, nickname: "本名", message: "加油", isAnonymous: true, payMode: "manual" }, f.id);
    await markOrderPaid(o.tradeNo, pay);
    const s = await publicState(await reload(p.id));
    expect(s.wall[0].avatar).toBeNull();
    expect(s.wall[0].name).not.toBe("本名");
  });

  it("結束演出後排隊就清空，不會卡在上一場", async () => {
    const p = await goLiveFor(await mkPerformer({ pointsCents: 5000_00 }), "onsite");
    await request(p, "上一場的歌");
    await endLive(await reload(p.id));
    const after = await reload(p.id);
    expect(after.liveSessionId).toBeNull();
    const s = await publicState(after);
    expect(s.live).toBeNull();
    expect(s.queue).toHaveLength(0);
  });

  it("演出模式讀得出來，決定互動開到哪一層", async () => {
    const street = await goLiveFor(await mkPerformer(), "onsite");
    const studio = await goLiveFor(await mkPerformer(), "indoor");
    expect(await sessionMode(street.liveSessionId)).toBe("onsite");
    expect(await sessionMode(studio.liveSessionId)).toBe("indoor");
    expect(await sessionMode(null)).toBeNull();
  });
});

describe("現場互動狀態", () => {
  it("應援能量最多 100，簽到與舉手的數字對得上", async () => {
    const p = await goLiveFor(await mkPerformer(), "onsite");
    const hub = await import("@/lib/hub");
    const f = await mkFan("阿明");

    await hub.checkIn(await reload(p.id), f.id);
    await hub.raiseHand(await reload(p.id), f.id, "sing", "想合唱");
    for (let i = 0; i < 150; i++) await hub.cheer(await reload(p.id), 1);

    const mine = await hubState(await reload(p.id), f.id);
    expect(mine.hype).toBe(100);
    // 參數漏掉也不該讓整個請求 500
    expect(await hub.cheer(await reload(p.id))).toBe(100);
    expect(mine.present).toBe(1);
    expect(mine.checked).toBe(true);
    expect(mine.hand!.kind).toBe("sing");
    expect(mine.handsWaiting).toBe(1);

    // 大螢幕沒有觀眾身分，但看到的場況數字要一樣
    const screen = await hubState(await reload(p.id), null);
    expect(screen.hype).toBe(mine.hype);
    expect(screen.present).toBe(mine.present);
    expect(screen.handsWaiting).toBe(mine.handsWaiting);
    expect(screen.checked).toBe(false);
    expect(screen.hand).toBeNull();
  });

  it("同一場只能簽到一次", async () => {
    const p = await goLiveFor(await mkPerformer(), "onsite");
    const hub = await import("@/lib/hub");
    const f = await mkFan();
    await hub.checkIn(await reload(p.id), f.id);
    await hub.checkIn(await reload(p.id), f.id).catch(() => null);
    expect((await hubState(await reload(p.id), f.id)).present).toBe(1);
  });

  it("許願每人每週 3 個，重複的願望會併成同一個加票", async () => {
    const p = await mkPerformer();
    const hub = await import("@/lib/hub");
    const f = await mkFan("許願的人");
    await hub.addWish(p, f.id, "晚安");
    await hub.addWish(p, f.id, "晚安"); // 同一首：併進去，不是新增
    const list = (await hubState(p, f.id)).wishes;
    expect(list).toHaveLength(1);
    expect(list[0].votes).toBe(1);
  });

  it("沒開演不能舉手", async () => {
    const p = await mkPerformer();
    const hub = await import("@/lib/hub");
    const f = await mkFan();
    await expect(hub.raiseHand(p, f.id, "sing", "")).rejects.toThrow(/演出結束|開演/);
  });
});
