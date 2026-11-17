"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AREAS } from "@/lib/areas";
import { ACTS } from "@/lib/acts";

/**
 * 縣市／類型選單。22 個縣市與 10 種類型全部攤平排在頁面上會很雜，
 * 統一收進下拉選單，選完直接導頁（不需要按送出）。
 *
 * 參數用 base ＋ param 而不是傳函式進來：函式沒辦法從 server component
 * 傳給 client component。keep 可以帶要保留的其他查詢參數。
 */
function Picker({ value, base, param, keep, label, allLabel, options }: {
  value?: string;
  base: string;
  param: string;
  keep?: Record<string, string | undefined>;
  label: string;
  allLabel: string;
  options: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const go = (v: string) => {
    const q = new URLSearchParams();
    for (const [k, val] of Object.entries(keep ?? {})) if (val) q.set(k, val);
    if (v) q.set(param, v);
    const s = q.toString();
    start(() => router.push(s ? `${base}?${s}` : base));
  };
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select className="input" value={value ?? ""} disabled={pending} onChange={(e) => go(e.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
      </select>
    </label>
  );
}

export function AreaSelect(props: { value?: string; base: string; param?: string; keep?: Record<string, string | undefined>; label?: string; allLabel?: string }) {
  return (
    <Picker
      {...props}
      param={props.param ?? "city"}
      label={props.label ?? "地區"}
      allLabel={props.allLabel ?? "全台"}
      options={AREAS.map((a) => ({ slug: a.slug, name: a.name }))}
    />
  );
}

export function ActSelect(props: { value?: string; base: string; param?: string; keep?: Record<string, string | undefined>; label?: string; allLabel?: string }) {
  return (
    <Picker
      {...props}
      param={props.param ?? "act"}
      label={props.label ?? "表演類型"}
      allLabel={props.allLabel ?? "全部類型"}
      options={ACTS.map((a) => ({ slug: a.slug, name: a.name }))}
    />
  );
}
