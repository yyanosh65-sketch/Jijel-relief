import { resolve } from "node:path";
import { readFileSync } from "node:fs";

import { config } from "dotenv";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env.local") });

const forceLocal =
  process.env.USE_LOCAL_DB === "1" || process.env.USE_LOCAL_DB === "true";

const databaseUrl = forceLocal
  ? (process.env.DATABASE_URL_LOCAL ??
    "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery")
  : (process.env.DATABASE_URL ??
    process.env.DATABASE_URL_LOCAL ??
    "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery");

async function main() {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  const sql0020 = readFileSync(
    resolve(process.cwd(), "drizzle/0020_volunteers_is_available.sql"),
    "utf8",
  );
  const sql0021 = readFileSync(
    resolve(process.cwd(), "drizzle/0021_wilaya_multitenancy.sql"),
    "utf8",
  );

  await client.query(sql0020);
  await client.query(sql0021);

  const check = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE column_name IN ('wilaya', 'is_available')
      AND table_name IN ('locations', 'needs', 'volunteers')
    ORDER BY table_name, column_name
  `);

  console.log("Applied columns:", check.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
