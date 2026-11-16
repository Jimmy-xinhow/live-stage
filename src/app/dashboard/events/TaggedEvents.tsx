"use client";

import Link from "next/link";
import { useState } from "react";
import { fmtTaipei } from "@/lib/format";
import { useRouter } from "next/navigation";

type Row = { id: string; title: string; place: string; cityName: string; startsAt: string; status: string; organizer: string; cancelled: boolean };
const when = (iso: string) => fmtTaipei(iso);

export function TaggedEvents({ list }: { list: Row[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(id: string, accept: boolean) {
    setBusy(id);
    setMsg("");
    const r = await fetch("/api/dashboard/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, accept }) });
    const j = await r.json();
    setBusy(null);
    if (!r.ok) return setMsg(j.error ?? "失敗了");
    if (accept) setMsg(j.notified ? `已確認，通知了 ${j.notified} 位粉絲` : "已確認");
    router.refresh();
  }

  if (!list.length) return <p className="sec small">目前沒有被標記的活動。</p>;
  return (
    <div className="border-t-2 border-ink">
      {msg && <p className="py-2 text-[14px] text-ok">{msg}</p>}
      {list.map((e) => (
        <div key={e.id} className={`row flex flex-wrap items-center gap-3 py-4 ${e.cancelled ? "opacity-50" : ""}`}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/e/${e.id}`} className="font-bold underline">{e.title}</Link>
              {e.cancelled ? <span className="tag tag-quiet">主辦已取消</span> : e.status === "pending" ? <span className="tag tag-now">待確認</span> : e.status === "confirmed" ? <span className="tag">已確認</span> : <span className="tag tag-quiet">已婉拒</span>}
            </div>
            <div className="small">{when(e.startsAt)}・{e.cityName} {e.place}・主辦：{e.organizer}</div>
          </div>
          {e.status === "pending" && !e.cancelled && (
            <div className="flex shrink-0 gap-2">
              <button disabled={busy === e.id} onClick={() => respond(e.id, true)} className="btn btn-primary btn-sm">我會演出</button>
              <button disabled={busy === e.id} onClick={() => respond(e.id, false)} className="btn btn-quiet btn-sm">不是我</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
