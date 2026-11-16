import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { performers } from "@/lib/db/schema";
import { replyMessage, verifyWebhookSignature } from "@/lib/line";
import { env, APP_NAME } from "@/lib/env";
import { confirmManual, getPerformerById, OrderError, rejectManual, sessionQueue, positionIn, startOfTodayTaipei, totalsSince } from "@/lib/orders";
import { fmtPoints } from "@/lib/billing";
import { fmtShowTime, getFanByLine, myFollowing } from "@/lib/fans";
import { redeemReward, RewardError } from "@/lib/rewards";
import { EventError, respondTag, taggedEvents } from "@/lib/events";
import { inquiriesFor } from "@/lib/market";
import { fmtTaipei } from "@/lib/format";

type LineEvent = { type: string; replyToken?: string; source?: { userId?: string }; message?: { type: string; text?: string }; postback?: { data: string } };

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-line-signature"))) return new Response("bad signature", { status: 401 });
  const { events } = JSON.parse(raw) as { events: LineEvent[] };
  const db = await getDb();

  for (const ev of events) {
    if (!ev.replyToken || !ev.source?.userId) continue;
    const [p] = await db.select().from(performers).where(eq(performers.lineUserId, ev.source.userId));

    if (ev.type === "follow") {
      await replyMessage(ev.replyToken, [
        {
          type: "text",
          text: p
            ? `歡迎回來 ${p.displayName}！之後收到打賞都會在這裡通知你。\n輸入「打賞碼」拿連結、「今日」看業績、「邀約」看待回覆、「活動」看被標記的活動、「點數」查餘額。`
            : `歡迎使用${APP_NAME} 🙌\n想開通自己的打賞頁？登入後台：${env.baseUrl}/login\n想打賞？直接掃藝人的 QR Code 就可以。`,
        },
      ]);
      continue;
    }
    // 表演者在 LINE 裡確認或婉拒被標記的活動
    if (p && ev.type === "postback" && /^event_(yes|no):/.test(ev.postback?.data ?? "")) {
      const [kind, id] = ev.postback!.data.split(":");
      let text: string;
      try {
        const r = await respondTag((await getPerformerById(p.id))!, id, kind === "event_yes");
        text = kind === "event_yes" ? `已確認，你的名字會顯示在活動頁${r.notified ? `，並通知了 ${r.notified} 位粉絲` : ""}。` : "已婉拒，不會顯示你的名字。";
      } catch (e) {
        text = e instanceof EventError ? e.message : "處理失敗";
      }
      await replyMessage(ev.replyToken, [{ type: "text", text }]);
      continue;
    }

    // 藝人在 LINE 裡按「已兌換」獎勵
    if (p && ev.type === "postback" && (ev.postback?.data ?? "").startsWith("redeem:")) {
      let text: string;
      try {
        await redeemReward((await getPerformerById(p.id))!, ev.postback!.data.slice(7));
        text = "✅ 已兌換，粉絲會收到通知";
      } catch (e) {
        text = e instanceof RewardError ? e.message : "處理失敗";
      }
      await replyMessage(ev.replyToken, [{ type: "text", text }]);
      continue;
    }

    // 藝人在 LINE 裡直接確認轉帳：按快速回覆按鈕，或直接輸入 4 碼點歌碼
    if (p && (ev.type === "postback" || (ev.type === "message" && /^(確認\s*)?\d{4}$/.test((ev.message?.text ?? "").trim())))) {
      const [action, id] = ev.type === "postback" ? (ev.postback?.data ?? "").split(":") : ["confirm", ""];
      const code = ev.type === "message" ? (ev.message?.text ?? "").replace(/\D/g, "") : undefined;
      const fresh = (await getPerformerById(p.id))!;
      let text: string;
      try {
        if (action === "reject") {
          const o = await rejectManual(fresh, { id });
          text = `已取消點歌碼 ${o.payCode}，觀眾會收到通知。`;
        } else {
          const o = await confirmManual(fresh, id ? { id } : { code });
          const pos = o.sessionId && o.kind === "request" ? positionIn(await sessionQueue(o.sessionId), o) : null;
          text = `✅ 已確認 ${o.payCode}・NT$${o.amount.toLocaleString()}${o.itemTitle ? `\n〈${o.itemTitle}〉排在第 ${(pos ?? 0) + 1} 位` : "（打賞）"}`;
        }
      } catch (e) {
        text = e instanceof OrderError ? e.message : "處理失敗，請到演出控制台確認";
      }
      await replyMessage(ev.replyToken, [{ type: "text", text }]);
      continue;
    }

    if (ev.type !== "message" || ev.message?.type !== "text") continue;
    const text = (ev.message.text ?? "").trim();

    // 觀眾：輸入「追蹤」看追蹤的藝人誰正在表演、下次在哪
    if (/^(我的)?追蹤$|^誰在唱/.test(text)) {
      const fan = await getFanByLine(ev.source.userId);
      const list = fan ? await myFollowing(fan.id) : [];
      const lines = list.slice(0, 8).map((f) =>
        f.live ? `🔴 ${f.name} 正在表演・${f.live.location}` : f.nextShow ? `📅 ${f.name} ${fmtShowTime(new Date(f.nextShow.startsAt))}・${f.nextShow.location}` : `・${f.name}`,
      );
      await replyMessage(ev.replyToken, [
        { type: "text", text: lines.length ? `你追蹤的藝人：\n${lines.join("\n")}\n\n全部：${env.baseUrl}/me` : `你還沒有追蹤藝人，點歌時勾選「追蹤」就會出現在這裡。\n${env.baseUrl}/me` },
      ]);
      continue;
    }

    if (!p) continue; // 一般使用者的其他訊息交給 LINE OA 自動回覆設定處理
    if (/打賞碼|收款碼|QR/i.test(text)) {
      await replyMessage(ev.replyToken, [
        { type: "text", text: `你的打賞頁：${env.baseUrl}/p/${p.slug}\n演出控制台：${env.baseUrl}/dashboard/stage\n大螢幕：${env.baseUrl}/live/${p.slug}\n列印立牌：${env.baseUrl}/dashboard/poster` },
      ]);
    } else if (/今日|今天|業績/.test(text)) {
      const t = await totalsSince(p.id, startOfTodayTaipei());
      await replyMessage(ev.replyToken, [{ type: "text", text: `今日收到 ${t.count} 筆點歌／打賞，共 NT$${t.sum.toLocaleString()} 🎉` }]);
    } else if (/活動/.test(text)) {
      const list = (await taggedEvents(p.id)).filter((e) => !e.cancelled && new Date(e.startsAt).getTime() > Date.now());
      await replyMessage(ev.replyToken, [
        {
          type: "text",
          text: list.length
            ? `你被標記的活動：\n${list.slice(0, 5).map((e) => `${fmtTaipei(e.startsAt)}・${e.title}（${e.status === "confirmed" ? "已確認" : e.status === "pending" ? "待確認" : "已婉拒"}）`).join("\n")}\n\n全部：${env.baseUrl}/dashboard/events`
            : `目前沒有被標記的活動。\n${env.baseUrl}/dashboard/events`,
        },
      ]);
    } else if (/邀約|報價/.test(text)) {
      const list = (await inquiriesFor(p.id)).filter((q) => q.status === "new");
      await replyMessage(ev.replyToken, [
        {
          type: "text",
          text: list.length
            ? `有 ${list.length} 筆邀約還沒回覆：\n${list.slice(0, 5).map((q) => `${q.eventDate}・${q.occasion}・${q.cityName}${q.budget ? `・${q.budget}` : ""}`).join("\n")}\n\n回覆報價：${env.baseUrl}/dashboard/inquiries`
            : `目前沒有待回覆的邀約。\n${env.baseUrl}/dashboard/inquiries`,
        },
      ]);
    } else if (/點數|餘額/.test(text)) {
      await replyMessage(ev.replyToken, [{ type: "text", text: `目前點數 ${fmtPoints(p.pointsCents)} 點\n儲值：${env.baseUrl}/dashboard/points` }]);
    }
  }
  return NextResponse.json({ ok: true });
}
