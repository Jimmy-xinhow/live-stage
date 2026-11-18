/**
 * 載入骨架。
 *
 * 用意不是裝飾，是告訴人「東西在來的路上，不是壞了」。現場 4G 下後台第一次打開
 * 可能要等兩三秒，空白畫面會讓人一直重按。
 *
 * 形狀照著真實內容排，高度也對齊，這樣內容進來時版面不會跳。
 */
export function Bar({ w = "100%", h = 16, className = "" }: { w?: string | number; h?: number; className?: string }) {
  return <span className={`block animate-pulse rounded-[6px] bg-sunken ${className}`} style={{ width: w, height: h }} />;
}

/** 後台頁面的通用骨架：標題、說明、幾張卡 */
export function PageSkeleton({ rows = 4, cards = false }: { rows?: number; cards?: boolean }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite" aria-label="載入中">
      <div className="flex flex-col gap-3">
        <Bar w={180} h={28} />
        <Bar w="min(420px, 80%)" h={14} />
      </div>
      {cards ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="card flex flex-col gap-3 p-5"><Bar w={72} h={12} /><Bar w={110} h={30} /></div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="row flex items-center gap-4 py-4">
            <Bar w={44} h={44} className="shrink-0 !rounded-full" />
            <span className="flex flex-1 flex-col gap-2"><Bar w="55%" h={15} /><Bar w="35%" h={12} /></span>
            <Bar w={64} h={15} />
          </div>
        ))}
      </div>
      <span className="sr-only">載入中，請稍候</span>
    </div>
  );
}

/** 觀眾端點歌頁的骨架：封面、頭像、分頁、歌單 */
export function FanSkeleton() {
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] pb-32" aria-busy="true" aria-label="載入中">
      <div className="bg-sunken" style={{ aspectRatio: "16 / 7" }} />
      <div className="flex items-start gap-4 px-5 pt-4 pb-5">
        <Bar w={64} h={64} className="shrink-0 !rounded-full" />
        <span className="flex flex-1 flex-col gap-2 pt-2"><Bar w="60%" h={22} /><Bar w="40%" h={13} /></span>
      </div>
      <div className="flex gap-2 px-5">{Array.from({ length: 4 }, (_, i) => <Bar key={i} w={64} h={34} />)}</div>
      <div className="mt-5 flex flex-col gap-3 px-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="row flex items-center gap-3 py-4">
            <span className="flex flex-1 flex-col gap-2"><Bar w="65%" h={16} /><Bar w="40%" h={12} /></span>
            <Bar w={56} h={30} />
          </div>
        ))}
      </div>
      <span className="sr-only">載入中，請稍候</span>
    </main>
  );
}
