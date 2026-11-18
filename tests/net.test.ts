import { afterEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { createOrder } from "@/lib/orders";
import { NetError, newKey, postJson, request } from "@/lib/net";
import { mkPerformer } from "./helpers";

afterEach(() => vi.unstubAllGlobals());

/** 依序回傳預先排好的結果；fn 可以是 Response 或要丟出的錯誤 */
function fakeFetch(steps: (Response | Error)[]) {
  const calls: string[] = [];
  const fn = vi.fn(async (url: string) => {
    calls.push(String(url));
    const next = steps.shift();
    if (!next) throw new Error("多打了一次");
    if (next instanceof Error) throw next;
    return next;
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

const ok = (body: unknown = { ok: true }) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const boom = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("弱網重試", () => {
  it("斷線後自己接回來，呼叫端不用知道中間斷過", async () => {
    const { fn } = fakeFetch([new TypeError("Failed to fetch"), new TypeError("Failed to fetch"), ok({ got: 1 })]);
    const res = await request("/api/x", {}, { retries: 3 });
    expect(await res.json()).toEqual({ got: 1 });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("重試用光還是失敗就說人話，不是丟 TypeError", async () => {
    fakeFetch([new TypeError("Failed to fetch"), new TypeError("Failed to fetch")]);
    await expect(request("/api/x", {}, { retries: 1 })).rejects.toBeInstanceOf(NetError);
  });

  it("5xx 和 429 會重試，4xx 不會——那是請求本身的問題", async () => {
    const a = fakeFetch([boom(503), ok()]);
    await request("/api/x", {}, { retries: 2 });
    expect(a.fn).toHaveBeenCalledTimes(2);

    const b = fakeFetch([boom(429), ok()]);
    await request("/api/x", {}, { retries: 2 });
    expect(b.fn).toHaveBeenCalledTimes(2);

    const c = fakeFetch([boom(409, { error: "排隊已滿" })]);
    const res = await request("/api/x", {}, { retries: 3 });
    expect(res.status).toBe(409);
    expect(c.fn).toHaveBeenCalledTimes(1);
  });

  it("沒有冪等鍵的 POST 不會自己重試，寧可失敗也不要重複送出", async () => {
    const { fn } = fakeFetch([new TypeError("Failed to fetch")]);
    await expect(request("/api/x", { method: "POST" })).rejects.toBeInstanceOf(NetError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("帶了冪等鍵的 POST 才會重試", async () => {
    const { fn } = fakeFetch([new TypeError("Failed to fetch"), ok()]);
    await request("/api/x", { method: "POST" }, { idempotent: true, retries: 2 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("重試時會回報次數，介面才講得出「正在重送」", async () => {
    fakeFetch([boom(500), boom(500), ok()]);
    const seen: number[] = [];
    await request("/api/x", {}, { retries: 3, onRetry: (n) => seen.push(n) });
    expect(seen).toEqual([1, 2]);
  });

  it("逾時會中止，不會卡在那裡轉圈", async () => {
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) =>
      new Promise((_res, rej) => init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")))),
    );
    await expect(request("/api/x", {}, { retries: 0, timeout: 50 })).rejects.toMatchObject({ kind: "timeout" });
  });

  it("postJson 把伺服器的錯誤訊息原樣丟出來", async () => {
    fakeFetch([boom(409, { error: "「海闊天空」最低 NT$150" })]);
    await expect(postJson("/api/orders", {}, { idempotent: true })).rejects.toThrow("「海闊天空」最低 NT$150");
  });

  it("每把鑰匙都不一樣", () => {
    const keys = new Set(Array.from({ length: 200 }, newKey));
    expect(keys.size).toBe(200);
    expect(newKey()).toMatch(/^[0-9a-f-]{20,}$/i);
  });
});

describe("重送不會變成兩筆訂單", () => {
  const body = (clientKey: string) => ({
    amount: 300, nickname: "阿明", message: "", isAnonymous: false, payMode: "manual" as const, clientKey,
  });

  it("同一把鑰匙拿回同一筆", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    const key = newKey();
    const first = await createOrder(p, body(key), null);
    const second = await createOrder(p, body(key), null);
    expect(second.id).toBe(first.id);
    expect(second.tradeNo).toBe(first.tradeNo);

    const db = await getDb();
    expect(await db.select().from(orders).where(eq(orders.performerId, p.id))).toHaveLength(1);
  });

  it("兩把鑰匙就是兩筆——真的點兩首歌的人不會被擋", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    await createOrder(p, body(newKey()), null);
    await createOrder(p, body(newKey()), null);
    const db = await getDb();
    expect(await db.select().from(orders).where(eq(orders.performerId, p.id))).toHaveLength(2);
  });

  it("同時送達兩次也只會有一筆", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    const key = newKey();
    const [a, b] = await Promise.all([createOrder(p, body(key), null), createOrder(p, body(key), null)]);
    expect(a.id).toBe(b.id);
    const db = await getDb();
    expect(await db.select().from(orders).where(eq(orders.performerId, p.id))).toHaveLength(1);
  });

  it("重送時就算排隊已經滿了，也要拿回原本那筆而不是報錯", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00, maxQueue: 1 });
    const key = newKey();
    const first = await createOrder(p, body(key), null);
    // 把這位表演者改成不收單，模擬重送時狀況已經變了
    const db = await getDb();
    await db.update((await import("@/lib/db/schema")).performers).set({ queueOpen: false }).where(eq((await import("@/lib/db/schema")).performers.id, p.id));
    const again = await createOrder(p, body(key), null);
    expect(again.id).toBe(first.id);
  });

  it("沒帶鑰匙的舊客戶端照樣能用", async () => {
    const p = await mkPerformer({ pointsCents: 5000_00 });
    const o1 = await createOrder(p, { amount: 100, nickname: "", message: "", isAnonymous: false, payMode: "manual" }, null);
    const o2 = await createOrder(p, { amount: 100, nickname: "", message: "", isAnonymous: false, payMode: "manual" }, null);
    expect(o1.id).not.toBe(o2.id);
  });
});
