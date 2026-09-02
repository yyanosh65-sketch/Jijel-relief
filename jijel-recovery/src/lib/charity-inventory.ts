import type {
  CharityAvailability,
  CharityItemCategory,
} from "@/db/schema";

export const CHARITY_CATEGORY_OPTIONS: Array<{
  value: CharityItemCategory;
  labelAr: string;
  icon: string;
}> = [
  { value: "water_equipment", labelAr: "عتاد مائي", icon: "💧" },
  { value: "fodder", labelAr: "أعلاف", icon: "🌾" },
  { value: "building_materials", labelAr: "مواد بناء", icon: "🧱" },
  { value: "food", labelAr: "أغذية", icon: "🥫" },
];

export const CHARITY_AVAILABILITY_OPTIONS: Array<{
  value: CharityAvailability | "in_stock";
  labelAr: string;
}> = [
  { value: "in_stock", labelAr: "متوفر" },
  { value: "available", labelAr: "متوفر بالكامل" },
  { value: "limited", labelAr: "كمية محدودة" },
  { value: "reserved", labelAr: "محجوز" },
  { value: "depleted", labelAr: "نفد المخزون" },
];

export const CHARITY_UNIT_OPTIONS = [
  "وحدة",
  "كيس",
  "طن",
  "لتر",
  "صهريج",
  "رزمة",
  "علبة",
  "شاحنة",
] as const;

export function getCharityCategoryLabel(category: CharityItemCategory): string {
  return (
    CHARITY_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.labelAr ?? category
  );
}

export function getCharityCategoryIcon(category: CharityItemCategory): string {
  return (
    CHARITY_CATEGORY_OPTIONS.find((option) => option.value === category)
      ?.icon ?? "📦"
  );
}

export function getCharityAvailabilityLabel(
  availability: CharityAvailability,
): string {
  return (
    CHARITY_AVAILABILITY_OPTIONS.find((option) => option.value === availability)
      ?.labelAr ?? availability
  );
}

export function parseTargetDouarsInput(value: string): string[] {
  return value
    .split(/[,،\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function formatTargetDouars(douars: string[]): string {
  return douars.length > 0 ? douars.join("، ") : "كل المنطقة";
}
