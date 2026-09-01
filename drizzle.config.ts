import { resolve } from "node:path";

import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: resolve(process.cwd(), "jijel-recovery/.env.local") });

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_LOCAL ??
  "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery";

export default defineConfig({
  schema: "./jijel-recovery/src/db/schema.ts",
  out: "./jijel-recovery/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
