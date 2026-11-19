"use client";

/**
 * 用表單 POST 導去金流商的頁面。
 *
 * 金流商要的是 application/x-www-form-urlencoded 的整頁跳轉，不是 fetch——
 * 他們的回應是一整頁，而且要帶著使用者離開我們的網域。
 */
export function submitForm(action: string, fields: Record<string, string>) {
  const f = document.createElement("form");
  f.method = "POST";
  f.action = action;
  f.style.display = "none";
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement("input");
    i.type = "hidden";
    i.name = k;
    i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}
