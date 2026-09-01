import {
  getCommuneArabicName,
  getCommuneLocationMeta,
  getDairaArabicName,
  type RoadAccessibility,
} from "@/lib/locations";
import { ROAD_PASSABILITY_LABELS, type RoadPassability } from "@/lib/intelligence";
import { RELIEF_CONTACT_BADGES, type JsonReliefContactCategory } from "@/lib/relief-contacts";
import { WAYPOINT_TYPE_LABELS, type WaypointType } from "@/lib/convoys";

export type { RoadAccessibility };

export const ROAD_ACCESSIBILITY_LABELS: Record<RoadAccessibility, string> = {
  paved_heavy_truck: "طريق معبد (شاحنات ثقيلة)",
  mountain_4x4_only: "مسلك وعر — 4x4 فقط",
  light_vehicles: "منعرجات جبلية — مركبات خفيفة",
};

export function roadPassabilityToAccessibility(
  passability: RoadPassability,
): RoadAccessibility {
  switch (passability) {
    case "open":
      return "paved_heavy_truck";
    case "rough_4x4":
      return "mountain_4x4_only";
    case "closed":
      return "light_vehicles";
    default:
      return "mountain_4x4_only";
  }
}

export function buildGoogleMapsDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(4)},${lng.toFixed(4)}`;
}

export function formatAddressHierarchy(input: {
  dairaAr: string;
  communeAr: string;
  douarOrLandmark?: string;
}): string {
  return [
    "ولاية جيجل",
    `دائرة ${input.dairaAr}`,
    `بلدية ${input.communeAr}`,
    input.douarOrLandmark,
  ]
    .filter(Boolean)
    .join(" > ");
}

export function resolveCommuneMapDetails(
  commune: string,
  daira: string,
  fallbackDouar?: string,
) {
  const meta = getCommuneLocationMeta(commune, daira);
  const communeAr = getCommuneArabicName(commune);
  const dairaAr = getDairaArabicName(daira);

  return {
    communeAr,
    dairaAr,
    exactAddressAr: meta?.exact_address_ar,
    landmark: meta?.landmark ?? fallbackDouar,
    roadAccessibility: meta?.road_accessibility ?? "paved_heavy_truck",
    lat: meta?.lat,
    lng: meta?.lng,
    addressHierarchy: formatAddressHierarchy({
      dairaAr,
      communeAr,
      douarOrLandmark: meta?.landmark ?? fallbackDouar,
    }),
    roadLabel:
      ROAD_ACCESSIBILITY_LABELS[
        meta?.road_accessibility ?? "paved_heavy_truck"
      ],
  };
}

export const MAP_POINT_TYPE_LABELS = {
  need: "دشرة / احتياج متضرر",
  sos: "نداء استغاثة عاجل",
  village: "دشرة متضررة",
  daira: "دائرة إدارية",
  facility: "مرفق رسمي / بيطري",
  road: "نقطة مراقبة مسلك",
  waypoint_reception: "نقطة استقبال قوافل",
  waypoint_lodging: "مبيت وإيواء",
  waypoint_kitchen: "مطبخ تضامني",
  waypoint_fuel: "محطة وقود",
  waypoint_warehouse: "مستودع إغاثة",
  relief_hub: "مستودع إغاثة",
  field_team: "فريق ميداني / 4x4",
  village_lead: "لجنة قرية / دوار",
} as const;

export function getWaypointPointTypeLabel(type: WaypointType): string {
  if (type === "reception") {
    return MAP_POINT_TYPE_LABELS.waypoint_reception;
  }
  if (type === "lodging") {
    return MAP_POINT_TYPE_LABELS.waypoint_lodging;
  }
  if (type === "kitchen") {
    return MAP_POINT_TYPE_LABELS.waypoint_kitchen;
  }
  if (type === "fuel") {
    return MAP_POINT_TYPE_LABELS.waypoint_fuel;
  }
  return MAP_POINT_TYPE_LABELS.waypoint_warehouse;
}

export function getReliefContactPointTypeLabel(
  category: JsonReliefContactCategory,
): string {
  return RELIEF_CONTACT_BADGES[category] === "مستودع"
    ? MAP_POINT_TYPE_LABELS.relief_hub
    : category === "field_team"
      ? MAP_POINT_TYPE_LABELS.field_team
      : MAP_POINT_TYPE_LABELS.village_lead;
}

export function getRoadPassabilityLabel(passability: RoadPassability): string {
  return ROAD_PASSABILITY_LABELS[passability]?.ar ?? passability;
}

export function getWaypointTypeIcon(type: WaypointType): string {
  return WAYPOINT_TYPE_LABELS[type]?.icon ?? "📍";
}
