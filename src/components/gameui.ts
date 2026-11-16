export const LANE_COLORS = ["#5B8DF5", "#F06A7E", "#FFC83D", "#2DD4BF"];
/** now 為 0 代表還沒掛載（伺服器端渲染），先不顯示秒數，避免 hydration 不一致 */
export function remain(endsAt: string, now: number) {
  if (!now) return "–:–";
  const s = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
