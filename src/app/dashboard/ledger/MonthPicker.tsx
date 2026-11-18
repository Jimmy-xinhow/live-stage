"use client";

import { useRouter } from "next/navigation";

/** 最近 13 個月。表演者對帳頂多回頭看一年，再多只是讓選單變難用 */
function months() {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

export function MonthPicker({ month }: { month: string }) {
  const r = useRouter();
  return (
    <label className="field">
      <span>月份</span>
      <select
        className="input num"
        value={month}
        onChange={(e) => r.push(`/dashboard/ledger?m=${e.target.value}`)}
      >
        {months().map((m) => (
          <option key={m} value={m}>{m.replace("-", " / ")}</option>
        ))}
      </select>
    </label>
  );
}
