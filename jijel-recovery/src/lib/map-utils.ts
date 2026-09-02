import type { NeedCategory, NeedUrgency } from "@/db/schema";
import type { NeedWithRelations } from "@/actions/needs";

export const JIJEL_CENTER = {
  lat: 36.8205,
  lng: 5.7667,
} as const;

export const DEFAULT_MAP_ZOOM = 11;

export const MAP_TILE_LAYER = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
} as const;

export type MapCategoryId = "olive_trees" | "livestock" | "shelter" | "tools";

export type MapCategory = {
  id: MapCategoryId;
  labelAr: string;
};

export const MAP_CATEGORIES: MapCategory[] = [
  { id: "olive_trees", labelAr: "غراسة الزيتون 🌱" },
  { id: "livestock", labelAr: "المواشي وخلايا النحل 🐑" },
  { id: "shelter", labelAr: "ترميم الديار 🏠" },
  { id: "tools", labelAr: "موتورات الما والعتاد ⚙️" },
];

export type MarkerColor = "red" | "orange" | "green";

const URGENCY_SCORE: Record<NeedUrgency, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const CATEGORY_HINTS: Record<MapCategoryId, NeedCategory[]> = {
  olive_trees: ["other"],
  livestock: ["food"],
  shelter: ["shelter"],
  tools: ["transport"],
};

const TITLE_KEYWORDS: Record<MapCategoryId, string[]> = {
  olive_trees: ["olive", "tree", "arbre", "زيتون", "شتلة", "غراسة", "كستناء"],
  livestock: [
    "livestock",
    "sheep",
    "goat",
    "cattle",
    "bétail",
    "mouton",
    "bee",
    "نحل",
    "apiculture",
    "أعلاف",
    "غنم",
    "مواشي",
    "بيطر",
  ],
  shelter: ["shelter", "housing", "home", "abri", "سقف", "أسقف", "زنك", "إسمنت", "ترميم"],
  tools: [
    "tool",
    "equipment",
    "outil",
    "matériel",
    "pump",
    "مضخة",
    "آلة",
    "عتاد",
    "أنابيب",
    "خراطيم",
    "صهريج",
    "خزان",
  ],
};

export function getUrgencyScore(urgency: NeedUrgency): number {
  return URGENCY_SCORE[urgency];
}

export function getMapCategory(need: Pick<NeedWithRelations, "title" | "category">): MapCategoryId {
  const title = need.title.toLowerCase();

  for (const category of MAP_CATEGORIES) {
    const keywords = TITLE_KEYWORDS[category.id];
    if (keywords.some((keyword) => title.includes(keyword))) {
      return category.id;
    }
  }

  for (const category of MAP_CATEGORIES) {
    if (CATEGORY_HINTS[category.id].includes(need.category)) {
      return category.id;
    }
  }

  return "tools";
}

export function getMarkerColor(
  need: Pick<
    NeedWithRelations,
    "urgency" | "status" | "pledges" | "quantityNeeded" | "quantityFulfilled"
  >,
): MarkerColor {
  if (
    need.status === "fulfilled" ||
    need.quantityFulfilled >= need.quantityNeeded
  ) {
    return "green";
  }

  const hasActivePledges = need.pledges.some(
    (pledge) => pledge.status !== "cancelled",
  );

  if (need.status === "partial" || hasActivePledges) {
    return "orange";
  }

  const urgencyScore = getUrgencyScore(need.urgency);

  if (need.urgency === "critical" || urgencyScore >= 4) {
    return "red";
  }

  if (need.urgency === "medium" || need.urgency === "high") {
    return "orange";
  }

  return "orange";
}

export function matchesMapCategories(
  need: Pick<NeedWithRelations, "title" | "category">,
  activeCategories: Set<MapCategoryId>,
): boolean {
  return activeCategories.has(getMapCategory(need));
}
