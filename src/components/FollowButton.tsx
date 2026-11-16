"use client";

import { useState } from "react";
import { followApi, useFan, type FanInfo } from "./useFan";

/** 一鍵追蹤：已登入直接追蹤；沒登入就先走 LINE 登入，回來再按一次 */
export function FollowButton(props: { slug: string; name: string; initialFollowing: boolean; fan: FanInfo; liffId: string; devLogin: boolean; color: string; oaUrl: string }) {
  const { ensureFan } = useFan(props.fan, props.liffId, props.devLogin);
  const [following, setFollowing] = useState(props.initialFollowing);
  const [hint, setHint] = useState("");

  async function go() {
    if (!(await ensureFan())) {
      setHint("請用 LINE 開啟這個頁面再按追蹤");
      return;
    }
    if (await followApi(props.slug, true)) setFollowing(true);
  }

  if (following)
    return (
      <div className="card p-4">
        <strong>已追蹤 {props.name}</strong>
        <p className="small">下次開演、發布演出預告時會用 LINE 通知你。</p>
        {props.oaUrl && <a href={props.oaUrl} className="btn btn-secondary btn-sm btn-block mt-3">加 LINE 好友才收得到通知</a>}
      </div>
    );
  return (
    <div className="card p-4">
      <strong>追蹤 {props.name}</strong>
      <p className="small">追蹤後，他下次開演會用 LINE 通知你。</p>
      <button onClick={go} className="btn btn-primary btn-block mt-3">追蹤</button>
      {hint && <p className="mt-2 text-[13px] text-err">{hint}</p>}
    </div>
  );
}
