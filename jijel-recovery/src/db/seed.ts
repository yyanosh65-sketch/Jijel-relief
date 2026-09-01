import "dotenv/config";

import { sql } from "drizzle-orm";

import { db } from "./index";
import { emergencyFacilities } from "./schema";

type FacilitySeed = {
  name: string;
  facilityType: "civil_protection" | "veterinary_clinic" | "forest_conservancy";
  commune: string;
  coordinates: { lat: number; lng: number };
  hotlinePhone: string;
  secondaryPhone?: string;
  availableServices: string[];
};

const FACILITY_SEEDS: FacilitySeed[] = [
  {
    name: "الحماية المدنية - الوحدة الرئيسية جيجل",
    facilityType: "civil_protection",
    commune: "Jijel",
    coordinates: { lat: 36.8122, lng: 5.7601 },
    hotlinePhone: "14",
    secondaryPhone: "034471010",
    availableServices: ["rescue", "fire_control", "ambulance"],
  },
  {
    name: "المفتشية البيطرية الولائية - فرع الطاهير",
    facilityType: "veterinary_clinic",
    commune: "Taher",
    coordinates: { lat: 36.7741, lng: 5.8921 },
    hotlinePhone: "034482030",
    secondaryPhone: "0550123456",
    availableServices: [
      "mobile_vet_truck",
      "burn_wound_treatment",
      "vaccination",
    ],
  },
  {
    name: "محافظة الغابات - مقاطعة العوانة",
    facilityType: "forest_conservancy",
    commune: "El Aouana",
    coordinates: { lat: 36.7712, lng: 5.5492 },
    hotlinePhone: "034491122",
    availableServices: ["track_opening", "firebreak_patrol"],
  },
];

function toGeographyPoint(coordinates: { lat: number; lng: number }) {
  return sql`ST_SetSRID(ST_MakePoint(${coordinates.lng}, ${coordinates.lat}), 4326)::geography`;
}

async function seed() {
  const existing = await db.select({ id: emergencyFacilities.id }).from(emergencyFacilities);

  if (existing.length > 0) {
    console.log("Emergency facilities already seeded. Skipping.");
    return;
  }

  await db.insert(emergencyFacilities).values(
    FACILITY_SEEDS.map((facility) => ({
      name: facility.name,
      facilityType: facility.facilityType,
      commune: facility.commune,
      coordinates: toGeographyPoint(facility.coordinates),
      hotlinePhone: facility.hotlinePhone,
      secondaryPhone: facility.secondaryPhone ?? null,
      availableServices: facility.availableServices,
    })),
  );

  console.log("Seed completed.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
