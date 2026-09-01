import intelligenceData from "@/data/village-intelligence.json";
import { getAllVillages } from "@/lib/locations";

export type RoadPassability = "open" | "rough_4x4" | "closed";
export type InfrastructureStatus = "normal" | "intermittent" | "partial" | "cut_off";
export type FacilityType = "veterinary" | "civil_protection";
export type PinType = "commune" | "daira";

export type VillageDossier = {
  id: string;
  type: PinType;
  name: string;
  name_ar: string;
  daira: string;
  daira_ar: string;
  lat: number;
  lng: number;
  population: number;
  totalFamilies: number;
  affectedFamilies: number;
  damagePercent: number;
  roadPassability: RoadPassability;
  waterStatus: InfrastructureStatus;
  electricityStatus: InfrastructureStatus;
  coordinator: {
    name: string;
    name_ar: string;
    phone: string;
    verified: boolean;
  };
};

export type EmergencyFacility = {
  id: string;
  type: FacilityType;
  name: string;
  name_ar: string;
  phone: string;
  lat: number;
  lng: number;
  commune: string;
  daira: string;
};

export type RoadAccessPoint = {
  id: string;
  name: string;
  name_ar: string;
  passability: RoadPassability;
  lat: number;
  lng: number;
  notes: string;
};

export type VillageIntelligence = {
  dossiers: VillageDossier[];
  facilities: EmergencyFacility[];
  roads: RoadAccessPoint[];
};

export const villageIntelligence = intelligenceData as VillageIntelligence;

export const ROAD_PASSABILITY_LABELS: Record<
  RoadPassability,
  { ar: string; fr: string }
> = {
  open: { ar: "مفتوح لكل المركبات", fr: "Open to all vehicles" },
  rough_4x4: { ar: "مسلك وعر (4x4 فقط)", fr: "Rough track (4x4 only)" },
  closed: { ar: "طريق مقطوع", fr: "Road closed" },
};

export const INFRASTRUCTURE_LABELS: Record<
  InfrastructureStatus,
  { ar: string; fr: string }
> = {
  normal: { ar: "طبيعي", fr: "Normal" },
  intermittent: { ar: "متقطع", fr: "Intermittent" },
  partial: { ar: "جزئي", fr: "Partial" },
  cut_off: { ar: "منقطع", fr: "Cut off" },
};

export const SOS_EMERGENCY_OPTIONS = [
  {
    value: "fire_flare" as const,
    labelAr: "اشتعال حرائق",
    labelFr: "Fire flare-up",
    icon: "🔥",
  },
  {
    value: "livestock_trap" as const,
    labelAr: "مواشي محاصرة",
    labelFr: "Livestock trap",
    icon: "🐑",
  },
  {
    value: "medical" as const,
    labelAr: "حالة طبية عاجلة",
    labelFr: "Medical emergency",
    icon: "🏥",
  },
  {
    value: "water_cutoff" as const,
    labelAr: "انقطاع الماء",
    labelFr: "Water cut-off",
    icon: "💧",
  },
];

export function getDossierById(id: string): VillageDossier | null {
  return villageIntelligence.dossiers.find((dossier) => dossier.id === id) ?? null;
}

export function getDossierByLocation(
  name: string,
  type?: PinType,
): VillageDossier | null {
  const normalized = name.trim().toLowerCase();

  return (
    villageIntelligence.dossiers.find(
      (dossier) =>
        (type ? dossier.type === type : true) &&
        (dossier.name.toLowerCase() === normalized ||
          dossier.name_ar === name ||
          dossier.daira.toLowerCase() === normalized),
    ) ?? null
  );
}

export function getNearbyFacilities(
  dossier: VillageDossier,
  radiusKm = 25,
): EmergencyFacility[] {
  return villageIntelligence.facilities.filter((facility) => {
    const distance = haversineKm(
      dossier.lat,
      dossier.lng,
      facility.lat,
      facility.lng,
    );
    return (
      distance <= radiusKm ||
      facility.daira === dossier.daira ||
      facility.commune === dossier.name
    );
  });
}

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

export function buildVillagePins(): VillageDossier[] {
  const dossierIds = new Set(villageIntelligence.dossiers.map((d) => d.id));
  const fromLocations: VillageDossier[] = getAllVillages()
    .filter(
      (village) =>
        !dossierIds.has(
          `${village.commune}-${village.name_ar}`.toLowerCase().replace(/\s+/g, "-"),
        ),
    )
    .map((village) => ({
      id: `village-${village.commune}-${village.name_ar}`
        .toLowerCase()
        .replace(/[^\w\u0600-\u06FF-]+/g, "-"),
      type: "commune" as const,
      name: village.commune,
      name_ar: village.name_ar,
      daira: village.daira,
      daira_ar: village.daira_ar,
      lat: village.lat,
      lng: village.lng,
      population: 0,
      totalFamilies: 0,
      affectedFamilies: 0,
      damagePercent: 0,
      roadPassability:
        village.road_accessibility === "paved_heavy_truck"
          ? ("open" as const)
          : village.road_accessibility === "light_vehicles"
            ? ("rough_4x4" as const)
            : ("rough_4x4" as const),
      waterStatus: "intermittent" as const,
      electricityStatus: "intermittent" as const,
      coordinator: {
        name: village.commune,
        name_ar: `لجنة ${village.name_ar}`,
        phone: "",
        verified: false,
      },
    }));

  return [...villageIntelligence.dossiers, ...fromLocations];
}
