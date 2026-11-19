import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { requirePerformer } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { AREAS } from "@/lib/areas";
import { checkDataUrlImage } from "@/lib/imagecheck";
import { planHasPro, planIsPaid } from "@/lib/plans";
import { effectivePlan } from "@/lib/subscription";

const RESERVED = new Set(["admin", "api", "dashboard", "login", "live", "p", "o", "me", "mock-pay", "www"]);

const Body = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,39}$/, "網址代號需 3–40 字，限英數與 -"),
  displayName: z.string().trim().min(1).max(40),
  avatarUrl: z.string().url().or(z.literal("")).nullish(),
  bio: z.string().max(300),
  category: z.enum(["busker", "service", "creator", "other"]),
  city: z.string().nullable().refine((v) => v === null || AREAS.some((a) => a.slug === v), "縣市不正確"),
  district: z.string().trim().max(30).default(""),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  thankYouText: z.string().max(200),
  presetAmounts: z.array(z.number().int().positive()).min(1).max(6),
  minAmount: z.number().int().min(1),
  maxAmount: z.number().int().max(50000),
  maxQueue: z.number().int().min(1).max(100),
  avgSongMinutes: z.number().int().min(1).max(30),
  showAmounts: z.boolean(),
  hideBranding: z.boolean().default(false),
  streamDelaySec: z.number().int().min(0).max(120).default(0),
  payMethods: z
    .array(
      z.object({
        type: z.enum(["linepay", "jkopay", "pxpay", "other"]),
        label: z.string().trim().min(1).max(20),
        qrText: z.string().max(1000).nullable(),
        // 無法解碼時存壓縮圖；檔頭、MIME 與大小都要對得上
        imageData: z
          .string()
          .max(450_000)
          .nullable()
          .superRefine((v, ctx) => {
            if (!v) return;
            const r = checkDataUrlImage(v);
            if (!r.ok) ctx.addIssue({ code: "custom", message: r.reason });
          }),
      }).refine((m) => m.qrText || m.imageData, "收款碼內容不可為空"),
    )
    .max(4),
  gateway: z
    .object({ gateway: z.enum(["ecpay", "newebpay"]), merchantId: z.string().trim().min(5).max(20), hashKey: z.string().trim().min(8), hashIV: z.string().trim().min(8) })
    .nullish(),
});

export async function POST(req: Request) {
  const auth = await requirePerformer();
  if (!auth) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "格式錯誤" }, { status: 400 });
  const { gateway, ...b } = parsed.data;
  if (RESERVED.has(b.slug)) return NextResponse.json({ error: "此網址代號保留中" }, { status: 400 });
  if (b.minAmount > b.maxAmount) return NextResponse.json({ error: "最低金額不可大於最高金額" }, { status: 400 });
  if (gateway?.gateway === "newebpay" && (gateway.hashKey.length !== 32 || gateway.hashIV.length !== 16))
    return NextResponse.json({ error: "藍新 HashKey 應為 32 碼、HashIV 應為 16 碼" }, { status: 400 });

  const db = await getDb();
  const dup = await db.select({ id: performers.id }).from(performers).where(and(eq(performers.slug, b.slug), ne(performers.id, auth.performer.id)));
  if (dup.length) return NextResponse.json({ error: "網址代號已被使用" }, { status: 409 });

  await db
    .update(performers)
    .set({
      ...b,
      avatarUrl: b.avatarUrl || null,
      // 免費方案不能關掉平台標記。在這裡擋，不能只靠前端藏按鈕
      hideBranding: b.hideBranding && planIsPaid(effectivePlan(auth.performer)),
      streamDelaySec: planHasPro(effectivePlan(auth.performer)) ? b.streamDelaySec : 0,
      presetAmounts: [...new Set(b.presetAmounts)].sort((x, y) => x - y),
      ...(gateway
        ? { gateway: gateway.gateway, gatewayMerchantId: gateway.merchantId, gatewayHashKeyEnc: encrypt(gateway.hashKey), gatewayHashIvEnc: encrypt(gateway.hashIV) }
        : {}),
    })
    .where(eq(performers.id, auth.performer.id));
  return NextResponse.json({ ok: true });
}
