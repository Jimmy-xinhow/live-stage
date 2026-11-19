import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * cookies() 只能在請求情境裡用。測試要驗的是帳號邏輯，不是 Next 的機制，
 * 所以用一個記憶體版本頂替——順便讓「登入後 session 真的被簽出來」也驗得到。
 */
vi.mock("next/headers", () => {
  const jar = new Map<string, string>();
  return {
    cookies: async () => ({
      get: (k: string) => (jar.has(k) ? { name: k, value: jar.get(k)! } : undefined),
      set: (k: string, v: string) => void jar.set(k, v),
      delete: (k: string) => void jar.delete(k),
    }),
  };
});
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { authTokens, performers } from "@/lib/db/schema";
import { AuthError, normalizeEmail, requestReset, resetPassword, signIn, signUp, verifyEmail, changePassword } from "@/lib/auth";
import { checkPassword, hashPassword, verifyPassword } from "@/lib/password";

/** 沒設寄信金鑰時 lib/mail 會印出來，攔下來就能驗信件內容與連結 */
function captureMail() {
  const sent: { to: string; subject: string; body: string }[] = [];
  const spy = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    const head = String(args[0] ?? "");
    if (!head.startsWith("[MAIL mock]")) return;
    const [, to, subject] = head.match(/\[MAIL mock\] (\S+) \/ (.*)$/) ?? [];
    sent.push({ to, subject, body: JSON.parse(String(args[1])) });
  });
  return { sent, restore: () => spy.mockRestore(), link: () => /https?:\/\/\S+/.exec(sent.at(-1)?.body ?? "")?.[0] ?? "" };
}

let mail: ReturnType<typeof captureMail>;
beforeEach(() => { mail = captureMail(); });
afterEach(() => mail.restore());

let n = 0;
const email = () => `t${Date.now().toString(36)}${n++}@example.com`;
const PW = "a-long-enough-pass";

const token = (url: string) => new URL(url).searchParams.get("t") ?? "";

describe("密碼規則", () => {
  it("長度才是門檻，不逼使用者加符號", () => {
    expect(checkPassword("short")).toContain("至少");
    expect(checkPassword("aaaaaaaaaaaa")).toContain("同一個字");
    expect(checkPassword("mypassword123")).toContain("字典");
    expect(checkPassword("這是一句我記得住的話")).toBeNull();
    expect(checkPassword("correct horse battery")).toBeNull();
  });

  it("雜湊每次都不一樣，但驗得回來", async () => {
    const a = await hashPassword(PW);
    const b = await hashPassword(PW);
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(PW, a)).toBe(true);
    expect(await verifyPassword(PW + "x", a)).toBe(false);
    expect(await verifyPassword(PW, null)).toBe(false);
    // 明碼不會出現在雜湊裡
    expect(a).not.toContain(PW);
  });
});

describe("註冊", () => {
  it("建立帳號、送新手點數、寄驗證信", async () => {
    const e = email();
    const p = await signUp({ email: e, password: PW, displayName: "測試樂團" });
    expect(p.email).toBe(e);
    expect(p.displayName).toBe("測試樂團");
    const db = await getDb();
    const [fresh] = await db.select().from(performers).where(eq(performers.id, p.id));
    expect(fresh.pointsCents).toBeGreaterThan(0);
    expect(p.passwordHash).not.toBe(PW);

    const m = mail.sent.at(-1)!;
    expect(m.to).toBe(e);
    expect(mail.link()).toContain("/auth/verify?t=");
  });

  it("同一個信箱不能註冊兩次，大小寫也算同一個", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    await expect(signUp({ email: e.toUpperCase(), password: PW, displayName: "乙" })).rejects.toThrow(/已經註冊過/);
  });

  it("密碼太短就擋下來，而且不會留下半個帳號", async () => {
    const e = email();
    await expect(signUp({ email: e, password: "123", displayName: "甲" })).rejects.toBeInstanceOf(AuthError);
    const db = await getDb();
    expect(await db.select().from(performers).where(eq(performers.email, e))).toHaveLength(0);
  });

  it("信箱格式不對就擋下來", async () => {
    await expect(signUp({ email: "not-an-email", password: PW, displayName: "甲" })).rejects.toThrow(/信箱/);
  });

  it("信箱一律存小寫去空白", () => {
    expect(normalizeEmail("  Me@Example.COM ")).toBe("me@example.com");
  });
});

