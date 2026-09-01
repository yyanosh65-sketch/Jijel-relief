import type {
  ConvoyCargoType,
  ConvoyEntryPoint,
  ConvoyVehicleType,
} from "@/db/schema";
import { enrichConvoyDestination } from "@/lib/agent/coordinator-knowledge";
import { findHighestDeficitZone } from "@/lib/agent/deficit";
import { CONVOY_ENTRY_OPTIONS } from "@/lib/convoys";

export type CargoRouteRecommendation = {
  found: boolean;
  message?: string;
  destination?: {
    commune: string;
    communeAr: string;
    daira: string;
    dairaAr: string;
    deficitUnits: number;
    urgencyScore: number;
    rationale: string;
  };
  recommendedEntryPoint?: ConvoyEntryPoint;
  recommendedEntryPointAr?: string;
  terrain?: {
    labelAr: string;
    vehicleRecommendationAr: string;
    requires4x4: boolean;
    allowsHeavyTruck: boolean;
  };
  localCoordinator?: {
    nameAr: string;
    phone: string;
    verified: boolean;
    roleAr: string;
  } | null;
  entranceCoordinator?: {
    nameAr: string;
    phone: string;
    whatsapp: string;
    entryPointAr: string;
    notes: string;
  } | null;
  vehicleWarningAr?: string | null;
  briefingAr?: string;
  matchingNeeds?: Array<{
    id: number;
    title: string;
    remaining: number;
    urgency: string;
  }>;
};

export async function routeCargoConvoy(input: {
  cargoType: ConvoyCargoType;
  vehicleType?: ConvoyVehicleType;
  preferredEntryPoint?: ConvoyEntryPoint;
}): Promise<CargoRouteRecommendation> {
  const zone = await findHighestDeficitZone(input.cargoType);

  if (!zone) {
    return {
      found: false,
      message: "ما لقيناش عجز مطابق دابا — راجع المستودع الولائي في جيجل.",
    };
  }

  const entryPoint =
    input.preferredEntryPoint ?? (zone.recommendedEntryPoint as ConvoyEntryPoint);
  const entryLabel =
    CONVOY_ENTRY_OPTIONS.find((option) => option.value === entryPoint)
      ?.labelAr ?? zone.recommendedEntryPointAr;

  const enrichment = enrichConvoyDestination({
    commune: zone.commune,
    daira: zone.daira,
    recommendedEntryPoint: entryPoint,
    recommendedEntryPointAr: entryLabel,
  });

  let vehicleWarningAr: string | null = null;
  if (input.vehicleType === "truck" && enrichment.terrain.requires4x4) {
    vehicleWarningAr =
      "⚠️ الشاحنة الثقيلة ما تقدرش توصل للوجهة مباشرة — لازم تفريغ عند نقطة التجميع و4x4 يكمّل.";
  } else if (input.vehicleType === "pickup_4x4" && enrichment.terrain.allowsHeavyTruck) {
    vehicleWarningAr = null;
  }

  const coordinatorLine = enrichment.localCoordinator
    ? `${enrichment.localCoordinator.nameAr} (${enrichment.localCoordinator.phone})`
    : "تواصل مع نقطة الاستقبال عند المدخل";

  const briefingAr = [
    `الوجهة الأكثر استعجالاً: ${enrichment.communeAr} — دائرة ${enrichment.dairaAr}`,
    `العجز: ${zone.deficitUnits} وحدة`,
    `المدخل الأمثل: ${entryLabel}`,
    enrichment.terrain.vehicleRecommendationAr,
    `المنسّق المحلي: ${coordinatorLine}`,
    vehicleWarningAr,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    found: true,
    destination: {
      commune: zone.commune,
      communeAr: enrichment.communeAr,
      daira: zone.daira,
      dairaAr: enrichment.dairaAr,
      deficitUnits: zone.deficitUnits,
      urgencyScore: zone.urgencyScore,
      rationale: zone.rationale,
    },
    recommendedEntryPoint: entryPoint,
    recommendedEntryPointAr: entryLabel,
    terrain: enrichment.terrain,
    localCoordinator: enrichment.localCoordinator,
    entranceCoordinator: enrichment.entranceCoordinator,
    vehicleWarningAr,
    briefingAr,
    matchingNeeds: zone.matchingNeeds,
  };
}
