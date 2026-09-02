import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JIJEL_LAND_BOUNDS } from "../src/lib/geo";
import type { RoadAccessibility } from "../src/lib/locations";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(scriptDir, "..");
const locationsPath = path.join(projectRoot, "src/data/jijel-locations.json");

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Overpass QL: populated settlements strictly inside Wilaya de Jijel (admin_level=4)
const OVERPASS_QUERY = `
[out:json][timeout:180];
area["boundary"="administrative"]["admin_level"="4"]["name:en"="Jijel"]->.searchArea;
(
  node["place"~"village|hamlet|isolated_dwelling|town"](area.searchArea);
);
out body;
`;

type OsmElement = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: OsmElement[];
};

type CommuneRecord = {
  name: string;
  name_ar: string;
  daira: string;
  daira_ar: string;
  lat: number;
  lng: number;
  road_accessibility?: RoadAccessibility;
};

type JijelLocationsFile = {
  province: {
    name: string;
    name_ar: string;
    code: number;
  };
  dairas: Array<{
    name: string;
    name_ar: string;
    communes: Array<{
      name: string;
      name_ar: string;
      lat: number;
      lng: number;
      exact_address_ar?: string;
      landmark?: string;
      road_accessibility?: RoadAccessibility;
    }>;
  }>;
  villages?: Array<{
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
    osm_id?: number;
    place_type?: string;
    name_fr?: string;
  }>;
  osm_meta?: {
    fetched_at: string;
    source: string;
    settlement_count: number;
  };
};

type NormalizedSettlement = {
  osm_id: number;
  name_ar: string;
  name_fr: string;
  place_type: string;
  lat: number;
  lng: number;
  road_accessibility: RoadAccessibility;
};

function haversineKm(
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

function isInsideJijelLand(lat: number, lng: number): boolean {
  return (
    lat >= JIJEL_LAND_BOUNDS.latMin &&
    lat <= JIJEL_LAND_BOUNDS.latMax &&
    lng >= JIJEL_LAND_BOUNDS.lngMin &&
    lng <= JIJEL_LAND_BOUNDS.lngMax
  );
}

function normalizeArabicLabel(value: string): string {
  return value
    .trim()
    .replace(/^(?:دشرة|مشتى|مشتة|قرية|دوار)\s+/u, "")
    .replace(/\s+/g, " ");
}

function mapPlaceToAccessibility(placeType: string): RoadAccessibility {
  if (placeType === "town" || placeType === "village") {
    return "paved_heavy_truck";
  }

  if (placeType === "hamlet") {
    return "light_vehicles";
  }

  return "mountain_4x4_only";
}

function buildCommuneIndex(locations: JijelLocationsFile): CommuneRecord[] {
  const communes: CommuneRecord[] = [];

  for (const daira of locations.dairas) {
    for (const commune of daira.communes) {
      communes.push({
        name: commune.name,
        name_ar: commune.name_ar,
        daira: daira.name,
        daira_ar: daira.name_ar,
        lat: commune.lat,
        lng: commune.lng,
        road_accessibility: commune.road_accessibility,
      });
    }
  }

  return communes;
}

function findNearestCommune(
  lat: number,
  lng: number,
  communes: CommuneRecord[],
): CommuneRecord {
  let nearest = communes[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const commune of communes) {
    const distance = haversineKm(lat, lng, commune.lat, commune.lng);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = commune;
    }
  }

  return nearest;
}

