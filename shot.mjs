import { chromium } from "playwright";
const [url,out,y="0",w="1440",h="900"]=process.argv.slice(2);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h},deviceScaleFactor:1.5});
await p.goto(url,{waitUntil:"networkidle"});await p.waitForTimeout(3000);
if(+y){await p.evaluate(yy=>window.scrollTo(0,yy),+y);await p.waitForTimeout(700);}
await p.screenshot({path:out});await b.close();
