import "dotenv/config";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

import { locations, needs, pledges } from "../src/db/schema";
import { resolveVerifiedMapCoordinates } from "../src/lib/locations";

const LOCAL_DATABASE_URL =
  "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery";

const connectionString = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;

type SeedLocation = {
  name: string;
  daira: string;
  address: string;
};

type SeedNeed = {
  location: SeedLocation;
  title: string;
  description: string;
  category: "food" | "water" | "shelter" | "medical" | "clothing" | "transport" | "other";
  urgency: "low" | "medium" | "high" | "critical";
  status: "open" | "partial" | "fulfilled" | "closed";
  quantityNeeded: number;
  quantityFulfilled: number;
  contactName: string;
  contactPhone: string;
  contactWhatsapp?: string;
  pledges?: Array<{
    contributorName: string;
    contributorContact: string;
    quantity: number;
    status: "pending" | "confirmed" | "delivered" | "cancelled";
  }>;
};

const SEED_NEEDS: SeedNeed[] = [
  {
    location: {
      name: "El Ancer",
      daira: "El Ancer",
      address: "دوار بني عائشة",
    },
    title: "1200 شتلة زيتون + 80 لفة أنابيب سقي",
    description:
      "إعادة غرس بساتين الزيتون المحروقة في دوار بني عائشة وتوصيل شبكة السقي للمزارع المتضررة.",
    category: "other",
    urgency: "critical",
    status: "open",
    quantityNeeded: 1280,
    quantityFulfilled: 120,
    contactName: "سفيان بوالقمح",
    contactPhone: "0554123987",
    pledges: [
      {
        contributorName: "جمعية الخير بالعنصر",
        contributorContact: "0770123400",
        quantity: 120,
        status: "confirmed",
      },
    ],
  },
  {
    location: {
      name: "Djemaa Beni Habibi",
      daira: "El Ancer",
      address: "تابلوط وتاسيفت",
    },
    title: "45 خزان ماء 3000L + 15 مضخة ماء",
    description:
      "تأمين تخزين ماء الشرب وضخه لعائلات تابلوط وتاسيفت بعد انقطاع الشبكة الجبلية.",
    category: "water",
    urgency: "critical",
    status: "partial",
    quantityNeeded: 60,
    quantityFulfilled: 12,
    contactName: "رشيد كحول",
    contactPhone: "0771894523",
    pledges: [
      {
        contributorName: "تنسيقية الإغاثة بالعنصر",
        contributorContact: "0661987654",
        quantity: 12,
        status: "delivered",
      },
    ],
  },
  {
    location: {
      name: "Chahna",
      daira: "Taher",
      address: "بني خطاب وبوشارف",
    },
    title: "60 صندوق نحل + 400 قنطار أعلاف مواشي",
    description:
      "دعم صغار المربين في بني خطاب وبوشارف بعد فقدان خلايا النحل ونفاد أعلاف الماشية.",
    category: "food",
    urgency: "critical",
    status: "open",
    quantityNeeded: 460,
    quantityFulfilled: 40,
    contactName: "عبد الرزاق بولوداني",
    contactPhone: "0771239845",
    pledges: [
      {
        contributorName: "تعاونية الشحنة",
        contributorContact: "0555332211",
        quantity: 40,
        status: "confirmed",
      },
    ],
  },
  {
    location: {
      name: "Boucif Ouled Askeur",
      daira: "Taher",
      address: "سوق السبت وقاع الزان",
    },
    title: "350 لوح زنك عازل + إسمنت لترميم الأسقف",
    description:
      "مواد تسقيف عاجلة لمنازل متضررة في سوق السبت وقاع الزان قبل موسم الأمطار.",
    category: "shelter",
    urgency: "high",
    status: "open",
    quantityNeeded: 350,
    quantityFulfilled: 45,
    contactName: "مراد بوحنيك",
    contactPhone: "0663451122",
    pledges: [
      {
        contributorName: "متطوعو الطاهير",
        contributorContact: "0555778899",
        quantity: 45,
        status: "pending",
      },
    ],
  },
  {
    location: {
      name: "Bouraoui Belhadef",
      daira: "El Ancer",
      address: "أولاد رابح",
    },
    title: "800 شتلة زيتون + 2500م خراطيم مياه",
    description:
      "إعادة غرس بساتين أولاد رابح وإيصال مياه السقي للقطع الفلاحية المعزولة.",
    category: "other",
    urgency: "critical",
    status: "open",
    quantityNeeded: 800,
    quantityFulfilled: 0,
    contactName: "عيسى معوش",
    contactPhone: "0558776655",
  },
  {
    location: {
      name: "Texenna",
      daira: "Texenna",
      address: "الحدادة وكعوان",
    },
    title: "أدوية بيطرية + 30 رأس غنم لصغار المربين",
    description:
      "علاج قطعان متضررة ودعم عيني للمربين الصغار في الحدادة وكعوان.",
    category: "food",
    urgency: "high",
    status: "partial",
    quantityNeeded: 30,
    quantityFulfilled: 8,
    contactName: "بلال قيطوني",
    contactPhone: "0661223344",
    pledges: [
      {
        contributorName: "وحدة بيطرة تكسنة",
        contributorContact: "034718033",
        quantity: 8,
        status: "delivered",
      },
    ],
  },
  {
    location: {
      name: "Djimla",
      daira: "Djimla",
      address: "دوار العرابة",
    },
    title: "500 شتلة كستناء وأشجار مثمرة + عتاد فلاحي يدوي",
    description:
      "تنويع غطاء نباتي في دوار العرابة وتأمين معاول ومقصات وعتاد يدوي للفلاحين.",
    category: "other",
    urgency: "high",
    status: "open",
    quantityNeeded: 500,
    quantityFulfilled: 60,
    contactName: "يوسف بن عودة",
    contactPhone: "0556011223",
    pledges: [
      {
        contributorName: "جمعية الفلاحين بجيملة",
        contributorContact: "0770456789",
        quantity: 60,
        status: "confirmed",
      },
    ],
  },
  {
    location: {
      name: "Ziama Mansouriah",
      daira: "Ziama Mansouriah",
      address: "تيزي نيزنت",
    },
    title: "20 صهريج ماء + ترميم شبكة المنبع الجبلي",
    description:
      "نقل ماء الشرب لدوار تيزي نيزنت وإصلاح خط التغذية من المنبع الجبلي.",
    category: "water",
    urgency: "critical",
    status: "open",
    quantityNeeded: 20,
    quantityFulfilled: 3,
    contactName: "نبيل زروقي",
    contactPhone: "0667890123",
    pledges: [
      {
        contributorName: "لجنة الماء بزيامة",
        contributorContact: "0677112233",
        quantity: 3,
        status: "confirmed",
      },
    ],
  },
];

