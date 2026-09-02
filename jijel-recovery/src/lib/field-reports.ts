import type {
  FieldInfrastructureStatus,
  FieldRoadPassability,
} from "@/db/schema";

export type VillageFieldReportTarget = {
  villageAr: string;
  commune: string;
  communeAr: string;
  daira: string;
  dairaAr: string;
  lat: number;
  lng: number;
  population?: number;
  totalFamilies?: number;
  affectedFamilies?: number;
  roadAccessibilityLabel?: string;
};

export const FIELD_ROAD_OPTIONS: Array<{
  value: FieldRoadPassability;
  labelAr: string;
}> = [
  { value: "paved", labelAr: "معبد" },
  { value: "rough_4x4", labelAr: "4x4" },
  { value: "closed", labelAr: "مقطوع" },
];

export const FIELD_INFRASTRUCTURE_OPTIONS: Array<{
  value: FieldInfrastructureStatus;
  labelAr: string;
}> = [
  { value: "normal", labelAr: "طبيعي" },
  { value: "intermittent", labelAr: "متقطع" },
  { value: "cut_off", labelAr: "منقطع" },
  { value: "unknown", labelAr: "غير معروف" },
];

export const URGENT_NEED_OPTIONS = [
  { id: "water_tankers", labelAr: "ماء صهاريج" },
  { id: "livestock_fodder", labelAr: "علف مواشي" },
  { id: "septic_trucks", labelAr: "شاحنات إفراغ" },
  { id: "water_pumps", labelAr: "مضخات" },
] as const;

export type UrgentNeedId = (typeof URGENT_NEED_OPTIONS)[number]["id"];

export function getFieldRoadLabel(value: FieldRoadPassability): string {
  return FIELD_ROAD_OPTIONS.find((option) => option.value === value)?.labelAr ?? value;
}

export function getFieldInfrastructureLabel(
  value: FieldInfrastructureStatus,
): string {
  return (
    FIELD_INFRASTRUCTURE_OPTIONS.find((option) => option.value === value)
      ?.labelAr ?? value
  );
}

export function getUrgentNeedLabel(id: string): string {
  return (
    URGENT_NEED_OPTIONS.find((option) => option.id === id)?.labelAr ?? id
  );
}

export function buildFieldReportLocationKey(input: {
  villageAr: string;
  communeAr: string;
  dairaAr: string;
}): string {
  return [input.villageAr, input.communeAr, input.dairaAr]
    .map((part) => part.trim())
    .join("|");
}
