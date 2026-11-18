import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, pointLedger, performers } from "@/lib/db/schema";
import { createOrder, markOrderPaid, refundOrder } from "@/lib/orders";
import { changePlan, runPlanRenewals } from "@/lib/subscription";
import { applyPoints, canAcceptOrders } from "@/lib/billing";
import { PLANS, planBySlug } from "@/lib/plans";
import { goLiveFor, mkFan, mkPerformer, pay, reload, yesterday } from "./helpers";

const price = (slug: string) => planBySlug(slug).price * 100;

/** 下一筆手動付款的單並確認收到，回傳訂單 */
async function paidOrder(p: Awaited<ReturnType<typeof mkPerformer>>, amount: number, fanId: string | null = null) {
  const o = await createOrder(p, { amount, nickname: "小明", message: "", isAnonymous: false, payMode: "manual" }, fanId);
  const r = await markOrderPaid(o.tradeNo, pay);
  expect(r, "訂單應該要能標成已付款").not.toBeNull();
  return r!;
}

describe("點數扣除", () => {
  it("服務費依方案扣，免費 3%、付費 1%", async () => {
    const free = await mkPerformer();
    const r1 = await paidOrder(free, 1000);
    expect(r1.feeCents).toBe(3000);
    expect((await reload(free.id)).pointsCents).toBe(200_00 - 3000);

    const paid = await mkPerformer({ plan: "base", planUntil: new Date(Date.now() + 86400_000) });
    const r2 = await paidOrder(paid, 1000);
    expect(r2.feeCents).toBe(1000);
  });

  it("過期的付費方案照免費費率收，不會讓人用過期方案享優惠", async () => {
    const p = await mkPerformer({ plan: "all", planUntil: yesterday() });
    const r = await paidOrder(p, 1000);
    expect(r.feeCents).toBe(3000);
  });

  it("退款退回當初扣的服務費，不受之後換方案影響", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    const r = await paidOrder(p, 1000);
    const before = (await reload(p.id)).pointsCents;

    // 退款前升級到 1% 的方案，退回的仍然要是當初扣的 3%
    await changePlan(p.id, "base");
    const res = await refundOrder({ orderId: r.id, by: "performer", performerId: p.id });
    expect(res?.order.status).toBe("refunded");

    const after = (await reload(p.id)).pointsCents;
    expect(after - (before - price("base"))).toBe(3000);
  });

  it("退款會把排隊中的單踢出排隊", async () => {
    const p0 = await mkPerformer();
    const p = await goLiveFor(p0);
    const db = await getDb();
    const o = await createOrder(p, { amount: 300, nickname: "a", message: "", isAnonymous: false, payMode: "manual" }, null);
    await db.update(orders).set({ kind: "request", itemTitle: "測試歌" }).where(eq(orders.id, o.id));
    const r = await markOrderPaid(o.tradeNo, pay);
    expect(r!.queueStatus).toBe("waiting");
    await refundOrder({ orderId: r!.id, by: "performer", performerId: p.id });
    const [after] = await db.select().from(orders).where(eq(orders.id, o.id));
    expect(after.queueStatus).toBe("skipped");
  });

  it("透支到上限就不能再接單", async () => {
    const p = await mkPerformer({ pointsCents: 50 });
    expect(canAcceptOrders(p.pointsCents)).toBe(true);
    const db = await getDb();
    await applyPoints(db, p.id, -200_00, "adjust", { note: "測試" });
    const broke = await reload(p.id);
    expect(canAcceptOrders(broke.pointsCents)).toBe(false);
    await expect(
      createOrder(broke, { amount: 100, nickname: "a", message: "", isAnonymous: false, payMode: "manual" }, null),
    ).rejects.toThrow(/暫停接單/);
  });

  it("每一筆扣點都留下帳本，餘額對得起來", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    await paidOrder(p, 500);
    await paidOrder(p, 1000);
    await changePlan(p.id, "base");
    const db = await getDb();
    const rows = await db.select().from(pointLedger).where(eq(pointLedger.performerId, p.id));
    const sum = rows.reduce((n, r) => n + r.deltaCents, 0);
    expect((await reload(p.id)).pointsCents).toBe(1000_00 + sum);
    // 每一列都要記下當下餘額，對帳才查得出是哪一筆出錯
    expect(rows.every((r) => typeof r.balanceAfterCents === "number")).toBe(true);
  });

  it("同一位粉絲在同一場有花費上限", async () => {
    const p = await goLiveFor(await mkPerformer({ fanCapCents: 100_000 }));
    const f = await mkFan("衝動的粉絲");
    await paidOrder(p, 900, f.id);
    await expect(
      createOrder(p, { amount: 200, nickname: "a", message: "", isAnonymous: false, payMode: "manual" }, f.id),
    ).rejects.toThrow(/上限|還可以再/);
  });
});

