import jijelLocationsData from "@/data/jijel-locations.json";
import { clampJijelLandCoordinates, haversineKm } from "@/lib/geo";

export type RoadAccessibility =
  | "paved_heavy_truck"
  | "mountain_4x4_only"
  | "light_vehicles";

export type Commune = {
  name: string;
  name_ar: string;
  lat: number;
  lng: number;
  exact_address_ar?: string;
  landmark?: string;
  road_accessibility?: RoadAccessibility;
};

export type CommuneLocationMeta = {
  name: string;
  name_ar: string;
  daira: string;
  daira_ar: string;
  lat: number;
  lng: number;
  exact_address_ar: string;
  landmark: string;
  road_accessibility: RoadAccessibility;
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
  villages?: Village[];
};

export type Village = {
  name: string;
  name_ar: string;
  commune: string;
  commune_ar: string;
  daira: string;
  daira_ar: string;
  lat: number;
  lng: number;
  exact_address_ar: string;
  landmark: string;
  road_accessibility: RoadAccessibility;
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

const MOUNTAIN_COMMUNES = new Set([
  "texenna",
  "kaous",
  "ziama mansouriah",
  "eraguene",
  "bouraoui belhadef",
  "djemaa beni habibi",
  "djimla",
  "boudriaa ben yadjis",
  "ghebala",
  "kaous",
  "قوس",
  "تاكسنة",
  "زيامة منصورية",
  "إيراقن",
]);

function defaultRoadAccessibility(
  commune: Commune,
  daira: Daira,
): RoadAccessibility {
  if (commune.road_accessibility) {
    return commune.road_accessibility;
  }

  const key = normalizeName(`${commune.name} ${commune.name_ar}`);
  if (
    MOUNTAIN_COMMUNES.has(normalizeName(commune.name)) ||
    MOUNTAIN_COMMUNES.has(normalizeName(commune.name_ar)) ||
    /texenna|ziama|eraguene|djimla|ghebala|kaous/i.test(commune.name)
  ) {
    return "mountain_4x4_only";
  }

  if (normalizeName(daira.name).includes("el ancer")) {
    return "mountain_4x4_only";
  }

  return "paved_heavy_truck";
}

export function getCommuneLocationMeta(
  communeName: string,
  dairaHint?: string,
): CommuneLocationMeta | null {
  const normalizedCommuneName = normalizeName(communeName);

  for (const daira of jijelLocations.dairas) {
    if (
      dairaHint &&
      normalizeName(daira.name) !== normalizeName(dairaHint) &&
      normalizeName(daira.name_ar) !== normalizeName(dairaHint)
    ) {
      continue;
    }

    const commune = daira.communes.find(
      (entry) =>
        normalizeName(entry.name) === normalizedCommuneName ||
        normalizeName(entry.name_ar) === normalizedCommuneName,
    );

    if (commune) {
      const road_accessibility = defaultRoadAccessibility(commune, daira);
      const landmark =
        commune.landmark ?? `مفترق طرق ${commune.name_ar} — مسجد المركز`;
      const exact_address_ar =
        commune.exact_address_ar ??
        `مركز بلدية ${commune.name_ar}، دائرة ${daira.name_ar}`;

      return {
        name: commune.name,
        name_ar: commune.name_ar,
        daira: daira.name,
        daira_ar: daira.name_ar,
        lat: Number(commune.lat.toFixed(4)),
        lng: Number(commune.lng.toFixed(4)),
        exact_address_ar,
        landmark,
        road_accessibility,
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

export function getAllVillages(): Village[] {
  return jijelLocations.villages ?? [];
}

const VILLAGE_NAME_ALIASES: Record<string, string> = {
  lemnzel: "لمنزل",
  menazel: "لمنزل",
  machat: "مشاط",
  mechatt: "مشاط",
  mechet: "مشاط",
  tabellout: "تابلوط",
  tablout: "تابلوط",
  "qaa ezzane": "قاع الزان",
  "kaa ezzane": "قاع الزان",
  boutias: "بوتياس",
  boutiass: "بوتياس",
  "souk essebt": "سوق السبت",
  "souk es sebt": "سوق السبت",
};

function resolveVillageAlias(name: string): string {
  const normalized = normalizeName(name);
  return VILLAGE_NAME_ALIASES[normalized] ?? name;
}

export function findVillageByName(name: string): Village | null {
  const normalized = normalizeName(resolveVillageAlias(name));
  if (!normalized) return null;

  return (
    getAllVillages().find(
      (village) =>
        normalizeName(village.name) === normalized ||
        normalizeName(village.name_ar) === normalized,
    ) ?? null
  );
}

function tokenizeLocationText(value: string): string[] {
  return value
    .split(/[\s,،؛/|+&]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function resolveVerifiedMapCoordinates(input: {
  name?: string | null;
  daira?: string | null;
  address?: string | null;
  fallbackLat?: number;
  fallbackLng?: number;
}): Coordinates {
  const candidates = [input.name, input.address].filter(
    (value): value is string => Boolean(value?.trim()),
  );

  for (const candidate of candidates) {
    const directMatch = findVillageByName(candidate);
    if (directMatch) {
      return { lat: directMatch.lat, lng: directMatch.lng };
    }

    for (const token of tokenizeLocationText(candidate)) {
      const villageMatch = findVillageByName(token);
      if (villageMatch) {
        return { lat: villageMatch.lat, lng: villageMatch.lng };
      }
    }
  }

  if (input.name?.trim()) {
    const communeMeta = getCommuneLocationMeta(
      input.name,
      input.daira ?? undefined,
    );
    if (communeMeta) {
      return { lat: communeMeta.lat, lng: communeMeta.lng };
    }
  }

  if (
    typeof input.fallbackLat === "number" &&
    typeof input.fallbackLng === "number" &&
    !Number.isNaN(input.fallbackLat) &&
    !Number.isNaN(input.fallbackLng)
  ) {
    return clampJijelLandCoordinates(input.fallbackLat, input.fallbackLng);
  }

  return { lat: 36.75, lng: 6.05 };
}

export function isKnownDouarName(name: string): boolean {
  return findVillageByName(name) !== null;
}

export function getVillagesByCommune(communeName: string): Village[] {
  const normalized = normalizeName(communeName);
  return getAllVillages().filter(
    (village) =>
      normalizeName(village.commune) === normalized ||
      normalizeName(village.commune_ar) === normalized,
  );
}

export function resolveNearestLocation(
  lat: number,
  lng: number,
): CommuneLocationMeta & { distanceKm: number } {
  let best: (CommuneLocationMeta & { distanceKm: number }) | null = null;

  for (const daira of jijelLocations.dairas) {
    for (const commune of daira.communes) {
      const distanceKm = haversineKm(lat, lng, commune.lat, commune.lng);
      const meta = getCommuneLocationMeta(commune.name, daira.name);
      if (!meta) continue;
      if (!best || distanceKm < best.distanceKm) {
        best = { ...meta, distanceKm };
      }
    }
  }

  for (const village of getAllVillages()) {
    const distanceKm = haversineKm(lat, lng, village.lat, village.lng);
    const meta: CommuneLocationMeta = {
      name: village.commune,
      name_ar: village.commune_ar,
      daira: village.daira,
      daira_ar: village.daira_ar,
      lat: village.lat,
      lng: village.lng,
      exact_address_ar: village.exact_address_ar,
      landmark: village.landmark,
      road_accessibility: village.road_accessibility,
    };
    if (!best || distanceKm < best.distanceKm) {
      best = { ...meta, distanceKm };
    }
  }

  const fallback = getCommuneLocationMeta("Jijel", "Jijel")!;
  return (
    best ?? {
      ...fallback,
      distanceKm: haversineKm(lat, lng, fallback.lat, fallback.lng),
    }
  );
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
  const jijelCenter = input.jijelCenter ?? { lat: 36.75, lng: 6.05 };
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

export function formatDairaOptionLabel(daira: DairaSummary): string {
  return `دائرة ${daira.name_ar}`;
}

export function formatCommuneOptionLabel(
  commune: Commune,
  dairaNameAr: string,
): string {
  if (commune.name_ar === dairaNameAr) {
    return `${commune.name_ar} (مركز الدائرة)`;
  }

  return commune.name_ar;
}

export function formatLocationHeader(
  communeName: string | null | undefined,
  villageName: string,
  dairaName?: string | null,
): string {
  const villageRecord = findVillageByName(villageName);
  const communeRecord = communeName
    ? getCommuneLocationMeta(communeName, dairaName ?? undefined)
    : null;
  const communeAsDouar = communeName ? findVillageByName(communeName) : null;

  if (villageRecord) {
    return [
      "ولاية جيجل",
      `دائرة ${villageRecord.daira_ar}`,
      `بلدية ${villageRecord.commune_ar}`,
      `مشتى/دوار ${villageRecord.name_ar}`,
    ].join(" > ");
  }

  if (communeAsDouar) {
    return [
      "ولاية جيجل",
      `دائرة ${communeAsDouar.daira_ar}`,
      `بلدية ${communeAsDouar.commune_ar}`,
      `مشتى/دوار ${communeAsDouar.name_ar}`,
    ].join(" > ");
  }

  const communeAr = communeRecord?.name_ar ?? (communeName ? getCommuneArabicName(communeName) : null);
  const dairaAr = dairaName
    ? getDairaArabicName(dairaName)
    : communeRecord?.daira_ar ?? null;

  const segments = [
    "ولاية جيجل",
    dairaAr ? `دائرة ${dairaAr}` : null,
    communeAr ? `بلدية ${communeAr}` : null,
    villageName && villageName !== communeAr ? `مشتى/دوار ${villageName}` : null,
  ].filter(Boolean);

  return segments.join(" > ");
}
