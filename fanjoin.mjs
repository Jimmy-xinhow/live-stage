import { chromium } from "playwright";
const [url,out,taps="0"]=process.argv.slice(2);
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"}).catch(()=>{});
await p.evaluate(()=>fetch("/api/fan/dev?as=9",{method:"POST"}));
await p.goto(url,{waitUntil:"networkidle"});await p.waitForTimeout(1300);
const j=p.locator("button",{hasText:"加入 ›"}).first();
if(await j.count()){await j.click();await p.waitForTimeout(1500);}
await p.screenshot({path:out});await b.close();