describe("方案帳務", () => {
  it("升級當下扣一個月", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    const r = await changePlan(p.id, "play");
    expect(r.ok && r.chargedCents).toBe(price("play"));
    expect((await reload(p.id)).plan).toBe("play");
  });

  it("月費不讓透支，點數不夠就擋下來且什麼都不改", async () => {
    const p = await mkPerformer({ pointsCents: 100_00 });
    const r = await changePlan(p.id, "all");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe("insufficient");
      expect(r.needCents).toBe(price("all") - 100_00);
    }
    const after = await reload(p.id);
    expect(after.plan).toBe("free");
    expect(after.pointsCents).toBe(100_00);
  });

  it("取消是停止續期，當期用到底", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    await changePlan(p.id, "base");
    const r = await changePlan(p.id, "free");
    expect(r.ok).toBe(true);
    const after = await reload(p.id);
    expect(after.plan).toBe("base");
    expect(after.planAutoRenew).toBe(false);
    expect(after.planUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("當期內重新訂閱同方案不會再收一次錢", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    await changePlan(p.id, "all");
    const paidOnce = (await reload(p.id)).pointsCents;
    await changePlan(p.id, "free");
    const again = await changePlan(p.id, "all");
    expect(again.ok && again.chargedCents).toBe(0);
    expect((await reload(p.id)).pointsCents).toBe(paidOnce);
    expect((await reload(p.id)).planAutoRenew).toBe(true);
  });

  it("降級把沒用完的折抵回來，不會吞掉差額", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    await changePlan(p.id, "all");
    const down = await changePlan(p.id, "play");
    expect(down.ok && down.chargedCents).toBeLessThan(0);
    const down2 = await changePlan(p.id, "base");
    expect(down2.ok && down2.chargedCents).toBeLessThan(0);
    // 同一天內一路降下來，淨支出要等於最後那個方案的月費
    const spent = 5000_00 - (await reload(p.id)).pointsCents;
    expect(spent).toBe(price("base"));
  });

  it("到期自動續期，排程重跑不會重複扣款", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00, plan: "base", planUntil: yesterday() });
    const a = await runPlanRenewals();
    expect(a.renewed).toBeGreaterThanOrEqual(1);
    const afterOnce = (await reload(p.id)).pointsCents;
    const b = await runPlanRenewals();
    expect(b.renewed).toBe(0);
    expect((await reload(p.id)).pointsCents).toBe(afterOnce);
    expect((await reload(p.id)).planUntil!.getTime()).toBeGreaterThan(Date.now());
  });

  it("點數不足就降回免費，不會產生欠款", async () => {
    const p = await mkPerformer({ pointsCents: 10_00, plan: "all", planUntil: yesterday() });
    await runPlanRenewals();
    const after = await reload(p.id);
    expect(after.plan).toBe("free");
    expect(after.planUntil).toBeNull();
    expect(after.pointsCents).toBe(10_00);
  });

  it("取消續期的人到期就降回免費", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00, plan: "play", planUntil: yesterday(), planAutoRenew: false });
    await runPlanRenewals();
    expect((await reload(p.id)).plan).toBe("free");
    expect((await reload(p.id)).pointsCents).toBe(5000_00);
  });

  it("降回免費不刪資料", async () => {
    const p = await mkPerformer({ pointsCents: 10_00, plan: "all", planUntil: yesterday(), hideBranding: true, streamDelaySec: 6 });
    await paidOrder(p, 500);
    await runPlanRenewals();
    const db = await getDb();
    const kept = await db.select().from(orders).where(eq(orders.performerId, p.id));
    expect(kept.length).toBe(1);
    const after = await reload(p.id);
    expect(after.hideBranding).toBe(true);
    expect(after.streamDelaySec).toBe(6);
  });

  it("四個方案都還在，而且只有免費那層是 3%", async () => {
    const db = await getDb();
    expect(PLANS.length).toBe(4);
    expect(PLANS.filter((x) => x.feeRate === 0.03).length).toBe(1);
    // 方案欄位真的存得進資料庫（欄位長度不夠的話這裡會爆）
    for (const pl of PLANS) {
      const p = await mkPerformer({ plan: pl.slug, planUntil: pl.slug === "free" ? null : new Date(Date.now() + 86400_000) });
      const [row] = await db.select().from(performers).where(eq(performers.id, p.id));
      expect(row.plan).toBe(pl.slug);
    }
  });
});
