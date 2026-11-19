import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orderSplits } from "@/lib/db/schema";
import { bandsOf, joinBand, listMembers, memberMonth, monthlySplit, saveMembers, splitAmount } from "@/lib/band";
import { createOrder, markOrderPaid, refundOrder } from "@/lib/orders";
import { mkPerformer, pay, reload } from "./helpers";

const pro = () => mkPerformer({ pointsCents: 5000_00, plan: "all", planUntil: new Date(Date.now() + 86400_000) });
const even3 = [
  { name: "小宇", sharePermille: 334 },
  { name: "阿凱", sharePermille: 333 },
  { name: "Ray", sharePermille: 333 },
];

async function order(p: Awaited<ReturnType<typeof mkPerformer>>, amount: number) {
  const o = await createOrder(p, { amount, nickname: "聽眾", message: "", isAnonymous: false, payMode: "manual" }, null);
  return (await markOrderPaid(o.tradeNo, pay))!;
}

const ym = () => {
  const d = new Date(Date.now() + 8 * 3600_000);
  return [d.getUTCFullYear(), d.getUTCMonth() + 1] as const;
};

describe("拆帳計算", () => {
  it("三人均分加起來正好是原金額，餘數給第一位", () => {
    expect(splitAmount(1000, [334, 333, 333])).toEqual([334, 333, 333]);
    expect(splitAmount(100, [334, 333, 333])).toEqual([34, 33, 33]);
    expect(splitAmount(7, [334, 333, 333])).toEqual([3, 2, 2]);
    for (const amt of [1, 7, 99, 333, 1234, 99999]) {
      const parts = splitAmount(amt, [334, 333, 333]);
      expect(parts.reduce((a, b) => a + b, 0), `${amt} 元要拆得剛好`).toBe(amt);
    }
  });

  it("兩人五五分、四人均分也都不會短少", () => {
    expect(splitAmount(999, [500, 500]).reduce((a, b) => a + b, 0)).toBe(999);
    expect(splitAmount(1000, [250, 250, 250, 250])).toEqual([250, 250, 250, 250]);
  });
});

describe("團員名單", () => {
  it("比例加起來不是 100% 就存不進去", async () => {
    const p = await pro();
    const bad = await saveMembers(p.id, [{ name: "甲", sharePermille: 500 }, { name: "乙", sharePermille: 400 }]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error).toContain("90.0%");
    expect(await listMembers(p.id)).toHaveLength(0);
  });

  it("改名字不會換掉邀請碼，團員不用重新加入", async () => {
    const p = await pro();
    await saveMembers(p.id, even3);
    const before = await listMembers(p.id);
    const codes = before.map((m) => m.inviteCode);

    await saveMembers(p.id, before.map((m) => ({ id: m.id, name: m.name === "Ray" ? "Ray（鼓手）" : m.name, sharePermille: m.sharePermille })));
    const after = await listMembers(p.id);
    expect(after.map((m) => m.inviteCode)).toEqual(codes);
    expect(after.find((m) => m.name === "Ray（鼓手）")).toBeTruthy();
  });

  it("最多 12 位", async () => {
    const p = await pro();
    const many = Array.from({ length: 13 }, (_, i) => ({ name: `團員${i}`, sharePermille: i === 0 ? 1000 - 12 * 82 : 82 }));
    const r = await saveMembers(p.id, many);
    expect(r.ok).toBe(false);
  });
});

