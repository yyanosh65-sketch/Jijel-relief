import "dotenv/config";

import { db } from "../index";
import { communityFacilities } from "../schema";

type FacilitySeed = {
  name: string;
  nameAr: string;
  facilityType:
    | "mosque_operational"
    | "mosque_damaged"
    | "zawiya_sanctuary"
    | "water_spring"
    | "oxygen_generator"
    | "cold_chain_pharma";
  commune: string;
  communeAr?: string;
  daira?: string;
  lat: number;
  lng: number;
  hasWaterTank: boolean;
  hasPowerGenerator: boolean;
  shelterCapacityPeople?: number;
  coordinatorPhone?: string;
  notes?: string;
};

const COMMUNITY_FACILITY_SEEDS: FacilitySeed[] = [
  // ── Mosques & Shelters ──────────────────────────────────────────────────────

  // Texenna
  {
    name: "Masjid Al-Fath - Shelter & Distribution Hub",
    nameAr: "مسجد الفتح - مركز إيواء وتوزيع",
    facilityType: "mosque_operational",
    commune: "Texenna",
    communeAr: "تاكسنة",
    daira: "Texenna",
    lat: 36.6651,
    lng: 5.7814,
    hasWaterTank: true,
    hasPowerGenerator: true,
    shelterCapacityPeople: 120,
    coordinatorPhone: "0555123456",
    notes: "مركز توزيع مواد إغاثة + إيواء ليلي للمتضررين",
  },
  {
    name: "Masjid Al-Nour - Texenna Center",
    nameAr: "مسجد النور - وسط تاكسنة",
    facilityType: "mosque_operational",
    commune: "Texenna",
    communeAr: "تاكسنة",
    daira: "Texenna",
    lat: 36.6680,
    lng: 5.7845,
    hasWaterTank: true,
    hasPowerGenerator: false,
    shelterCapacityPeople: 80,
    coordinatorPhone: "0555234567",
  },

  // Taher
  {
    name: "Masjid Al-Rahma - Taher Grand Mosque",
    nameAr: "مسجد الرحمة الكبير - الطاهير",
    facilityType: "mosque_operational",
    commune: "Taher",
    communeAr: "الطاهير",
    daira: "Taher",
    lat: 36.7702,
    lng: 5.8988,
    hasWaterTank: true,
    hasPowerGenerator: true,
    shelterCapacityPeople: 200,
    coordinatorPhone: "0555345678",
    notes: "أكبر مركز إيواء في الطاهير",
  },
  {
    name: "Masjid Al-Taqwa - Taher South",
    nameAr: "مسجد التقوى - جنوب الطاهير",
    facilityType: "mosque_damaged",
    commune: "Taher",
    communeAr: "الطاهير",
    daira: "Taher",
    lat: 36.7620,
    lng: 5.9050,
    hasWaterTank: false,
    hasPowerGenerator: false,
    shelterCapacityPeople: 0,
    notes: "تضرر جزئياً من الحرائق — غير صالح للإيواء حالياً",
  },

  // El Milia
  {
    name: "Zaouia Sidi Boumediene - El Milia",
    nameAr: "زاوية سيدي بومدين - الميلية",
    facilityType: "zawiya_sanctuary",
    commune: "El Milia",
    communeAr: "الميلية",
    daira: "El Milia",
    lat: 36.7513,
    lng: 6.2681,
    hasWaterTank: true,
    hasPowerGenerator: true,
    shelterCapacityPeople: 60,
    coordinatorPhone: "0555456789",
    notes: "ملجأ تاريخي — يُستعمل كمركز إيواء مؤقت",
  },
  {
    name: "Masjid Al-Ihsane - El Milia",
    nameAr: "مسجد الإحسان - الميلية",
    facilityType: "mosque_operational",
    commune: "El Milia",
    communeAr: "الميلية",
    daira: "El Milia",
    lat: 36.7530,
    lng: 6.2710,
    hasWaterTank: true,
    hasPowerGenerator: false,
    shelterCapacityPeople: 100,
    coordinatorPhone: "0555567890",
  },

  // Djimla
  {
    name: "Masjid Al-Hidaya - Djimla Center",
    nameAr: "مسجد الهداية - وسط جيملة",
    facilityType: "mosque_operational",
    commune: "Djimla",
    communeAr: "جيملة",
    daira: "Djimla",
    lat: 36.5811,
    lng: 5.8013,
    hasWaterTank: false,
    hasPowerGenerator: true,
    shelterCapacityPeople: 90,
    coordinatorPhone: "0555678901",
    notes: "مركز تنسيق ميداني لتوزيع المواد في المناطق الجبلية",
  },

  // ── Water Springs ───────────────────────────────────────────────────────────

  {
    name: "Ain Ben Sakhriya Spring",
    nameAr: "منبع عين بن صخرية - مياه صالحة للشرب",
    facilityType: "water_spring",
    commune: "Texenna",
    communeAr: "تاكسنة",
    daira: "Texenna",
    lat: 36.6590,
    lng: 5.7720,
    hasWaterTank: false,
    hasPowerGenerator: false,
    notes: "منبع طبيعي — مياه صالحة للشرب على مدار السنة",
  },
  {
    name: "Ain Tizi Maaouch Spring",
    nameAr: "منبع عين تيزي معوش",
    facilityType: "water_spring",
    commune: "Djimla",
    communeAr: "جيملة",
    daira: "Djimla",
    lat: 36.5720,
    lng: 5.8150,
    hasWaterTank: true,
    hasPowerGenerator: false,
    notes: "منبع يغذي عدة مداشر — خزان سعة 5000 لتر",
  },
  {
    name: "Ain Ouled Bouazza Spring",
    nameAr: "منبع عين أولاد بوعزة",
    facilityType: "water_spring",
    commune: "Taher",
    communeAr: "الطاهير",
    daira: "Taher",
    lat: 36.7580,
    lng: 5.9120,
    hasWaterTank: false,
    hasPowerGenerator: false,
    notes: "منبع مياه نقي — يحتاج صيانة أنبوب التوزيع",
  },

  // ── Energy & Cold Chain ─────────────────────────────────────────────────────

  {
    name: "Oxygen Generator - Taher Hospital",
    nameAr: "مولد أكسجين - مستشفى الطاهير",
    facilityType: "oxygen_generator",
    commune: "Taher",
    communeAr: "الطاهير",
    daira: "Taher",
    lat: 36.7710,
    lng: 5.9000,
    hasWaterTank: false,
    hasPowerGenerator: true,
    coordinatorPhone: "0555789012",
    notes: "مولد أكسجين طبي — سعة 20 لتر/الدقيقة",
  },
  {
    name: "Cold Chain Pharmacy - El Milia",
    nameAr: "صيدلية سلسلة التبريد - الميلية",
    facilityType: "cold_chain_pharma",
    commune: "El Milia",
    communeAr: "الميلية",
    daira: "El Milia",
    lat: 36.7520,
    lng: 6.2695,
    hasWaterTank: false,
    hasPowerGenerator: true,
    coordinatorPhone: "0555890123",
    notes: "ثلاجات لحفظ اللقاحات والأنسولين — مولد احتياطي",
  },

  // ── Mechta / Dechra settlements ─────────────────────────────────────────────
  // These are seeded as zawiya_sanctuary type as notable community gathering points

  {
    name: "Tabarkout Mechta",
    nameAr: "مشتة تباركوت",
    facilityType: "zawiya_sanctuary",
    commune: "Texenna",
    communeAr: "تاكسنة",
    daira: "Texenna",
    lat: 36.6600,
    lng: 5.7750,
    hasWaterTank: false,
    hasPowerGenerator: false,
    shelterCapacityPeople: 30,
    notes: "مشتة معزولة — نقطة تجمع للإغاثة",
  },
  {
    name: "Tamantout Mechta",
    nameAr: "مشتة تامنتوت",
    facilityType: "zawiya_sanctuary",
    commune: "Djimla",
    communeAr: "جيملة",
    daira: "Djimla",
    lat: 36.5850,
    lng: 5.8080,
    hasWaterTank: false,
    hasPowerGenerator: false,
    shelterCapacityPeople: 25,
    notes: "مشتة جبلية — طريق 4×4 فقط",
  },
  {
    name: "Bouazza Mechta",
    nameAr: "مشتة بوعزة",
    facilityType: "zawiya_sanctuary",
    commune: "Taher",
    communeAr: "الطاهير",
    daira: "Taher",
    lat: 36.7560,
    lng: 5.9100,
    hasWaterTank: false,
    hasPowerGenerator: false,
    shelterCapacityPeople: 20,
  },
  {
    name: "Dar El Oued Mechta",
    nameAr: "مشتة دار الواد",
    facilityType: "zawiya_sanctuary",
    commune: "El Milia",
    communeAr: "الميلية",
    daira: "El Milia",
    lat: 36.7480,
    lng: 6.2750,
    hasWaterTank: true,
    hasPowerGenerator: false,
    shelterCapacityPeople: 40,
    notes: "قريبة من الوادي — خطر فيضان موسمي",
  },
  {
    name: "Oum Rekba Mechta",
    nameAr: "مشتة أم ركبة",
    facilityType: "zawiya_sanctuary",
    commune: "Texenna",
    communeAr: "تاكسنة",
    daira: "Texenna",
    lat: 36.6620,
    lng: 5.7900,
    hasWaterTank: false,
    hasPowerGenerator: false,
    shelterCapacityPeople: 15,
  },
  {
    name: "Tizi Maaouch Mechta",
    nameAr: "مشتة تيزي معوش",
    facilityType: "zawiya_sanctuary",
    commune: "Djimla",
    communeAr: "جيملة",
    daira: "Djimla",
    lat: 36.5740,
    lng: 5.8180,
    hasWaterTank: false,
    hasPowerGenerator: false,
    shelterCapacityPeople: 35,
    notes: "منطقة حرجة — محاصرة من الحرائق سابقاً",
  },
];

async function main() {
  console.log("🕌 Seeding community facilities (mosques, springs, shelters, mechtas)…");

  for (const seed of COMMUNITY_FACILITY_SEEDS) {
    await db.insert(communityFacilities).values({
      name: seed.name,
      nameAr: seed.nameAr,
      facilityType: seed.facilityType,
      commune: seed.commune,
      communeAr: seed.communeAr ?? null,
      daira: seed.daira ?? null,
      lat: String(seed.lat),
      lng: String(seed.lng),
      hasWaterTank: seed.hasWaterTank,
      hasPowerGenerator: seed.hasPowerGenerator,
      shelterCapacityPeople: seed.shelterCapacityPeople ?? null,
      coordinatorPhone: seed.coordinatorPhone ?? null,
      notes: seed.notes ?? null,
    });
  }

  console.log(`✅ Seeded ${COMMUNITY_FACILITY_SEEDS.length} community facilities.`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