function normalizeSettlements(elements: OsmElement[]): NormalizedSettlement[] {
  const settlements = elements
    .filter((element) => element.type === "node" && element.tags?.place)
    .filter((element) => isInsideJijelLand(element.lat, element.lon))
    .map((element) => {
      const tags = element.tags ?? {};
      const nameAr = normalizeArabicLabel(
        tags["name:ar"] ?? tags.name ?? "مشتى غير مسمى",
      );
      const nameFr =
        tags["name:fr"] ??
        tags["name:en"] ??
        tags.int_name ??
        tags.name ??
        "";

      return {
        osm_id: element.id,
        name_ar: nameAr,
        name_fr: nameFr,
        place_type: tags.place ?? "hamlet",
        lat: Number(element.lat.toFixed(4)),
        lng: Number(element.lon.toFixed(4)),
        road_accessibility: mapPlaceToAccessibility(tags.place ?? "hamlet"),
      };
    });

  const uniqueMap = new Map<string, NormalizedSettlement>();

  for (const settlement of settlements) {
    const key = settlement.name_ar;
    const existing = uniqueMap.get(key);

    if (!existing) {
      uniqueMap.set(key, settlement);
      continue;
    }

    // Prefer town/village over hamlet when names collide.
    const rank = (place: string) =>
      place === "town" ? 3 : place === "village" ? 2 : place === "hamlet" ? 1 : 0;
    if (rank(settlement.place_type) > rank(existing.place_type)) {
      uniqueMap.set(key, settlement);
    }
  }

  return Array.from(uniqueMap.values()).sort((a, b) =>
    a.name_ar.localeCompare(b.name_ar, "ar"),
  );
}

function toVillageRecord(
  settlement: NormalizedSettlement,
  commune: CommuneRecord,
): NonNullable<JijelLocationsFile["villages"]>[number] {
  return {
    name: settlement.name_fr || settlement.name_ar,
    name_ar: settlement.name_ar,
    name_fr: settlement.name_fr || undefined,
    commune: commune.name,
    commune_ar: commune.name_ar,
    daira: commune.daira,
    daira_ar: commune.daira_ar,
    lat: settlement.lat,
    lng: settlement.lng,
    exact_address_ar: `دشرة ${settlement.name_ar}، بلدية ${commune.name_ar}، دائرة ${commune.daira_ar}، ولاية جيجل`,
    landmark: `منعرج دخول دشرة ${settlement.name_ar}`,
    road_accessibility:
      settlement.road_accessibility ??
      commune.road_accessibility ??
      "mountain_4x4_only",
    osm_id: settlement.osm_id,
    place_type: settlement.place_type,
  };
}

async function queryOverpass(): Promise<OverpassResponse> {
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      console.log(`   → ${endpoint} (attempt ${attempt}/3)`);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            "User-Agent": "jijel-recovery/1.0 (jijel-recovery-platform)",
          },
        });

        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}`);
        }

        return (await response.json()) as OverpassResponse;
      } catch (error) {
        lastError =
          error instanceof Error
            ? error
            : new Error("Unknown Overpass fetch error");
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }

  throw new Error(
    `Failed to fetch OSM data from all Overpass endpoints: ${lastError?.message}`,
  );
}

async function fetchJijelSettlements(): Promise<void> {
  console.log("📡 Fetching all settlements from OpenStreetMap Overpass API...");

  const data = await queryOverpass();
  console.log(`✅ Retrieved ${data.elements.length} raw geographic nodes.`);

  const existing = JSON.parse(
    fs.readFileSync(locationsPath, "utf8"),
  ) as JijelLocationsFile;

  const communes = buildCommuneIndex(existing);
  const settlements = normalizeSettlements(data.elements);
  const villages = settlements.map((settlement) =>
    toVillageRecord(
      settlement,
      findNearestCommune(settlement.lat, settlement.lng, communes),
    ),
  );

  const output: JijelLocationsFile = {
    province: existing.province,
    dairas: existing.dairas,
    villages,
    osm_meta: {
      fetched_at: new Date().toISOString(),
      source: "overpass-api.de",
      settlement_count: villages.length,
    },
  };

  fs.writeFileSync(locationsPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `💾 Successfully exported ${villages.length} unique villages/douars to ${locationsPath}`,
  );
}

fetchJijelSettlements().catch((error) => {
  console.error(error);
  process.exit(1);
});
