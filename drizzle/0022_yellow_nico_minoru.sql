CREATE TABLE "pay_qr_images" (
	"performer_id" uuid NOT NULL,
	"idx" integer NOT NULL,
	"data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pay_qr_images_performer_id_idx_pk" PRIMARY KEY("performer_id","idx")
);
--> statement-breakpoint
ALTER TABLE "pay_qr_images" ADD CONSTRAINT "pay_qr_images_performer_id_performers_id_fk" FOREIGN KEY ("performer_id") REFERENCES "public"."performers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_qr_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- 既有的圖片搬到新表，原本那一欄清成 null。
-- 搬完之後 performers 的每一列就都是小的，點歌頁不會再把 300KB 的圖一起撈出來。
INSERT INTO "pay_qr_images" ("performer_id", "idx", "data")
SELECT p.id, (e.ord - 1)::int, e.value->>'imageData'
FROM "performers" p, jsonb_array_elements(p.pay_methods) WITH ORDINALITY AS e(value, ord)
WHERE e.value->>'imageData' IS NOT NULL
ON CONFLICT DO NOTHING;--> statement-breakpoint
UPDATE "performers" SET "pay_methods" = (
  SELECT coalesce(jsonb_agg(jsonb_set(e.value, '{imageData}', 'null'::jsonb) ORDER BY e.ord), '[]'::jsonb)
  FROM jsonb_array_elements("pay_methods") WITH ORDINALITY AS e(value, ord)
)
WHERE "pay_methods" @> '[{"imageData": null}]'::jsonb IS NOT TRUE AND jsonb_array_length("pay_methods") > 0;
