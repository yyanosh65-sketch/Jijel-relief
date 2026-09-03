import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema";

const LOCAL_DATABASE_URL =
  "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery";

function isRailwayHost(url: string): boolean {
  return (
    url.includes("railway.internal") ||
    url.includes("rlwy.net") ||
    url.includes("railway.app")
  );
}

/**
 * Connection priority:
 * 1. USE_LOCAL_DB=1 → DATABASE_URL_LOCAL
 * 2. DATABASE_URL when set (Railway public proxy works from laptop)
 * 3. Fall back to local only if DATABASE_URL is missing or is railway.internal
 */
function resolveDatabaseUrl(): string {
  const configuredUrl = process.env.DATABASE_URL;
  const localUrl = process.env.DATABASE_URL_LOCAL ?? LOCAL_DATABASE_URL;
  const forceLocal =
    process.env.USE_LOCAL_DB === "1" || process.env.USE_LOCAL_DB === "true";

  if (forceLocal) {
    return localUrl;
  }

  if (!configuredUrl) {
    return localUrl;
  }

  // Internal Railway host is unreachable outside the Railway network.
  if (configuredUrl.includes("railway.internal")) {
    return localUrl;
  }

  return configuredUrl;
}

function buildPoolConfig(connectionString: string): PoolConfig {
  const config: PoolConfig = {
    connectionString,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: 10,
  };

  if (isRailwayHost(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

const connectionString = resolveDatabaseUrl();

const pool = new Pool(buildPoolConfig(connectionString));

pool.on("error", (err) => {
  console.error("[db] idle client error:", err.message);
});

export const db = drizzle(pool, { schema });

export function getResolvedDatabaseTarget(): string {
  try {
    return new URL(connectionString).host;
  } catch {
    return "unknown";
  }
}
