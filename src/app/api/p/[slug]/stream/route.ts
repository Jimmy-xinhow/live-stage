import { getPerformerBySlug } from "@/lib/orders";
import { publicGame } from "@/lib/games";
import { subscribe, type Snapshot } from "@/lib/livebus";
import { getFanId } from "@/lib/session";

export const dynamic = "force-dynamic";
// Node 執行環境才有常駐的記憶體狀態可以共用廣播；edge 每個請求各自獨立
export const runtime = "nodejs";

/**
 * 現場狀態的即時推送（SSE）。
 *
 * 取代原本每支手機每 1～5 秒各打一次的輪詢。資料庫的查詢由 lib/livebus
 * 一位表演者統一做一次，這裡只負責把結果寫給這一條連線。
 *
 * 用 SSE 不用 WebSocket：這是單向廣播，而且 SSE 斷線會自己重連，
 * 走的是一般 HTTP，不需要額外的升級協商。
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getPerformerBySlug(slug);
  if (!p) return new Response("not found", { status: 404 });

  // 這條連線是誰看的——遊戲裡的「我」要用它算分數與名次
  const fanId = await getFanId();

  const enc = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let beat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      const onSnap = (s: Snapshot) => {
        send("state", s.state);
        send("game", publicGame(s.game, fanId, p.id));
      };

      function cleanup() {
        unsubscribe?.();
        unsubscribe = null;
        if (beat) clearInterval(beat);
        beat = null;
      }

      unsubscribe = subscribe(slug, onSnap);

      // 心跳：中間的代理伺服器看到一段時間沒有資料就會把連線砍掉
      beat = setInterval(() => send("ping", Date.now()), 25_000);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      unsubscribe?.();
      if (beat) clearInterval(beat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx 之類的反向代理預設會緩衝，SSE 必須關掉才會即時
      "X-Accel-Buffering": "no",
    },
  });
}
