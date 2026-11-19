import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { performers } from "./db/schema";
import { applyPoints } from "./billing";
import { sendMail, signature } from "./mail";
import { track } from "./usage";
import { PLANS, planBySlug, type PlanSlug } from "./plans";

/**
 * 方案訂閱。
 *
 * 月費從點數餘額扣，不另外接訂閱金流。理由：表演者本來就為了服務費在儲值點數，
 * 月費走同一個餘額、記在同一本帳上，對帳只有一條線；而且不需要先拿到金流商的
 * 定期定額合約就能跑。
 *
 * 規則（和方案頁上寫的一致，不能不同）：
 * - 升級立刻生效，當下扣一個月
 * - 已經在付費方案的話，沒用完的天數按比例折抵
 * - 取消是「到期就不再續」，當期用到底，不退錢
 * - 到期時自動從點數續期；點數不夠就降回免費並通知
 */

const DAY = 86_400_000;
const PERIOD = 30 * DAY;

/** 點數是以「分」計價的，方案月費是整數元 */
const cents = (nt: number) => nt * 100;

/**
 * 現在真正生效的方案。
 *
 * 一定要用這個，不要直接讀 performers.plan——排程還沒跑到的那段時間裡，
 * 資料庫裡可能還留著已經過期的方案。費率與功能閘門都靠這個判斷。
 */
export function effectivePlan(p: { plan: string; planUntil: Date | string | null }): PlanSlug {
  if (p.plan === "free") return "free";
  if (!p.planUntil) return "free";
  const until = p.planUntil instanceof Date ? p.planUntil : new Date(p.planUntil);
  return until.getTime() > Date.now() ? (p.plan as PlanSlug) : "free";
}

/** 還沒用完的天數可以折抵多少（分） */
function unusedCredit(p: { plan: string; planUntil: Date | null }) {
  if (p.plan === "free" || !p.planUntil) return 0;
  const left = p.planUntil.getTime() - Date.now();
  if (left <= 0) return 0;
  const monthly = cents(planBySlug(p.plan).price);
  return Math.round((monthly * Math.min(left, PERIOD)) / PERIOD);
}

export type ChangeResult =
  | { ok: true; plan: PlanSlug; until: Date | null; chargedCents: number; balanceCents: number }
  | { ok: false; reason: "same" | "unknown" | "insufficient"; needCents?: number; balanceCents?: number };

/**
 * 換方案。降到免費是「停止續期」，不是立刻失效——當期用到底，和方案頁寫的一致。
 */
export async function changePlan(performerId: string, to: PlanSlug): Promise<ChangeResult> {
  if (!PLANS.some((x) => x.slug === to)) return { ok: false, reason: "unknown" };
  const db = await getDb();

  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(performers).where(eq(performers.id, performerId)).for("update");
    if (!p) return { ok: false, reason: "unknown" } as const;

    const now = effectivePlan(p);

    // 降回免費：不退錢、不立刻斷，只是不再續期
    if (to === "free") {
      if (now === "free") return { ok: false, reason: "same" } as const;
      await tx.update(performers).set({ planAutoRenew: false }).where(eq(performers.id, performerId));
      return { ok: true, plan: now, until: p.planUntil, chargedCents: 0, balanceCents: p.pointsCents } as const;
    }

    if (now === to && p.planAutoRenew) return { ok: false, reason: "same" } as const;

    // 取消續期之後又改變主意：當期還沒到期，所以只是把開關打開，不能再收一次錢
    if (now === to && !p.planAutoRenew) {
      await tx.update(performers).set({ planAutoRenew: true }).where(eq(performers.id, performerId));
      return { ok: true, plan: to, until: p.planUntil, chargedCents: 0, balanceCents: p.pointsCents } as const;
    }

    const price = cents(planBySlug(to).price);
    const credit = unusedCredit(p);
    // 可能是負的：從貴的方案換到便宜的，折抵大於新方案月費，差額退回點數。
    // 不這樣做的話，付了 1,290 當天改成 699 的方案，那 591 就平白不見了。
    const charge = price - credit;

    // 月費不讓透支。服務費可以小額透支是因為那代表有收入進來，月費沒有這個道理
    if (charge > 0 && p.pointsCents < charge) {
      return { ok: false, reason: "insufficient", needCents: charge - p.pointsCents, balanceCents: p.pointsCents } as const;
    }

    track("plan_change", performerId);
    const until = new Date(Date.now() + PERIOD);
    await tx.update(performers).set({ plan: to, planUntil: until, planAutoRenew: true }).where(eq(performers.id, performerId));

    let balance = p.pointsCents;
    if (charge !== 0) {
      const name = planBySlug(to).name;
      const note = charge > 0
        ? (credit > 0 ? `${name}方案月費・折抵未使用 ${(credit / 100).toLocaleString()} 元` : `${name}方案月費`)
        : `改為${name}方案・退回未使用的 ${(-charge / 100).toLocaleString()} 元`;
      balance = await applyPoints(tx, performerId, -charge, "plan", { note });
    }
    return { ok: true, plan: to, until, chargedCents: charge, balanceCents: balance } as const;
  });
}

/**
 * 到期處理。排程每小時呼叫一次。
 * 開著自動續期而且點數夠的就續一期，否則降回免費並通知。
 * 寫成可重複執行，漏跑或重跑都不會重複收費（靠 planUntil 當關卡）。
 */
export async function runPlanRenewals() {
  const db = await getDb();
  const due = await db
    .select({ id: performers.id, plan: performers.plan, planUntil: performers.planUntil, planAutoRenew: performers.planAutoRenew, points: performers.pointsCents, email: performers.email, name: performers.displayName })
    .from(performers)
    .where(and(sql`${performers.plan} <> 'free'`, isNotNull(performers.planUntil), lte(performers.planUntil, new Date())));

  let renewed = 0, dropped = 0;
  for (const p of due) {
    const price = cents(planBySlug(p.plan).price);
    const canRenew = p.planAutoRenew && p.points >= price;

    await db.transaction(async (tx) => {
      // 再讀一次並上鎖，避免兩個排程同時跑重複扣款
      const [fresh] = await tx.select().from(performers).where(eq(performers.id, p.id)).for("update");
      if (!fresh.planUntil || fresh.planUntil.getTime() > Date.now() || fresh.plan === "free") return;

      if (canRenew && fresh.pointsCents >= price) {
        await tx.update(performers).set({ planUntil: new Date(fresh.planUntil.getTime() + PERIOD) }).where(eq(performers.id, p.id));
        await applyPoints(tx, p.id, -price, "plan", { note: `${planBySlug(p.plan).name}方案續期` });
        renewed++;
      } else {
        await tx.update(performers).set({ plan: "free", planUntil: null, planAutoRenew: true }).where(eq(performers.id, p.id));
        dropped++;
      }
    });

    // 降回免費是會影響收入的事（服務費從 1% 回到 3%），一定要讓本人知道。
    // 沒有推播之後，信箱是唯一能主動送達的管道。
    if (!canRenew && p.email) {
      const why = p.planAutoRenew ? "點數不足" : "你先前取消了續期";
      await sendMail({
        to: p.email,
        subject: `${planBySlug(p.plan).name}方案已到期`,
        text:
          `${planBySlug(p.plan).name}方案已經到期（${why}），帳號已改回免費方案。\n\n` +
          `點歌與收款不受影響，資料也都還在，只是成交服務費從 1% 回到 3%，互動功能會關閉。\n` +
          `要再開啟隨時可以到後台的「方案」頁操作。` + signature(),
      }).catch(() => {});
    }
  }
  return { renewed, dropped, checked: due.length };
}
