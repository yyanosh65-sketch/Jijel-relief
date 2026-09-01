import type { MapNeed } from "@/actions/needs";
import type { MapIntelligenceData } from "@/actions/intelligence";
import type { NeedUrgency } from "@/db/schema";
import {
  getCommuneArabicName,
  getDairaArabicName,
} from "@/lib/locations";
import { getDossierByLocation, type RoadPassability } from "@/lib/intelligence";
import {
  getUrgencyScore,
  matchesMapCategories,
  type MapCategoryId,
} from "@/lib/map-utils";
import { haversineKm } from "@/lib/geo";

export type NeedSearchCategoryId = MapCategoryId;

export type UrgencyFilterGroup = "critical" | "medium" | "low";

export type NeedSortOption = "closest" | "urgent" | "fulfillment";

export type NeedSearchFilters = {
  query: string;
  categories: NeedSearchCategoryId[];
  urgencyGroups: UrgencyFilterGroup[];
  roadAccess: RoadPassability[];
  radiusKm: number;
  userLat: number | null;
  userLng: number | null;
  sort: NeedSortOption;
};

export const SEARCH_CATEGORY_OPTIONS: Array<{
  id: NeedSearchCategoryId;
  labelAr: string;
}> = [
  { id: "olive_trees", labelAr: "غراسة الزيتون 🌱" },
  { id: "livestock", labelAr: "المواشي وخلايا النحل 🐑" },
  { id: "shelter", labelAr: "ترميم الديار 🏠" },
  { id: "tools", labelAr: "موتورات الما والعتاد ⚙️" },
];

export const URGENCY_FILTER_OPTIONS: Array<{
  id: UrgencyFilterGroup;
  labelAr: string;
}> = [
  { id: "critical", labelAr: "عاجل جداً / أولوية قصوى" },
  { id: "medium", labelAr: "متوسط" },
  { id: "low", labelAr: "عادي" },
];

export const ROAD_ACCESS_OPTIONS: Array<{
  id: RoadPassability;
  labelAr: string;
}> = [
  { id: "open", labelAr: "مفتوح للجميع" },
  { id: "rough_4x4", labelAr: "4x4 فقط" },
  { id: "closed", labelAr: "مسلك وعر" },
];

export const SORT_OPTIONS: Array<{
  id: NeedSortOption;
  labelAr: string;
}> = [
  { id: "closest", labelAr: "الأقرب لموقعي" },
  { id: "urgent", labelAr: "الأكثر إلحاحاً" },
  { id: "fulfillment", labelAr: "نسبة التكفل الأقل" },
];

const DEFAULT_FILTERS: NeedSearchFilters = {
  query: "",
  categories: SEARCH_CATEGORY_OPTIONS.map((option) => option.id),
  urgencyGroups: URGENCY_FILTER_OPTIONS.map((option) => option.id),
  roadAccess: ROAD_ACCESS_OPTIONS.map((option) => option.id),
  radiusKm: 50,
  userLat: null,
  userLng: null,
  sort: "urgent",
};

const URGENCY_BY_GROUP: Record<UrgencyFilterGroup, NeedUrgency[]> = {
  critical: ["critical", "high"],
  medium: ["medium"],
  low: ["low"],
};

function parseListParam<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T[],
): T[] {
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is T => allowed.includes(entry as T));

  return parsed.length > 0 ? parsed : fallback;
}

