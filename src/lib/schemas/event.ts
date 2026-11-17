import { z } from "zod";
import { AREAS } from "@/lib/areas";

/** 活動刊登／編輯共用的欄位驗證。放在 lib 而不是 route：route 檔只能匯出 Next 認可的欄位。 */
export const EventBody = z.object({
  title: z.string().trim().min(1).max(60),
  city: z.enum(AREAS.map((a) => a.slug) as [string, ...string[]]),
  place: z.string().trim().max(60).default(""),
  address: z.string().trim().max(100).default(""),
  startsAt: z.string().min(1),
  endsAt: z.string().nullable().default(null),
  description: z.string().max(800).default(""),
  priceText: z.string().max(40).default(""),
  link: z.string().max(300).default(""),
  coverUrl: z.string().max(300).nullable().default(null),
  guestActs: z.string().max(200).default(""),
  performerSlugs: z.array(z.string().max(40)).max(8).default([]),
  lat: z.string().trim().max(20).default(""),
  lng: z.string().trim().max(20).default(""),
  notifyFans: z.boolean().default(false),
});
