"use client";

import { useState } from "react";
import { followApi, useFan, type FanInfo } from "./useFan";

export function FollowMini(props: { slug: string; initialFollowing: boolean; fan: FanInfo; liffId: string; devLogin: boolean; count: number }) {
  const { ensureFan } = useFan(props.fan, props.liffId, props.devLogin);
  const [on, setOn] = useState(props.initialFollowing);
  const [hint, setHint] = useState("");
  async function go() {
    if (!(await ensureFan())) return setHint("請用 LINE 開啟這個頁面再按追蹤");
    if (await followApi(props.slug, !on)) setOn(!on);
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <button onClick={go} className={`btn ${on ? "btn-quiet" : "btn-secondary"}`}>{on ? "已追蹤" : "追蹤"}・<span className="num">{props.count + (on && !props.initialFollowing ? 1 : 0) - (!on && props.initialFollowing ? 1 : 0)}</span></button>
      {hint && <span className="small text-err">{hint}</span>}
    </span>
  );
}
