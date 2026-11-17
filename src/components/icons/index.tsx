/**
 * 圖示。
 *
 * 量測發現整個首頁只有 1 個 SVG（就是字標），對照 Linear 的 231 個。
 * 圖示的作用不是裝飾，是讓人可以用掃的而不是逐字讀——我們首頁快七千字，
 * 讀的人需要視覺錨點。
 *
 * 全部用同一組規格：24 格線、筆畫 1.75、圓端圓角、currentColor。
 * 這八個是通用圖示庫沒有的概念，所以自己畫：點歌、排隊、大螢幕、派兵、
 * 轉盤、立牌、對帳、拆帳。其餘通用的（箭頭、勾、叉）也在下面。
 */
type P = { size?: number; className?: string; style?: React.CSSProperties };
const base = (s: number, cn: string) => ({
  width: s, height: s, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const, className: cn, "aria-hidden": true,
});

/** 點歌：音符加一個加號，就是「再一首」 */
export const IconRequest = ({ size = 24, className = "", style }: P) => (
  <svg {...base(size, className)} style={style}>
    <path d="M9 18V6.2l8-1.6V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17" cy="16" r="2.5" />
    <path d="M3.2 7.5h4M5.2 5.5v4" />
  </svg>
);
/** 排隊：三條長短不一的列，前面一個指示點 */
export const IconQueue = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1.4" /><circle cx="4" cy="18" r="1.4" />
    <path d="M9 6h11M9 12h8M9 18h5" />
  </svg>
);
/** 大螢幕：一面螢幕加底座，裡面有正在跑的內容 */
export const IconScreen = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M9 21h6M12 17v4" />
    <path d="M6.5 11.5h3l1.5-3 2 5 1.5-2h3" />
  </svg>
);
/** 派兵：旗子，加成道具的共同符號 */
export const IconTroops = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <path d="M6 21V3" /><path d="M6 4.2h11l-2.4 3.4L17 11H6" />
    <path d="M10.5 21h7" />
  </svg>
);
/** 轉盤：圓盤切四格加指針 */
export const IconWheel = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="13" r="8" /><path d="M12 5v16M4 13h16" />
    <path d="M12 1.6 10 4.6h4Z" fill="currentColor" />
  </svg>
);
/** 立牌：桌上的 QR 立牌 */
export const IconStand = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <rect x="5" y="3" width="14" height="14" rx="2" /><path d="M4 20.5h16M9 17l-1 3.5M15 17l1 3.5" />
    <path d="M8.5 7h2.5v2.5H8.5ZM13 7h2.5v2.5H13ZM8.5 11.5h2.5V14H8.5ZM13.5 12.5h1.5" />
  </svg>
);
/** 對帳：單據加一個勾 */
export const IconLedger = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <path d="M5 3h10l4 4v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z" /><path d="M14.5 3v4.5H19" />
    <path d="M8.5 11h4M8.5 14.5h2" /><path d="m13.5 15 1.6 1.6 3-3.2" />
  </svg>
);
/** 拆帳：一筆錢分給三個人 */
export const IconSplit = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="4.5" r="2.5" /><path d="M12 7v3.5M4.5 17v-2a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v2" />
    <circle cx="4.5" cy="19.5" r="2" /><circle cx="12" cy="19.5" r="2" /><circle cx="19.5" cy="19.5" r="2" />
    <path d="M12 10.5v7" />
  </svg>
);

/* 通用 */
export const IconCheck = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}><path d="m4.5 12.5 5 5 10-11" /></svg>
);
export const IconPlus = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconArrow = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}><path d="M4 12h15M13 6l6 6-6 6" /></svg>
);
export const IconChevron = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}><path d="m8 4.5 7.5 7.5L8 19.5" /></svg>
);
export const IconWallet = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11a2 2 0 0 1 2 2v1" />
    <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" /><circle cx="16" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);
export const IconBell = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" /><path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);
export const IconStreet = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <path d="M12 21V9" /><path d="M8 21h8" />
    <path d="M12 9a4.5 4.5 0 0 0 4.5-4.5h-9A4.5 4.5 0 0 0 12 9Z" />
  </svg>
);
export const IconVenue = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <path d="M3 20V9.5L12 4l9 5.5V20" /><path d="M3 20h18" />
    <path d="M9 20v-5h6v5" /><circle cx="12" cy="10.5" r="1.4" />
  </svg>
);
export const IconStream = ({ size = 24, className = "" }: P) => (
  <svg {...base(size, className)}>
    <circle cx="12" cy="12" r="2.5" />
    <path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 16.5a6.4 6.4 0 0 0 0-9" />
    <path d="M4.5 4.5a10.6 10.6 0 0 0 0 15M19.5 19.5a10.6 10.6 0 0 0 0-15" />
  </svg>
);
