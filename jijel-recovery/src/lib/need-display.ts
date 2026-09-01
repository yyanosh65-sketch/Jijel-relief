import type { MapNeed } from "@/actions/needs";
import type { NeedUrgency } from "@/db/schema";
import { getCommuneArabicName, getDairaArabicName } from "@/lib/locations";
import { getDossierByLocation, type RoadPassability } from "@/lib/intelligence";
import {
  getMapCategory,
  MAP_CATEGORIES,
  type MapCategoryId,
} from "@/lib/map-utils";

const CATEGORY_ICONS: Record<MapCategoryId, string> = {
  olive_trees: "🌱",
  livestock: "🐑",
  shelter: "🏠",
  tools: "⚙️",
};

const URGENCY_BADGES: Record<
  NeedUrgency,
  { label: string; className: string }
> = {
  critical: {
    label: "عاجل جداً",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  high: {
    label: "أولوية قصوى",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  medium: {
    label: "أولوية متوسطة",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  low: {
    label: "عادي",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const ROAD_BADGES: Record<
  RoadPassability,
  { label: string; className: string }
> = {
  open: {
    label: "سالك",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  rough_4x4: {
    label: "طريق جبلي 4x4",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  closed: {
    label: "مسلك مغلق",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

/** Known English seed titles → Arabic display labels */
const NEED_TITLE_TRANSLATIONS: Record<string, string> = {
  "Drinking water tanks": "صهاريج ومضخات ماء الشرب",
  "Agricultural tools kits": "عتاد فلاحي وأنابيب سقي",
  "Roofing sheets for homes": "صفائح وقرميد لترميم الأسقف",
  "Olive trees for damaged orchards": "غراسة زيتون لبساتين متضررة",
  "Sheep for affected herders": "أغنام لصغار المربين المتضررين",
};

const ENGLISH_TITLE_PATTERN = /^[A-Za-z0-9\s.,'+-]+$/;

export function translateNeedTitle(title: string): string {
  const trimmed = title.trim();
  const translated = NEED_TITLE_TRANSLATIONS[trimmed];

  if (translated) {
    return translated;
  }

  if (!ENGLISH_TITLE_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

export function getNeedCategoryIcon(
  need: Pick<MapNeed, "title" | "category">,
): string {
  return CATEGORY_ICONS[getMapCategory(need)];
}

export function getNeedCategoryLabel(
  need: Pick<MapNeed, "title" | "category">,
): string {
  const categoryId = getMapCategory(need);
  return MAP_CATEGORIES.find((category) => category.id === categoryId)?.labelAr ?? "";
}

export function getNeedUrgencyBadge(urgency: NeedUrgency) {
  return URGENCY_BADGES[urgency];
}

export function getNeedRoadBadge(need: MapNeed) {
  const dossier =
    getDossierByLocation(need.location.name, "commune") ??
    getDossierByLocation(need.location.daira, "daira");

  if (!dossier) {
    return null;
  }

  return ROAD_BADGES[dossier.roadPassability];
}

export function formatNeedLocationArabic(need: MapNeed): string {
  const communeAr = getCommuneArabicName(need.location.name);
  const dairaAr = getDairaArabicName(need.location.daira);
  const douar = need.location.address?.trim();

  const parts = [
    douar && douar !== need.location.name ? douar : null,
    communeAr,
    `دائرة ${dairaAr}`,
  ].filter(Boolean);

  return parts.join(" · ");
}