async function runMigration(pool: Pool): Promise<void> {
  if (process.env.SKIP_MIGRATIONS === "1") {
    return;
  }

  const migrationPaths = [
    resolve(__dirname, "../drizzle/0001_init.sql"),
    resolve(__dirname, "../drizzle/0002_intelligence.sql"),
    resolve(__dirname, "../drizzle/0003_emergency_facilities.sql"),
    resolve(__dirname, "../drizzle/0004_urgent_alerts_media.sql"),
    resolve(__dirname, "../drizzle/0005_community_helpers.sql"),
    resolve(__dirname, "../drizzle/0006_needs_media.sql"),
    resolve(__dirname, "../drizzle/0007_convoys.sql"),
    resolve(__dirname, "../drizzle/0008_incoming_convoys.sql"),
    resolve(__dirname, "../drizzle/0009_numeric_coordinates.sql"),
    resolve(__dirname, "../drizzle/0010_mila_entry_point.sql"),
    resolve(__dirname, "../drizzle/0011_village_field_reports.sql"),
    resolve(__dirname, "../drizzle/0012_charity_inventories.sql"),
  ];

  for (const migrationPath of migrationPaths) {
    const migrationSql = readFileSync(migrationPath, "utf8");
    await pool.query(migrationSql);
  }
}

async function seedDatabase(): Promise<void> {
  process.env.DATABASE_URL ??= LOCAL_DATABASE_URL;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await runMigration(pool);

    if (process.env.FORCE_NEEDS_SEED === "1") {
      await pool.query("DELETE FROM pledges");
      await pool.query("DELETE FROM needs");
      await pool.query("DELETE FROM locations");
      console.log("Cleared existing needs for forced reseed.");
    }

    const existing = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM needs",
    );

    if (Number(existing.rows[0]?.count ?? 0) > 0) {
      console.log("Database already seeded. Skipping. Set FORCE_NEEDS_SEED=1 to replace.");
      return;
    }

    const { db } = await import("../src/db/index");

    for (const seed of SEED_NEEDS) {
      const coords = resolveVerifiedMapCoordinates({
        name: seed.location.name,
        daira: seed.location.daira,
        address: seed.location.address,
      });

      const [location] = await db
        .insert(locations)
        .values({
          name: seed.location.name,
          daira: seed.location.daira,
          address: seed.location.address,
          lat: String(coords.lat),
          lng: String(coords.lng),
        })
        .returning();

      const [need] = await db
        .insert(needs)
        .values({
          locationId: location.id,
          title: seed.title,
          description: seed.description,
          category: seed.category,
          urgency: seed.urgency,
          status: seed.status,
          quantityNeeded: seed.quantityNeeded,
          quantityFulfilled: seed.quantityFulfilled,
          contactName: seed.contactName,
          contactPhone: seed.contactPhone,
          contactWhatsapp: seed.contactWhatsapp ?? seed.contactPhone,
        })
        .returning();

      if (seed.pledges?.length) {
        await db.insert(pledges).values(
          seed.pledges.map((pledge) => ({
            needId: need.id,
            contributorName: pledge.contributorName,
            contributorContact: pledge.contributorContact,
            quantity: pledge.quantity,
            status: pledge.status,
          })),
        );
      }
    }

    console.log(`Seeded ${SEED_NEEDS.length} field recovery needs across affected Jijel communes.`);
  } finally {
    await pool.end();
  }
}

void seedDatabase().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
