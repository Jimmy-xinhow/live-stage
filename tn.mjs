import { PGlite } from "@electric-sql/pglite";
const db = new PGlite(".data/pglite");
console.log((await db.query("select trade_no from orders where status='paid' and item_title is not null limit 1")).rows[0].trade_no);
await db.close();