describe("成交當下的快照", () => {
  it("之後改比例不會動到已經發生的帳", async () => {
    const p = await pro();
    await saveMembers(p.id, even3);
    const o = await order(p, 1000);

    const db = await getDb();
    const snap = await db.select().from(orderSplits).where(eq(orderSplits.orderId, o.id));
    expect(snap.map((s) => s.amount).sort((a, b) => b - a)).toEqual([334, 333, 333]);

    // 團長把自己調高
    await saveMembers(p.id, [
      { name: "小宇", sharePermille: 800 },
      { name: "阿凱", sharePermille: 100 },
      { name: "Ray", sharePermille: 100 },
    ]);
    const again = await db.select().from(orderSplits).where(eq(orderSplits.orderId, o.id));
    expect(again.map((s) => s.amount).sort((a, b) => b - a)).toEqual([334, 333, 333]);
  });

  it("只有買了「全部」方案才留拆帳紀錄", async () => {
    const p = await mkPerformer({ plan: "play", planUntil: new Date(Date.now() + 86400_000), pointsCents: 5000_00 });
    await saveMembers(p.id, even3);
    const o = await order(await reload(p.id), 1000);
    const db = await getDb();
    expect(await db.select().from(orderSplits).where(eq(orderSplits.orderId, o.id))).toHaveLength(0);
  });

  it("一個人演出不會留下空紀錄", async () => {
    const p = await pro();
    await saveMembers(p.id, [{ name: "我自己", sharePermille: 1000 }]);
    const o = await order(p, 500);
    const db = await getDb();
    expect(await db.select().from(orderSplits).where(eq(orderSplits.orderId, o.id))).toHaveLength(0);
  });

  it("退款的訂單不算進當月拆帳", async () => {
    const p = await pro();
    await saveMembers(p.id, even3);
    const keep = await order(p, 1000);
    const gone = await order(p, 3000);
    const [y, m] = ym();

    expect((await monthlySplit(p.id, y, m)).reduce((n, r) => n + r.total, 0)).toBe(4000);
    await refundOrder({ orderId: gone.id, by: "performer", performerId: p.id });
    const after = await monthlySplit(p.id, y, m);
    expect(after.reduce((n, r) => n + r.total, 0)).toBe(1000);
    expect(keep.status).toBe("paid");
  });
});

describe("團員帳號", () => {
  it("用邀請碼認領，別人不能再用同一組", async () => {
    const p = await pro();
    await saveMembers(p.id, even3);
    const kai = (await listMembers(p.id)).find((m) => m.name === "阿凱")!;

    const first = await joinBand(kai.inviteCode);
    expect(first.ok).toBe(true);

    const stolen = await joinBand(kai.inviteCode);
    expect(stolen.ok).toBe(false);
    if (!stolen.ok) expect(stolen.error).toContain("已經被別人用了");

    // 同一個人重複點連結沒問題
    expect((await joinBand(kai.inviteCode.toLowerCase(), [kai.id])).ok).toBe(true);
  });

  it("亂填邀請碼進不來", async () => {
    expect((await joinBand("ZZZZZZZZ")).ok).toBe(false);
  });

  it("團員只看得到自己那一份，看不到其他團員", async () => {
    const p = await pro();
    await saveMembers(p.id, even3);
    const ms = await listMembers(p.id);
    const kai = ms.find((m) => m.name === "阿凱")!;
    await joinBand(kai.inviteCode);
    await order(p, 1000);
    const [y, m] = ym();

    const mine = await memberMonth(kai.id, y, m);
    expect(mine).toHaveLength(1);
    expect(mine[0].amount).toBe(333);

    // 自己的頁面只拿得到自己的團員身分
    const bands = await bandsOf([kai.id]);
    expect(bands).toHaveLength(1);
    expect(bands[0].memberId).toBe(kai.id);
    expect(bands[0].memberName).toBe("阿凱");
  });

  it("沒認領過的裝置查不到任何團", async () => {
    const p = await pro();
    await saveMembers(p.id, even3);
    expect(await bandsOf([])).toHaveLength(0);
  });

  it("別的團的團員查不到這個團的帳", async () => {
    const a = await pro();
    const b = await pro();
    await saveMembers(a.id, even3);
    await saveMembers(b.id, [{ name: "外人", sharePermille: 1000 }, { name: "外人2", sharePermille: 0 }]);
    const outsider = (await listMembers(b.id))[0];
    await joinBand(outsider.inviteCode);
    await order(a, 1000);
    const [y, m] = ym();

    expect(await memberMonth(outsider.id, y, m)).toHaveLength(0);
    expect((await bandsOf([outsider.id])).every((x) => x.performerId === b.id)).toBe(true);
  });
});
