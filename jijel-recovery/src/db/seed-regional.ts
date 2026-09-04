import { resolve } from "node:path";

import { config } from "dotenv";
import { and, inArray } from "drizzle-orm";

// Load .env.local before the db client resolves DATABASE_URL
config({ path: resolve(process.cwd(), ".env.local") });

type LocationSeed = {
  name: string;
  daira: string;
  address: string;
  lat: string;
  lng: string;
  wilaya: "06_bejaia" | "21_skikda" | "19_setif";
};

/**
 * Seeds Béjaïa / Skikda / Sétif relief hubs, critical needs, and 4x4 volunteers.
 * Mapped to the live Drizzle schema (locations / needs / volunteers).
 */
export async function seedRegionalRelief() {
  const { db } = await import("./index");
  const { locations, needs, volunteers } = await import("./schema");

  console.log(
    "🌱 Seeding Regional Relief Hubs for Béjaïa, Skikda, and Sétif...",
  );

  const regionalLocationSeeds: LocationSeed[] = [
    // Béjaïa (06)
    {
      name: "مركز التنسيق الميداني - خراطة",
      daira: "خراطة",
      address: "خراطة — نقطة استقبال وتفريغ شاحنات المساعدات عبر مضائق خراطة",
      lat: "36.493100",
      lng: "5.275400",
      wilaya: "06_bejaia",
    },
    {
      name: "مستودع إمدادات الإغاثة - أوقاس",
      daira: "أوقاس",
      address: "أوقاس — تخزين مياه الشرب، حليب الأطفال، والأفرشة",
      lat: "36.643800",
      lng: "5.234100",
      wilaya: "06_bejaia",
    },
    {
      name: "مشتة أيت إدريس - أميزور",
      daira: "أميزور",
      address: "أميزور — منطقة جبلية معزولة بحاجة إلى صهاريج مياه وأعلاف",
      lat: "36.648200",
      lng: "4.908100",
      wilaya: "06_bejaia",
    },

    // Skikda (21)
    {
      name: "خلية أزمة غابات القل (Collo Relief Hub)",
      daira: "القل",
      address: "القل — تنسيق فرق الإطفاء والمتطوعين في شبه جزيرة القل",
      lat: "37.006900",
      lng: "6.560400",
      wilaya: "21_skikda",
    },
    {
      name: "مشتة دار بوعزة - تمالوس",
      daira: "تمالوس",
      address: "تمالوس — مسالك وعرة تتطلب سيارات رباعية الدفع 4x4",
      lat: "36.837500",
      lng: "6.643100",
      wilaya: "21_skikda",
    },
    {
      name: "نقطة توزيع المؤن - الحروش",
      daira: "الحروش",
      address: "الحروش — مركز تجميع شاحنات المساعدات على الطريق الوطني RN3",
      lat: "36.726200",
      lng: "6.832900",
      wilaya: "21_skikda",
    },

    // Sétif (19 — Northern mountain relief zone)
    {
      name: "مركز استقبال متضرري جبال بابور",
      daira: "بابور",
      address: "بابور — إيواء مؤقت للعائلات المتضررة من بؤر النيران الجبلية",
      lat: "36.529200",
      lng: "5.539700",
      wilaya: "19_setif",
    },
    {
      name: "مستودع العلف والمعدات - عموشة",
      daira: "عموشة",
      address: "عموشة — مخزن رئيسي لأعلاف الماشية والعتاد اليدوي",
      lat: "36.402500",
      lng: "5.451900",
      wilaya: "19_setif",
    },
    {
      name: "دشرة تازقا - بني ورتيلان",
      daira: "بني ورتيلان",
      address: "بني ورتيلان — مسالك حجرية تتطلب شاحنات صغيرة وسيارات 4x4",
      lat: "36.441800",
      lng: "4.908200",
      wilaya: "19_setif",
    },
  ];

  const seedNames = regionalLocationSeeds.map((row) => row.name);
  const existing = await db
    .select({ id: locations.id, name: locations.name, wilaya: locations.wilaya })
    .from(locations)
    .where(
      and(
        inArray(locations.name, seedNames),
        inArray(locations.wilaya, ["06_bejaia", "21_skikda", "19_setif"]),
      ),
    );

  const existingNames = new Set(existing.map((row) => row.name));
  const toInsert = regionalLocationSeeds.filter(
    (row) => !existingNames.has(row.name),
  );

  let regionalLocations = existing;

  if (toInsert.length > 0) {
    const inserted = await db.insert(locations).values(toInsert).returning({
      id: locations.id,
      name: locations.name,
      wilaya: locations.wilaya,
    });
    regionalLocations = [...existing, ...inserted];
    console.log(`📍 Inserted ${inserted.length} regional locations`);
  } else {
    console.log("📍 Regional locations already present — reusing");
  }

  const bejaiaLoc = regionalLocations.find((l) => l.name.includes("أميزور"));
  const skikdaLoc = regionalLocations.find((l) => l.name.includes("تمالوس"));
  const setifLoc = regionalLocations.find((l) => l.name.includes("بني ورتيلان"));

  if (!bejaiaLoc?.id || !skikdaLoc?.id || !setifLoc?.id) {
    throw new Error("Missing critical settlement hubs after location seed.");
  }

  const existingNeeds = await db
    .select({ id: needs.id, locationId: needs.locationId })
    .from(needs)
    .where(
      inArray(needs.locationId, [bejaiaLoc.id, skikdaLoc.id, setifLoc.id]),
    );

  if (existingNeeds.length === 0) {
    await db.insert(needs).values([
      {
        locationId: bejaiaLoc.id,
        title: "صهاريج ماء — مشتة أيت إدريس",
        description:
          "صهاريج ماء صالح للشرب ومضخات يدوية لمشتة أيت إدريس (أميزور)",
        category: "water",
        urgency: "critical",
        status: "open",
        quantityNeeded: 500,
        quantityFulfilled: 120,
        wilaya: "06_bejaia",
        contactName: "منسق أميزور",
        contactPhone: "0550000606",
      },
      {
        locationId: skikdaLoc.id,
        title: "إسعافات أولية — مشتة دار بوعزة",
        description: "مراهم حروق، ضمادات معقمة، ومستلزمات رضع (تمالوس)",
        category: "medical",
        urgency: "critical",
        status: "open",
        quantityNeeded: 200,
        quantityFulfilled: 45,
        wilaya: "21_skikda",
        contactName: "منسق تمالوس",
        contactPhone: "0550002121",
      },
      {
        locationId: setifLoc.id,
        title: "أعلاف مواشي — دشرة تازقا",
        description:
          "أكياس نخالة وتبن لإنقاذ رؤوس الأبقار والماعز (بني ورتيلان)",
        category: "food",
        urgency: "critical",
        status: "open",
        quantityNeeded: 350,
        quantityFulfilled: 60,
        wilaya: "19_setif",
        contactName: "منسق بني ورتيلان",
        contactPhone: "0550001919",
      },
    ]);
    console.log("🆘 Inserted 3 critical regional needs");
  } else {
    console.log("🆘 Regional needs already present — skipping");
  }

  const volunteerPhones = ["0550112233", "0661445566", "0770998877"];
  const existingVolunteers = await db
    .select({ phone: volunteers.phone })
    .from(volunteers)
    .where(inArray(volunteers.phone, volunteerPhones));

  const existingPhones = new Set(existingVolunteers.map((v) => v.phone));
  const volunteerRows = [
    {
      fullName: "كمال حيمران",
      phone: "0550112233",
      commune: "خراطة",
      wilaya: "06_bejaia" as const,
      vehicleType: "suv_4x4" as const,
      specialty: "general_relief" as const,
      isAvailable: true,
      status: "verified",
    },
    {
      fullName: "طارق بوالقمح",
      phone: "0661445566",
      commune: "القل",
      wilaya: "21_skikda" as const,
      vehicleType: "suv_4x4" as const,
      specialty: "debris_clearing" as const,
      isAvailable: true,
      status: "verified",
    },
    {
      fullName: "د. عبد الرؤوف لعور",
      phone: "0770998877",
      commune: "عموشة",
      wilaya: "19_setif" as const,
      vehicleType: "sedan" as const,
      specialty: "veterinary" as const,
      isAvailable: true,
      status: "verified",
    },
  ].filter((row) => !existingPhones.has(row.phone));

  if (volunteerRows.length > 0) {
    await db.insert(volunteers).values(volunteerRows);
    console.log(`🚙 Inserted ${volunteerRows.length} regional volunteers`);
  } else {
    console.log("🚙 Regional volunteers already present — skipping");
  }

  console.log(
    "✅ Regional Relief Hubs, Needs, and Volunteers seeded successfully!",
  );

  return {
    locations: regionalLocations.length,
    needsSeeded: existingNeeds.length === 0 ? 3 : 0,
    volunteersSeeded: volunteerRows.length,
  };
}

async function main() {
  const result = await seedRegionalRelief();
  console.log(result);
  process.exit(0);
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  process.argv[1].replace(/\\/g, "/").endsWith("src/db/seed-regional.ts");

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
