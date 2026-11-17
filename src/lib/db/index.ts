import path from "node:path";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

const g = globalThis as unknown as { __db?: Promise<DB> };

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // 正式環境：Supabase / Railway Postgres。遷移預設用 `npm run db:migrate`，
    // 設 MIGRATE_ON_BOOT=true 可在啟動時自動跑（Railway 這類單一指令的平台方便些）。
    const client = postgres(url, { prepare: false, max: 5 });
    const db = drizzlePg(client, { schema });
    if (process.env.MIGRATE_ON_BOOT === "true") {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
      // SEED_DEMO=true 只在空資料庫建示範資料；=reset 會先清掉舊的示範帳號再重建（驗收用）
      if (process.env.SEED_DEMO === "true" || process.env.SEED_DEMO === "reset") {
        const { resetDemo, seedDemo } = await import("./seed");
        if (process.env.SEED_DEMO === "reset") await resetDemo(db as unknown as DB);
        await seedDemo(db as unknown as DB);
      }
    }
    return db;
  }
  // 開發環境：內嵌 PGlite（真正的 Postgres，存在 .data/），啟動時自動遷移＋種子資料
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (dataDir !== ":memory:") (await import("node:fs")).mkdirSync(path.dirname(dataDir), { recursive: true });
  const client = new PGlite(dataDir === ":memory:" ? undefined : dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  if (process.env.SEED_DEMO !== "false") {
    const { seedDemo } = await import("./seed");
    await seedDemo(db as unknown as DB);
  }
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__db) g.__db = init();
  return g.__db;
}

export { schema };
