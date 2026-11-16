"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="btn btn-primary btn-sm">列印（A5）</button>;
}
