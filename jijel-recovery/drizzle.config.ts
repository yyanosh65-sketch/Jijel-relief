import { resolve } from "node:path";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: resolve(process.cwd(), ".env.local") });

const forceLocal =
  process.env.USE_LOCAL_DB === "1" || process.env.USE_LOCAL_DB === "true";

const databaseUrl = forceLocal
  ? (process.env.DATABASE_URL_LOCAL ??
    "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery")
  : (process.env.DATABASE_URL ??
    process.env.DATABASE_URL_LOCAL ??
    "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery");

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
