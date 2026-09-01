import jijelLocationsData from "@/data/jijel-locations.json";
import { haversineKm } from "@/lib/geo";

export type Commune = {
  name: string;
  name_ar: string;
  lat: number;
  lng: number;
};

export type Daira = {
  name: string;
  name_ar: string;
  communes: Commune[];
};

export type JijelLocations = {
  province: {
    name: string;
    name_ar: string;
    code: number;
  };
  dairas: Daira[];
};

export const jijelLocations = jijelLocationsData as JijelLocations;

export type DairaSummary = {
  name: string;
  name_ar: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function getDairas(): DairaSummary[] {
  return jijelLocations.dairas.map((daira) => ({
    name: daira.name,
    name_ar: daira.name_ar,
  }));
}

export function getCommunesByDaira(dairaName: string): Commune[] {
  const normalizedDairaName = normalizeName(dairaName);

  const daira = jijelLocations.dairas.find(
    (entry) =>
      normalizeName(entry.name) === normalizedDairaName ||
      normalizeName(entry.name_ar) === normalizedDairaName,
  );

  return daira?.communes ?? [];
}

export function getCommuneCoordinates(communeName: string): Coordinates | null {
  const normalizedCommuneName = normalizeName(communeName);

  for (const daira of jijelLocations.dairas) {
    const commune = daira.communes.find(
      (entry) =>
        normalizeName(entry.name) === normalizedCommuneName ||
        normalizeName(entry.name_ar) === normalizedCommuneName,
    );

    if (commune) {
      return {
        lat: commune.lat,
        lng: commune.lng,
      };
    }
  }

  return null;
}

export function getCommuneArabicName(communeName: string): string {
  const normalizedCommuneName = normalizeName(communeName);

  for (const daira of jijelLocations.dairas) {
    const commune = daira.communes.find(
      (entry) =>
        normalizeName(entry.name) === normalizedCommuneName ||
        normalizeName(entry.name_ar) === normalizedCommuneName,
    );

    if (commune) {
      return commune.name_ar;
    }
  }

  return communeName;
}

export function getDairaForCommune(communeName: string): string | null {
  const normalizedCommuneName = normalizeName(communeName);

  for (const daira of jijelLocations.dairas) {
    const commune = daira.communes.find(
      (entry) =>
        normalizeName(entry.name) === normalizedCommuneName ||
        normalizeName(entry.name_ar) === normalizedCommuneName,
    );

    if (commune) {
      return daira.name;
    }
  }

  return null;
}

export function getAllCommunes(): Commune[] {
  return jijelLocations.dairas.flatMap((daira) => daira.communes);
}

export function getDairaCoordinates(dairaName: string): Coordinates | null {
  const communes = getCommunesByDaira(dairaName);

  if (communes.length === 0) {
    return null;
  }

  const lat =
    communes.reduce((sum, commune) => sum + commune.lat, 0) / communes.length;
  const lng =
    communes.reduce((sum, commune) => sum + commune.lng, 0) / communes.length;

  return { lat, lng };
}

export function resolveLocationReference(input: {
  lat?: number;
  lng?: number;
  commune?: string;
  daira?: string;
  jijelCenter?: Coordinates;
  outsideThresholdKm?: number;
}): {
  lat: number;
  lng: number;
  usedCommuneFallback: boolean;
} | null {
  const jijelCenter = input.jijelCenter ?? { lat: 36.8205, lng: 5.7667 };
  const outsideThresholdKm = input.outsideThresholdKm ?? 100;

  const hasGps =
    typeof input.lat === "number" &&
    typeof input.lng === "number" &&
    !Number.isNaN(input.lat) &&
    !Number.isNaN(input.lng);

  if (hasGps) {
    const distanceFromJijel = haversineKm(
      input.lat!,
      input.lng!,
      jijelCenter.lat,
      jijelCenter.lng,
    );

    if (distanceFromJijel <= outsideThresholdKm) {
      return {
        lat: input.lat!,
        lng: input.lng!,
        usedCommuneFallback: false,
      };
    }
  }

  if (input.commune) {
    const communeCoords = getCommuneCoordinates(input.commune);

    if (communeCoords) {
      return {
        lat: communeCoords.lat,
        lng: communeCoords.lng,
        usedCommuneFallback: true,
      };
    }
  }

  if (input.daira) {
    const dairaCoords = getDairaCoordinates(input.daira);

    if (dairaCoords) {
      return {
        lat: dairaCoords.lat,
        lng: dairaCoords.lng,
        usedCommuneFallback: true,
      };
    }
  }

  if (hasGps) {
    return {
      lat: input.lat!,
      lng: input.lng!,
      usedCommuneFallback: false,
    };
  }

  return null;
}

export function getDairaArabicName(dairaName: string): string {
  const normalizedDairaName = normalizeName(dairaName);

  const daira = jijelLocations.dairas.find(
    (entry) =>
      normalizeName(entry.name) === normalizedDairaName ||
      normalizeName(entry.name_ar) === normalizedDairaName,
  );

  return daira?.name_ar ?? dairaName;
}

export function formatLocationHeader(
  communeName: string | null | undefined,
  villageName: string,
  dairaName?: string | null,
): string {
  const communeAr = communeName ? getCommuneArabicName(communeName) : null;
  const dairaAr = dairaName ? getDairaArabicName(dairaName) : null;
  const parts = [communeAr, villageName, dairaAr ? `دائرة ${dairaAr}` : null].filter(
    Boolean,
  );

  return parts.join(" · ");
}
