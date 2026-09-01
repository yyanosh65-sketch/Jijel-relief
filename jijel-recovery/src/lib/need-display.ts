import type { MapNeed } from "@/actions/needs";
import { getCommuneArabicName, getDairaArabicName } from "@/lib/locations";

/** Known English seed titles → Arabic display labels */
const NEED_TITLE_TRANSLATIONS: Record<string, string> = {
  "Drinking water tanks": "صهاريج ومضخات ماء الشرب",
  "Agricultural tools kits": "عتاد فلاحي وأنابيب سقي",
  "Roofing sheets for homes": "صفائح وقرميد لترميم الأسقف",
  "Olive trees for damaged orchards": "غراسة زيتون لبساتين متضررة",
  "Sheep for affected herders": "أغنام لصغار المربين المتضررين",
};

const ENGLISH_TITLE_PATTERN = /^[A-Za-z0-9\s.,'()-]+$/;

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

export function formatNeedLocationArabic(need: MapNeed): string {
  const communeAr = getCommuneArabicName(need.location.name);
  const dairaAr = getDairaArabicName(need.location.daira);

  if (communeAr === dairaAr) {
    return `دائرة ${dairaAr}`;
  }

  return `${communeAr} · دائرة ${dairaAr}`;
}
