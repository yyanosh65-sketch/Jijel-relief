import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const LOCAL_DATABASE_URL =
  "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery";

function resolveDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL;
  const localUrl = process.env.DATABASE_URL_LOCAL ?? LOCAL_DATABASE_URL;

  if (!configuredUrl) {
    return localUrl;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    configuredUrl.includes("railway.internal")
  ) {
    return localUrl;
  }

  return configuredUrl;
}

const connectionString = resolveDatabaseUrl();

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
