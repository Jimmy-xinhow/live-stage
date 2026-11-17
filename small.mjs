import { chromium } from "playwright";
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto("http://localhost:3000/",{waitUntil:"networkidle"});await p.waitForTimeout(2000);
console.log(JSON.stringify(await p.evaluate(()=>{const o=[];document.querySelectorAll("a,button").forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.height&&r.height<44)o.push([Math.round(r.height),e.className.toString().slice(0,48),e.textContent.trim().slice(0,16)])});return o}),null,0));
await b.close();
