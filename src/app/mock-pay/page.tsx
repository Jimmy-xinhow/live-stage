import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orders, pointPurchases } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { nt } from "@/lib/format";
import { MockButtons } from "./MockButtons";

export const dynamic = "force-dynamic";

export default async function MockPay({ searchParams }: { searchParams: Promise<{ k?: string; t?: string }> }) {
  if (!env.allowMock) notFound();
  const { k = "order", t = "" } = await searchParams;
  const db = await getDb();
  const row =
    k === "points"
      ? (await db.select({ amount: pointPurchases.priceNt }).from(pointPurchases).where(eq(pointPurchases.tradeNo, t)))[0]
      : (await db.select({ amount: orders.amount }).from(orders).where(eq(orders.tradeNo, t)))[0];
  if (!row) notFound();
  return (
    <main className="mx-auto max-w-[400px] px-5 py-16">
      <div className="rounded-[20px] border-2 border-dashed border-ink3 p-6">
        <span className="label">開發測試・模擬金流</span>
        <p className="num mt-2 text-[40px] font-bold leading-[52px]">{nt(row.amount)}</p>
        <p className="small num">訂單 {t}</p>
        <p className="small mt-3">正式環境這一步會導向{k === "points" ? "平台" : "表演者自己"}的綠界／藍新付款頁。</p>
        <MockButtons kind={k === "points" ? "points" : "order"} tradeNo={t} />
      </div>
    </main>
  );
}
