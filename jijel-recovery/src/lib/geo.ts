import type { SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";

/** Inclusive land bounds for wilaya de Jijel (excludes Mediterranean overflow). */
export const JIJEL_LAND_BOUNDS = {
  latMin: 36.55,
  latMax: 36.815,
  lngMin: 5.45,
  lngMax: 6.35,
  marineThresholdLat: 36.818,
  coastalSafeLat: 36.81,
} as const;

export type JijelLandCoordinates = {
  lat: number;
  lng: number;
  wasClamped: boolean;
};

export function isJijelLandCoordinate(lat: number, lng: number): boolean {
  return (
    lat >= JIJEL_LAND_BOUNDS.latMin &&
    lat <= JIJEL_LAND_BOUNDS.latMax &&
    lng >= JIJEL_LAND_BOUNDS.lngMin &&
    lng <= JIJEL_LAND_BOUNDS.lngMax
  );
}

export function clampJijelLandCoordinates(
  lat: number,
  lng: number,
): JijelLandCoordinates {
  let safeLat = lat;
  let safeLng = lng;
  let wasClamped = false;

  if (lat > JIJEL_LAND_BOUNDS.marineThresholdLat) {
    safeLat = JIJEL_LAND_BOUNDS.coastalSafeLat;
    wasClamped = true;
  } else if (lat > JIJEL_LAND_BOUNDS.latMax) {
    safeLat = JIJEL_LAND_BOUNDS.latMax;
    wasClamped = true;
  } else if (lat < JIJEL_LAND_BOUNDS.latMin) {
    safeLat = JIJEL_LAND_BOUNDS.latMin;
    wasClamped = true;
  }

  if (lng < JIJEL_LAND_BOUNDS.lngMin) {
    safeLng = JIJEL_LAND_BOUNDS.lngMin;
    wasClamped = true;
  } else if (lng > JIJEL_LAND_BOUNDS.lngMax) {
    safeLng = JIJEL_LAND_BOUNDS.lngMax;
    wasClamped = true;
  }

  return { lat: safeLat, lng: safeLng, wasClamped };
}

export function clampJijelLandPosition(lat: number, lng: number): [number, number] {
  const { lat: safeLat, lng: safeLng } = clampJijelLandCoordinates(lat, lng);
  return [safeLat, safeLng];
}

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
