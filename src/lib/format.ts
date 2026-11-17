export const CATEGORY_LABEL: Record<string, string> = {
  busker: "街頭藝人",
  service: "服務人員",
  creator: "創作者",
  other: "其他",
};

export const nt = (n: number) => `NT$${n.toLocaleString("zh-TW")}`;

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "剛剛";
  if (s < 3600) return `${Math.floor(s / 60)} 分鐘前`;
  if (s < 86400) return `${Math.floor(s / 3600)} 小時前`;
  return `${Math.floor(s / 86400)} 天前`;
}

export const initial = (name: string) => (name.trim()[0] ?? "♪").toUpperCase();

const WD = ["日", "一", "二", "三", "四", "五", "六"];
/** 台北時間格式化：自己算 UTC+8，避免伺服器與瀏覽器的 Intl 差異造成 hydration 不一致 */
export function fmtTaipei(iso: string | Date, withTime = true, withWeekday = true) {
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  const date = `${d.getUTCMonth() + 1}/${d.getUTCDate()}${withWeekday ? `（週${WD[d.getUTCDay()]}）` : ""}`;
  if (!withTime) return date;
  return `${date} ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