function parseNumberParam(
  value: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function parseNeedSearchParams(
  searchParams: URLSearchParams,
): NeedSearchFilters {
  const categoryIds = SEARCH_CATEGORY_OPTIONS.map((option) => option.id);
  const urgencyIds = URGENCY_FILTER_OPTIONS.map((option) => option.id);
  const roadIds = ROAD_ACCESS_OPTIONS.map((option) => option.id);
  const sortIds = SORT_OPTIONS.map((option) => option.id);

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  return {
    query: searchParams.get("q") ?? "",
    categories: parseListParam(
      searchParams.get("categories"),
      categoryIds,
      DEFAULT_FILTERS.categories,
    ),
    urgencyGroups: parseListParam(
      searchParams.get("urgency"),
      urgencyIds,
      DEFAULT_FILTERS.urgencyGroups,
    ),
    roadAccess: parseListParam(
      searchParams.get("road"),
      roadIds,
      DEFAULT_FILTERS.roadAccess,
    ),
    radiusKm: parseNumberParam(searchParams.get("radius"), 50, 1, 50),
    userLat: lat ? Number(lat) : null,
    userLng: lng ? Number(lng) : null,
    sort: parseListParam(searchParams.get("sort"), sortIds, ["urgent"])[0],
  };
}

export function buildNeedSearchParams(
  filters: NeedSearchFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query.trim()) {
    params.set("q", filters.query.trim());
  }

  if (filters.categories.length !== SEARCH_CATEGORY_OPTIONS.length) {
    params.set("categories", filters.categories.join(","));
  }

  if (filters.urgencyGroups.length !== URGENCY_FILTER_OPTIONS.length) {
    params.set("urgency", filters.urgencyGroups.join(","));
  }

  if (filters.roadAccess.length !== ROAD_ACCESS_OPTIONS.length) {
    params.set("road", filters.roadAccess.join(","));
  }

  if (filters.radiusKm !== 50) {
    params.set("radius", String(filters.radiusKm));
  }

  if (filters.userLat !== null && filters.userLng !== null) {
    params.set("lat", filters.userLat.toFixed(6));
    params.set("lng", filters.userLng.toFixed(6));
  }

  if (filters.sort !== "urgent") {
    params.set("sort", filters.sort);
  }

  return params;
}

function getRoadPassabilityForNeed(need: MapNeed): RoadPassability | null {
  const dossier =
    getDossierByLocation(need.location.name, "commune") ??
    getDossierByLocation(need.location.name) ??
    getDossierByLocation(need.location.daira, "daira") ??
    getDossierByLocation(need.location.daira);

  return dossier?.roadPassability ?? null;
}

function matchesTextQuery(need: MapNeed, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const communeAr = getCommuneArabicName(need.location.name);
  const dairaAr = getDairaArabicName(need.location.daira);

  const haystack = [
    need.title,
    need.description,
    need.location.name,
    need.location.daira,
    need.location.address ?? "",
    communeAr,
    dairaAr,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesUrgencyGroups(
  urgency: NeedUrgency,
  groups: UrgencyFilterGroup[],
): boolean {
  const allowed = new Set(
    groups.flatMap((group) => URGENCY_BY_GROUP[group] ?? []),
  );

  return allowed.has(urgency);
}

function getFulfillmentRatio(need: MapNeed): number {
  if (need.quantityNeeded <= 0) {
    return 0;
  }

  return need.quantityFulfilled / need.quantityNeeded;
}

function getNeedDistanceKm(
  need: MapNeed,
  userLat: number,
  userLng: number,
): number {
  return haversineKm(userLat, userLng, need.lat, need.lng);
}

export function filterAndSortNeeds(
  needs: MapNeed[],
  filters: NeedSearchFilters,
  _intelligence?: MapIntelligenceData,
): MapNeed[] {
  const activeCategories = new Set(filters.categories);
  const hasGps =
    filters.userLat !== null &&
    filters.userLng !== null &&
    !Number.isNaN(filters.userLat) &&
    !Number.isNaN(filters.userLng);

  let results = needs.filter((need) => {
    if (!matchesTextQuery(need, filters.query)) {
      return false;
    }

    if (!matchesMapCategories(need, activeCategories)) {
      return false;
    }

    if (!matchesUrgencyGroups(need.urgency, filters.urgencyGroups)) {
      return false;
    }

    const roadPassability = getRoadPassabilityForNeed(need);

    if (
      roadPassability &&
      filters.roadAccess.length > 0 &&
      !filters.roadAccess.includes(roadPassability)
    ) {
      return false;
    }

    if (hasGps) {
      const distanceKm = getNeedDistanceKm(
        need,
        filters.userLat!,
        filters.userLng!,
      );

      if (distanceKm > filters.radiusKm) {
        return false;
      }
    }

    return true;
  });

  results = [...results].sort((left, right) => {
    if (filters.sort === "closest" && hasGps) {
      return (
        getNeedDistanceKm(left, filters.userLat!, filters.userLng!) -
        getNeedDistanceKm(right, filters.userLat!, filters.userLng!)
      );
    }

    if (filters.sort === "fulfillment") {
      return getFulfillmentRatio(left) - getFulfillmentRatio(right);
    }

    return getUrgencyScore(right.urgency) - getUrgencyScore(left.urgency);
  });

  return results;
}

export function getDefaultNeedSearchFilters(): NeedSearchFilters {
  return { ...DEFAULT_FILTERS };
}
