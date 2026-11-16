/** 全台 22 縣市。標題用「台」字（搜尋量較高），內文同時出現「臺」與「台」兩種寫法 */
export type Area = { slug: string; name: string; short: string; official: string; region: "北部" | "中部" | "南部" | "東部" | "離島"; lat: number; lng: number };

export const AREAS: Area[] = [
  { slug: "taipei", name: "台北市", short: "台北", official: "臺北市", region: "北部" , lat: 25.0375, lng: 121.5637 },
  { slug: "new-taipei", name: "新北市", short: "新北", official: "新北市", region: "北部" , lat: 25.0169, lng: 121.4628 },
  { slug: "keelung", name: "基隆市", short: "基隆", official: "基隆市", region: "北部" , lat: 25.1276, lng: 121.7392 },
  { slug: "taoyuan", name: "桃園市", short: "桃園", official: "桃園市", region: "北部" , lat: 24.9937, lng: 121.301 },
  { slug: "hsinchu-city", name: "新竹市", short: "新竹", official: "新竹市", region: "北部" , lat: 24.8039, lng: 120.9647 },
  { slug: "hsinchu-county", name: "新竹縣", short: "竹北", official: "新竹縣", region: "北部" , lat: 24.8276, lng: 121.0133 },
  { slug: "yilan", name: "宜蘭縣", short: "宜蘭", official: "宜蘭縣", region: "北部" , lat: 24.757, lng: 121.7533 },
  { slug: "miaoli", name: "苗栗縣", short: "苗栗", official: "苗栗縣", region: "中部" , lat: 24.5602, lng: 120.8214 },
  { slug: "taichung", name: "台中市", short: "台中", official: "臺中市", region: "中部" , lat: 24.1477, lng: 120.6736 },
  { slug: "changhua", name: "彰化縣", short: "彰化", official: "彰化縣", region: "中部" , lat: 24.0756, lng: 120.5443 },
  { slug: "nantou", name: "南投縣", short: "南投", official: "南投縣", region: "中部" , lat: 23.9609, lng: 120.9718 },
  { slug: "yunlin", name: "雲林縣", short: "雲林", official: "雲林縣", region: "中部" , lat: 23.7092, lng: 120.4313 },
  { slug: "chiayi-city", name: "嘉義市", short: "嘉義", official: "嘉義市", region: "南部" , lat: 23.48, lng: 120.4491 },
  { slug: "chiayi-county", name: "嘉義縣", short: "嘉義縣", official: "嘉義縣", region: "南部" , lat: 23.4518, lng: 120.2555 },
  { slug: "tainan", name: "台南市", short: "台南", official: "臺南市", region: "南部" , lat: 22.9999, lng: 120.227 },
  { slug: "kaohsiung", name: "高雄市", short: "高雄", official: "高雄市", region: "南部" , lat: 22.6273, lng: 120.3014 },
  { slug: "pingtung", name: "屏東縣", short: "屏東", official: "屏東縣", region: "南部" , lat: 22.6813, lng: 120.4879 },
  { slug: "hualien", name: "花蓮縣", short: "花蓮", official: "花蓮縣", region: "東部" , lat: 23.9871, lng: 121.6015 },
  { slug: "taitung", name: "台東縣", short: "台東", official: "臺東縣", region: "東部" , lat: 22.7583, lng: 121.1444 },
  { slug: "penghu", name: "澎湖縣", short: "澎湖", official: "澎湖縣", region: "離島" , lat: 23.5655, lng: 119.5663 },
  { slug: "kinmen", name: "金門縣", short: "金門", official: "金門縣", region: "離島" , lat: 24.4321, lng: 118.3171 },
  { slug: "lienchiang", name: "連江縣", short: "馬祖", official: "連江縣", region: "離島" , lat: 26.1608, lng: 119.9494 },
];

export const REGIONS = ["北部", "中部", "南部", "東部", "離島"] as const;
export const areaBySlug = (slug: string | null | undefined) => AREAS.find((a) => a.slug === slug) ?? null;

/** 地圖預設中心（台灣本島） */
export const TAIWAN_CENTER = { lat: 23.8, lng: 120.95, zoom: 7 };