describe("登入", () => {
  it("密碼對就進得去，大小寫不同的信箱也認得", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    const p = await signIn(e.toUpperCase(), PW);
    expect(p.email).toBe(e);
  });

  it("帳號不存在和密碼錯誤回同一句話", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    const a = await signIn(e, "wrong-secret-here-x").then(() => null, (x: Error) => x);
    const b = await signIn(email(), PW).then(() => null, (x: Error) => x);
    expect(a?.message).toBe(b?.message);
    expect(a?.message).toBe("信箱或密碼不對");
  });

  it("停用的帳號登不進來", async () => {
    const e = email();
    const p = await signUp({ email: e, password: PW, displayName: "甲" });
    const db = await getDb();
    await db.update(performers).set({ status: "suspended" }).where(eq(performers.id, p.id));
    await expect(signIn(e, PW)).rejects.toThrow(/停用/);
  });
});

describe("信箱驗證", () => {
  it("點了連結就算驗過，同一條連結不能用第二次", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    const t = token(mail.link());
    const p = await verifyEmail(t);
    expect(p?.emailVerifiedAt).toBeTruthy();
    expect(await verifyEmail(t)).toBeNull();
  });

  it("亂填的權杖沒有用", async () => {
    expect(await verifyEmail("not-a-real-token")).toBeNull();
  });
});

describe("忘記密碼", () => {
  it("收信、重設、用新密碼登入，舊密碼失效", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    await requestReset(e);
    const link = mail.link();
    expect(link).toContain("/auth/reset?t=");

    const next = "another-long-secret";
    await resetPassword(token(link), next);
    expect((await signIn(e, next)).email).toBe(e);
    await expect(signIn(e, PW)).rejects.toThrow();
  });

  it("重設連結只能用一次", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    await requestReset(e);
    const t = token(mail.link());
    await resetPassword(t, "first-new-secret-x");
    await expect(resetPassword(t, "second-new-secret-x")).rejects.toThrow(/失效/);
  });

  it("過期的連結不能用", async () => {
    const e = email();
    const p = await signUp({ email: e, password: PW, displayName: "甲" });
    await requestReset(e);
    const t = token(mail.link());
    const db = await getDb();
    await db.update(authTokens).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(authTokens.performerId, p.id));
    await expect(resetPassword(t, "a-brand-new-secret-x")).rejects.toThrow(/失效/);
  });

  it("信箱不存在時不會洩漏這件事，也不會寄信", async () => {
    const before = mail.sent.length;
    await expect(requestReset("nobody-here@example.com")).resolves.toBeUndefined();
    expect(mail.sent.length).toBe(before);
  });

  it("重設密碼同時視為信箱已驗證——收得到信就證明信箱是他的", async () => {
    const e = email();
    const p = await signUp({ email: e, password: PW, displayName: "甲" });
    const db = await getDb();
    await db.update(performers).set({ emailVerifiedAt: null }).where(eq(performers.id, p.id));
    await requestReset(e);
    await resetPassword(token(mail.link()), "yet-another-secret-x");
    const [after] = await db.select().from(performers).where(eq(performers.id, p.id));
    expect(after.emailVerifiedAt).toBeTruthy();
  });

  it("重設之後，還沒用掉的其他重設連結一起作廢", async () => {
    const e = email();
    await signUp({ email: e, password: PW, displayName: "甲" });
    await requestReset(e);
    const first = token(mail.link());
    await requestReset(e);
    const second = token(mail.link());
    await resetPassword(second, "fresh-long-secret-x");
    await expect(resetPassword(first, "should-not-work-xyz")).rejects.toThrow(/失效/);
  });
});

describe("後台改密碼", () => {
  it("要先答對目前的密碼", async () => {
    const e = email();
    const p = await signUp({ email: e, password: PW, displayName: "甲" });
    await expect(changePassword(p.id, "wrong-one-here", "a-new-long-secret-x")).rejects.toThrow(/目前的密碼/);
    await changePassword(p.id, PW, "a-new-long-secret-x");
    expect((await signIn(e, "a-new-long-secret-x")).id).toBe(p.id);
  });

  it("新密碼一樣要過強度檢查", async () => {
    const e = email();
    const p = await signUp({ email: e, password: PW, displayName: "甲" });
    await expect(changePassword(p.id, PW, "123")).rejects.toThrow(/至少/);
  });
});
