import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createShow, messageFans, FanError } from "@/lib/fans";
import { goLive } from "@/lib/orders";
import { mkFan, mkPerformer, follow, reload } from "./helpers";

/**
 * 沒有設 LINE 權杖時，lib/line 的 call() 會走 mock 分支印出 console.info。
 * 這裡攔下它就能驗「誰會收到、內容寫了什麼」，不必真的打 LINE。
 */
function captureLine() {
  const sent: { path: string; body: { to?: string | string[]; messages: { text?: string }[] } }[] = [];
  const spy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    const head = String(args[0] ?? "");
    if (!head.startsWith("[LINE mock]")) return;
    sent.push({ path: head.replace("[LINE mock] ", ""), body: JSON.parse(String(args[1])) });
  });
  return {
    sent,
    restore: () => spy.mockRestore(),
    /** 這一輪總共推給幾個 LINE 帳號（multicast 算人頭） */
    recipients: () => sent.flatMap((s) => (Array.isArray(s.body.to) ? s.body.to : s.body.to ? [s.body.to] : [])),
  };
}

let line: ReturnType<typeof captureLine>;
beforeEach(() => { line = captureLine(); });
afterEach(() => line.restore());

const COST = 20; // LIVE_NOTIFY_POINTS 預設 0.2 點 = 20 分

describe("開演與預告通知", () => {
  it("只推給開著通知的粉絲，並按人頭扣點", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const [a, b, c] = await Promise.all([mkFan("甲"), mkFan("乙"), mkFan("丙")]);
    await follow(p.id, a.id, true);
    await follow(p.id, b.id, true);
    await follow(p.id, c.id, false); // 關掉通知的不該收到

    const r = await createShow(p, { startsAt: new Date(Date.now() + 86400_000), location: "駁二", note: "" }, true);
    expect(r.notified).toBe(2);
    expect(line.recipients()).toHaveLength(2);
    expect(line.recipients()).not.toContain(c.lineUserId);
    expect((await reload(p.id)).pointsCents).toBe(1000_00 - 2 * COST);
  });

  it("不勾通知就不推也不扣點", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan();
    await follow(p.id, a.id, true);
    const r = await createShow(p, { startsAt: new Date(Date.now() + 86400_000), location: "鹽埕", note: "" }, false);
    expect(r.notified).toBe(0);
    expect(line.sent).toHaveLength(0);
    expect((await reload(p.id)).pointsCents).toBe(1000_00);
  });

  it("沒有粉絲時不扣點", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const r = await createShow(p, { startsAt: new Date(Date.now() + 86400_000), location: "市集", note: "" }, true);
    expect(r.notified).toBe(0);
    expect((await reload(p.id)).pointsCents).toBe(1000_00);
  });

  it("預告訊息帶得出時間、地點與點歌頁網址", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan();
    await follow(p.id, a.id, true);
    await createShow(p, { startsAt: new Date(Date.now() + 86400_000), location: "駁二大義倉庫", note: "帶你的朋友來" }, true);
    const text = line.sent[0].body.messages[0].text ?? "";
    expect(text).toContain("駁二大義倉庫");
    expect(text).toContain("帶你的朋友來");
    expect(text).toContain(`/p/${p.slug}`);
  });

  it("開演通知推給粉絲", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan();
    await follow(p.id, a.id, true);
    await goLive(p, "西子灣", true, "onsite");
    expect(line.recipients()).toContain(a.lineUserId);
  });
});

describe("粉絲群發", () => {
  it("一天最多 3 次", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan();
    await follow(p.id, a.id, true);
    for (let i = 0; i < 3; i++) expect((await messageFans(p, { segment: "all" }, `第 ${i + 1} 則`)).sent).toBe(1);
    await expect(messageFans(p, { segment: "all" }, "第四則")).rejects.toThrow(/已群發 3 次/);
  });

  it("一對一感謝不受每日 3 次限制", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan("老主顧");
    await follow(p.id, a.id, true);
    for (let i = 0; i < 3; i++) await messageFans(p, { segment: "all" }, `群發 ${i}`);
    const r = await messageFans(p, { fanId: a.id }, "謝謝你今晚來");
    expect(r.sent).toBe(1);
  });

  it("全部粉絲都關掉通知就送不出去，也不扣點", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan();
    await follow(p.id, a.id, false);
    await expect(messageFans(p, { segment: "all" }, "在嗎")).rejects.toBeInstanceOf(FanError);
    expect((await reload(p.id)).pointsCents).toBe(1000_00);
  });

  it("沒有粉絲時說清楚，不是默默成功", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    await expect(messageFans(p, { segment: "all" }, "哈囉")).rejects.toThrow(/沒有符合的粉絲/);
  });

  it("群發按人頭扣點，訊息帶表演者名字與頁面連結", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00, displayName: "測試樂團" });
    const [a, b] = await Promise.all([mkFan("甲"), mkFan("乙")]);
    await follow(p.id, a.id, true);
    await follow(p.id, b.id, true);
    const r = await messageFans(p, { segment: "all" }, "這週五有演出");
    expect(r.sent).toBe(2);
    expect((await reload(p.id)).pointsCents).toBe(1000_00 - 2 * COST);
    const text = line.sent[0].body.messages[0].text ?? "";
    expect(text).toContain("測試樂團");
    expect(text).toContain("這週五有演出");
    expect(text).toContain(`/p/${p.slug}`);
  });

  it("一位粉絲用 push、多位用 multicast", async () => {
    const p = await mkPerformer({ pointsCents: 1000_00 });
    const a = await mkFan();
    await follow(p.id, a.id, true);
    await messageFans(p, { segment: "all" }, "一個人");
    expect(line.sent[0].path).toBe("push");

    const b = await mkFan();
    await follow(p.id, b.id, true);
    await messageFans(p, { segment: "all" }, "兩個人");
    expect(line.sent[1].path).toBe("multicast");
  });

  it("別人的粉絲不會收到這位表演者的訊息", async () => {
    const mine = await mkPerformer({ pointsCents: 1000_00 });
    const other = await mkPerformer({ pointsCents: 1000_00 });
    const theirFan = await mkFan("別人的粉絲");
    await follow(other.id, theirFan.id, true);
    const myFan = await mkFan("我的粉絲");
    await follow(mine.id, myFan.id, true);

    await messageFans(mine, { segment: "all" }, "只給我的粉絲");
    expect(line.recipients()).toEqual([myFan.lineUserId]);
  });
});
