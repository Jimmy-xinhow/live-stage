import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { chatMessages, liveSessions, type Performer } from "./db/schema";
import { streamInfo } from "./acts";
import { env } from "./env";

/** 兩次輪詢至少間隔這麼久，避免每個觀眾都打 API */
const POLL_MS = 8000;
export const chatEnabled = () => !!env.chat.youtubeApiKey;

type YtMessage = { id: string; snippet?: { displayMessage?: string; publishedAt?: string }; authorDetails?: { displayName?: string } };

function videoId(url: string) {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be") return u.pathname.slice(1);
    if (h.endsWith("youtube.com")) return u.searchParams.get("v") ?? u.pathname.split("/").filter(Boolean).pop() ?? "";
  } catch {}
  return "";
}

async function yt(path: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, key: env.chat.youtubeApiKey });
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`youtube ${r.status}`);
  return r.json();
}

/** 找出這場直播的聊天室 id（只在開播後查一次，存在這場演出上） */
async function resolveChatId(streamUrl: string) {
  const id = videoId(streamUrl);
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  const j = (await yt("videos", { part: "liveStreamingDetails", id })) as { items?: { liveStreamingDetails?: { activeLiveChatId?: string } }[] };
  return j.items?.[0]?.liveStreamingDetails?.activeLiveChatId ?? null;
}

/**
 * 讀直播聊天室，寫進留言紀錄並加應援能量。
 * 沒有金鑰、沒有開演、不是 YouTube，或還沒到輪詢間隔，就直接回傳現況不打 API。
 */
export async function pollChat(p: Performer) {
  const db = await getDb();
  if (!p.liveSessionId) return { enabled: chatEnabled(), live: false, added: 0 };
  const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, p.liveSessionId));
  if (!s) return { enabled: chatEnabled(), live: false, added: 0 };
  const info = streamInfo(p.streamUrl);
  if (!chatEnabled() || info?.platform !== "youtube") return { enabled: chatEnabled(), live: true, added: 0 };
  if (s.chatAt && Date.now() - s.chatAt.getTime() < POLL_MS) return { enabled: true, live: true, added: 0 };

  await db.update(liveSessions).set({ chatAt: new Date() }).where(eq(liveSessions.id, s.id));
  try {
    let chatId = s.chatId;
    if (!chatId || s.chatPlatform !== "youtube") {
      chatId = await resolveChatId(p.streamUrl ?? "");
      if (!chatId) return { enabled: true, live: true, added: 0 };
      await db.update(liveSessions).set({ chatPlatform: "youtube", chatId, chatToken: null }).where(eq(liveSessions.id, s.id));
    }
    const j = (await yt("liveChat/messages", {
      liveChatId: chatId,
      part: "snippet,authorDetails",
      maxResults: "50",
      ...(s.chatToken ? { pageToken: s.chatToken } : {}),
    })) as { items?: YtMessage[]; nextPageToken?: string };
    const items = (j.items ?? []).filter((m) => m.snippet?.displayMessage);
    if (j.nextPageToken) await db.update(liveSessions).set({ chatToken: j.nextPageToken }).where(eq(liveSessions.id, s.id));
    if (!items.length) return { enabled: true, live: true, added: 0 };

    const rows = items.map((m) => ({
      sessionId: s.id,
      performerId: p.id,
      platform: "youtube",
      externalId: m.id.slice(0, 80),
      author: (m.authorDetails?.displayName ?? "觀眾").slice(0, 40),
      text: (m.snippet?.displayMessage ?? "").slice(0, 200),
    }));
    const added = await db.insert(chatMessages).values(rows).onConflictDoNothing().returning({ id: chatMessages.id });
    if (added.length && env.chat.hypePerMessage > 0)
      await db
        .update(liveSessions)
        .set({ hype: sql`least(100, ${liveSessions.hype} + ${Math.round(added.length * env.chat.hypePerMessage)})` })
        .where(eq(liveSessions.id, s.id));
    return { enabled: true, live: true, added: added.length };
  } catch (e) {
    console.error("[chat]", e);
    return { enabled: true, live: true, added: 0 };
  }
}

/** 最近的聊天室留言與熱度排行（留言數，不是金額） */
export async function chatState(p: Performer, limit = 12) {
  const db = await getDb();
  if (!p.liveSessionId) return { enabled: chatEnabled(), messages: [], top: [] };
  const [recent, top] = await Promise.all([
    db.select().from(chatMessages).where(eq(chatMessages.sessionId, p.liveSessionId)).orderBy(desc(chatMessages.createdAt)).limit(limit),
    db
      .select({ author: chatMessages.author, n: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(and(eq(chatMessages.sessionId, p.liveSessionId), eq(chatMessages.performerId, p.id)))
      .groupBy(chatMessages.author)
      .orderBy(desc(sql`count(*)`))
      .limit(5),
  ]);
  return {
    enabled: chatEnabled(),
    messages: recent.map((m) => ({ id: m.id, author: m.author, text: m.text, at: m.createdAt.toISOString() })),
    top: top.map((t) => ({ name: t.author, count: Number(t.n) })),
  };
}
