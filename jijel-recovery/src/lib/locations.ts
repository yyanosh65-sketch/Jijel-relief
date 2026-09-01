import jijelLocationsData from "@/data/jijel-locations.json";

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
