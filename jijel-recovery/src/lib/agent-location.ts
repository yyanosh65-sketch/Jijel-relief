import jijelLocationsData from "@/data/jijel-locations.json";
import type { JijelLocations } from "@/lib/locations";

const jijelLocations = jijelLocationsData as JijelLocations;

export type ResolvedAgentLocation = {
  commune: string;
  commune_ar: string;
  daira: string;
  daira_ar: string;
  lat: number;
  lng: number;
};

const DEFAULT_LOCATION: ResolvedAgentLocation = {
  commune: "Jijel",
  commune_ar: "جيجل",
  daira: "Jijel",
  daira_ar: "جيجل",
  lat: 36.8211,
  lng: 5.7667,
};

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function buildJijelLocationIndex(): ResolvedAgentLocation[] {
  return jijelLocations.dairas.flatMap((daira) =>
    daira.communes.map((commune) => ({
      commune: commune.name,
      commune_ar: commune.name_ar,
      daira: daira.name,
      daira_ar: daira.name_ar,
      lat: commune.lat,
      lng: commune.lng,
    })),
  );
}

export function resolveAgentLocation(communeQuery: string): ResolvedAgentLocation {
  const normalizedQuery = normalizeSearchText(communeQuery);
  if (!normalizedQuery) {
    return DEFAULT_LOCATION;
  }

  const index = buildJijelLocationIndex();
  let best: { entry: ResolvedAgentLocation; score: number } | null = null;

  for (const entry of index) {
    const candidates = [
      entry.commune_ar,
      entry.commune,
      entry.daira_ar,
      entry.daira,
    ].map(normalizeSearchText);

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (candidate.includes(normalizedQuery) || normalizedQuery.includes(candidate)) {
        const score = Math.min(candidate.length, normalizedQuery.length);
        if (!best || score > best.score) {
          best = { entry, score };
        }
      }
    }
  }

  return best?.entry ?? DEFAULT_LOCATION;
}
