/* eslint-disable @next/next/no-img-element */
import { initial } from "@/lib/format";

export function Avatar({ src, name, size = 40, color = "#e8590c" }: { src?: string | null; name: string; size?: number; color?: string }) {
  if (src) return <img src={src} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />;
  return (
    <div
      className="rounded-full grid place-items-center text-white font-bold shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial(name)}
    </div>
  );
}
