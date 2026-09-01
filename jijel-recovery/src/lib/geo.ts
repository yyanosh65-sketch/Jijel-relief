import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Haversine distance in km for use in Drizzle raw SQL (lat/lng columns). */
export function haversineKmSql(
  userLat: number | SQL,
  userLng: number | SQL,
  latColumn: SQL,
  lngColumn: SQL,
): SQL {
  return sql`6371 * acos(LEAST(1.0, GREATEST(-1.0, cos(radians(${userLat})) * cos(radians(${latColumn})) * cos(radians(${lngColumn}) - radians(${userLng})) + sin(radians(${userLat})) * sin(radians(${latColumn})))))`;
}
