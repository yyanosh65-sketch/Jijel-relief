import "dotenv/config";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

import { locations, needs, pledges } from "../src/db/schema";

const LOCAL_DATABASE_URL =
  "postgresql://jijel:jijel_dev@127.0.0.1:5432/jijel_recovery";

const connectionString = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;

type SeedLocation = {
  name: string;
  daira: string;
  address: string;
  lat: number;
  lng: number;
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
      name: "Taher centre",
      daira: "Taher",
      address: "Taher",
      lat: 36.7785,
      lng: 5.8942,
    },
    title: "Olive trees for damaged orchards",
    description: "Families need young olive trees to replant burned orchards.",
    category: "other",
    urgency: "critical",
    status: "open",
    quantityNeeded: 120,
    quantityFulfilled: 0,
    contactName: "Karim B.",
    contactPhone: "0555123456",
  },
  {
    location: {
      name: "El Aouana",
      daira: "El Aouana",
      address: "El Aouana",
      lat: 36.8422,
      lng: 5.8715,
    },
    title: "Sheep for affected herders",
    description: "Urgent livestock support for herders who lost animals.",
    category: "food",
    urgency: "high",
    status: "partial",
    quantityNeeded: 25,
    quantityFulfilled: 10,
    contactName: "Nadia M.",
    contactPhone: "0661234567",
    pledges: [
      {
        contributorName: "Association Solidarité",
        contributorContact: "0770123456",
        quantity: 10,
        status: "confirmed",
      },
    ],
  },
  {
    location: {
      name: "Texenna",
      daira: "Texenna",
      address: "Texenna",
      lat: 36.6621,
      lng: 5.7428,
    },
    title: "Roofing sheets for homes",
    description: "Shelter materials needed before winter rains.",
    category: "shelter",
    urgency: "high",
    status: "open",
    quantityNeeded: 40,
    quantityFulfilled: 0,
    contactName: "Yacine H.",
    contactPhone: "0771987654",
  },
  {
    location: {
      name: "Jijel ville",
      daira: "Jijel",
      address: "Jijel",
      lat: 36.8205,
      lng: 5.7667,
    },
    title: "Agricultural tools kits",
    description: "Hand tools and small equipment for farming families.",
    category: "transport",
    urgency: "medium",
    status: "open",
    quantityNeeded: 30,
    quantityFulfilled: 0,
    contactName: "Samir L.",
    contactPhone: "0555987654",
  },
  {
    location: {
      name: "Ziama Mansouriah",
      daira: "Ziama Mansouriah",
      address: "Ziama Mansouriah",
      lat: 36.5334,
      lng: 5.7341,
    },
    title: "Drinking water tanks",
    description: "Water storage for isolated mountain villages.",
    category: "water",
    urgency: "critical",
    status: "open",
    quantityNeeded: 15,
    quantityFulfilled: 0,
    contactName: "Fatima Z.",
    contactPhone: "0677112233",
  },
];

async function runMigration(pool: Pool): Promise<void> {
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

    const existing = await pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM needs",
    );

    if (Number(existing.rows[0]?.count ?? 0) > 0) {
      console.log("Database already seeded. Skipping.");
      return;
    }

    const { db } = await import("../src/db/index");

    for (const seed of SEED_NEEDS) {
      const [location] = await db
        .insert(locations)
        .values({
          name: seed.location.name,
          daira: seed.location.daira,
          address: seed.location.address,
          lat: String(seed.location.lat),
          lng: String(seed.location.lng),
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

    console.log(`Seeded ${SEED_NEEDS.length} sample needs around Jijel.`);
  } finally {
    await pool.end();
  }
}

void seedDatabase().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
