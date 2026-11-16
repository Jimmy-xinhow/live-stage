"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { timeAgo } from "@/lib/format";

type Item = { id: string; code: string | null; requestedAt: string | null; name: string; emoji: string; reward: string | null; fanName: string; avatar: string | null };

/** 粉絲申請領取的獎勵：對方出示兌換碼，藝人按「已兌換」 */
export function PendingRewards({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const j = await fetch("/api/dashboard/rewards", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (j?.items) setItems(j.items);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  const redeem = async (id: string) => {
    setBusy(id);
    await fetch(`/api/dashboard/rewards/${id}`, { method: "POST" });
    setBusy(null);
    load();
  };

  if (!items.length) return compact ? null : <p className="small">目前沒有待兌換的獎勵。</p>;
  return (
    <section className={compact ? "rounded-[20px] border-[1.5px] border-ink bg-raised p-4" : ""}>
      {compact && <h2 className="h3">待兌換獎勵 <span className="num">{items.length}</span></h2>}
      <ul>
        {items.map((it) => (
          <li key={it.id} className="row flex items-center gap-3 py-3">
            <Avatar src={it.avatar} name={it.fanName} size={36} color="#6b665c" />
            <div className="min-w-0 flex-1">
              <strong className="block truncate">{it.fanName}・{it.emoji}{it.name}</strong>
              <div className="small truncate">{it.reward}{it.requestedAt ? `・${timeAgo(it.requestedAt)}` : ""}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="label">兌換碼</div>
              <div className="num text-[20px] font-bold tracking-[.12em]">{it.code}</div>
            </div>
            <button disabled={busy === it.id} onClick={() => redeem(it.id)} className="btn btn-primary btn-sm shrink-0">已兌換</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
