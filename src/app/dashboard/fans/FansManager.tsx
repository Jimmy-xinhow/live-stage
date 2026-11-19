"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { nt, timeAgo } from "@/lib/format";

type Seg = "new" | "regular" | "big" | "sleeping";
type Fan = { id: string; name: string; avatar: string | null; followedAt: string; total: number; cnt: number; last: string | null; seg: Seg[] };
type Hist = { itemTitle: string | null; amount: number; message: string; paidAt: string | null };

const SEG_SHORT: Record<Seg, string> = { new: "新粉", regular: "常客", big: "大粉", sleeping: "沉睡" };
const TEMPLATES: Record<"all" | Seg, string> = {
  all: "謝謝大家一直來聽我唱歌！這週六晚上一樣在老地方，等你們來點歌。",
  new: "謝謝你最近追蹤我！下次來可以直接點歌單上的歌，我都會唱。",
  regular: "常常看到你，真的很感謝！下次來跟我說你想聽什麼，我先練起來。",
  big: "謝謝你一直這麼支持我，下次來我請你點一首。",
  sleeping: "好久不見！我最近練了幾首新歌，有空來聽聽。",
};

export function FansManager({ fans, segmentLabel }: { fans: Fan[]; segmentLabel: Record<Seg, string> }) {
  const router = useRouter();
  const [seg, setSeg] = useState<"all" | Seg>("all");
  const [text, setText] = useState(TEMPLATES.all);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [hist, setHist] = useState<Record<string, Hist[]>>({});
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => (seg === "all" ? fans : fans.filter((f) => f.seg.includes(seg))), [fans, seg]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: fans.length };
    for (const s of ["new", "regular", "big", "sleeping"] as Seg[]) c[s] = fans.filter((f) => f.seg.includes(s)).length;
    return c;
  }, [fans]);

  async function expand(id: string) {
    setOpen(open === id ? null : id);
    if (!hist[id]) {
      const j = await fetch(`/api/dashboard/fans/${id}`).then((r) => r.json());
      setHist((h) => ({ ...h, [id]: j.items }));
    }
  }

  return (
    <section className="sec">
      <h2 className="h2">粉絲 <span className="num text-ink3">{fans.length}</span></h2>
      <p className="small">觀眾點歌時預設會追蹤你。依支持金額排序，點一下看他點過什麼。這份名單是你自己的經營資料，平台不會外流，也沒有主動推播——要讓他們知道下一場，用開演公告的圖去貼社群。</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "new", "regular", "big", "sleeping"] as const).map((k) => (
          <button key={k} onClick={() => { setSeg(k); setText(TEMPLATES[k]); }} title={k === "all" ? "" : segmentLabel[k]} className={`tag !h-9 !px-3 !text-[14px] ${seg === k ? "!bg-ink !text-paper" : "tag-quiet"}`}>
            {k === "all" ? "全部" : SEG_SHORT[k]} <span className="num">{counts[k]}</span>
          </button>
        ))}
      </div>
      {seg !== "all" && <p className="small mt-1">{segmentLabel[seg]}</p>}

      <ul className="mt-4 border-t border-rule">
        {shown.map((f, i) => (
          <li key={f.id} className="row py-3">
            <button onClick={() => expand(f.id)} className="flex w-full items-center gap-3 text-left">
              <span className="num w-5 shrink-0 text-center text-[13px] font-bold text-ink3">{i + 1}</span>
              <Avatar src={f.avatar} name={f.name} size={36} color="#6b665c" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <strong>{f.name}</strong>
                  {f.seg.map((s) => <span key={s} className="tag tag-quiet !h-5 !px-1.5 !text-[11px]">{SEG_SHORT[s]}</span>)}
                </div>
                <div className="small">追蹤 {timeAgo(f.followedAt)}{f.last ? `・最近支持 ${timeAgo(f.last)}` : ""}</div>
              </div>
              <div className="shrink-0 text-right">
                <strong className="num block">{nt(f.total)}</strong>
                <span className="small num">{f.cnt} 次</span>
              </div>
            </button>
            {open === f.id && (
              <div className="ml-8 mt-2 rounded-[12px] bg-sunken p-3 text-[14px] leading-6">
                {(hist[f.id] ?? []).length ? (
                  <ul>
                    {hist[f.id].map((h, j) => (
                      <li key={j}>{h.itemTitle ? `〈${h.itemTitle}〉` : "打賞"} <span className="num">{nt(h.amount)}</span>{h.message ? `・「${h.message}」` : ""}<span className="small">{h.paidAt ? `・${timeAgo(h.paidAt)}` : ""}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="small">{hist[f.id] ? "還沒有點歌紀錄" : "載入中"}</p>
                )}
              </div>
            )}
          </li>
        ))}
        {!shown.length && <li className="small py-8 text-center">這一群還沒有粉絲</li>}
      </ul>
    </section>
  );
}
