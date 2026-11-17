/**
 * 大螢幕與手機必須共用同一組隊伍顏色。
 * 觀眾在手機上選了琥珀隊，抬頭看大螢幕也要是琥珀色，否則根本不知道自己站哪一邊。
 */
export const LANE_COLORS = ["#ffb03a", "#e8356d", "#5fd0e3", "#8b7bd8"];

/** now 為 0 代表還沒掛載（伺服器端渲染），先不顯示秒數，避免 hydration 不一致 */
export function remain(endsAt: string, now: number) {
  if (!now) return "–:–";
  const s = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
