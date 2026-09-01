import { sql } from "drizzle-orm";

import { db } from "@/db";
import { locations, needs } from "@/db/schema";
import type { ConvoyCargoType, NeedCategory } from "@/db/schema";
import { CONVOY_CARGO_OPTIONS, CONVOY_ENTRY_OPTIONS } from "@/lib/convoys";
import { getDairaForCommune } from "@/lib/locations";

export type DeficitZone = {
  daira: string;
  commune: string;
  communeAr: string;
  deficitUnits: number;
  deficitRatio: number;
  urgencyScore: number;
  matchingNeeds: Array<{
    id: number;
    title: string;
    remaining: number;
    urgency: string;
    category: string;
  }>;
  recommendedEntryPoint: string;
  recommendedEntryPointAr: string;
  rationale: string;
};

const CARGO_CATEGORY_HINTS: Record<ConvoyCargoType, NeedCategory[]> = {
  food: ["food"],
  farm_equipment: ["other", "transport"],
  blankets: ["clothing", "shelter"],
  medicine: ["medical"],
  mixed: ["food", "water", "shelter", "medical", "clothing", "transport", "other"],
};

const URGENCY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function pickEntryPointForDaira(daira: string): {
  value: string;
  labelAr: string;
} {
  const eastern = ["Taher", "Chekfa", "Settara", "El Milia", "Sidi Maarouf"];
  const southern = ["El Ancer", "Texenna", "Ziama Mansouriah", "Djimla"];
  const western = ["El Aouana", "Jijel"];

  if (eastern.some((name) => daira.includes(name))) {
    return (
      CONVOY_ENTRY_OPTIONS.find((entry) => entry.value === "skikda_east") ??
      CONVOY_ENTRY_OPTIONS[0]
    );
  }

  if (southern.some((name) => daira.includes(name))) {
    return (
      CONVOY_ENTRY_OPTIONS.find((entry) => entry.value === "mila_south_east") ??
      CONVOY_ENTRY_OPTIONS[0]
    );
  }

  if (western.some((name) => daira.includes(name))) {
    return (
      CONVOY_ENTRY_OPTIONS.find((entry) => entry.value === "bejaia_west") ??
      CONVOY_ENTRY_OPTIONS[0]
    );
  }

  return CONVOY_ENTRY_OPTIONS[0];
}

export async function findHighestDeficitZone(
  cargoType: ConvoyCargoType,
): Promise<DeficitZone | null> {
  const allowedCategories = CARGO_CATEGORY_HINTS[cargoType];

  const rows = await db.execute<{
    id: number;
    title: string;
    category: string;
    urgency: string;
    quantity_needed: number;
    quantity_fulfilled: number;
    commune: string;
    daira: string;
  }>(sql`
    SELECT
      n.id,
      n.title,
      n.category,
      n.urgency,
      n.quantity_needed,
      n.quantity_fulfilled,
      l.name AS commune,
      l.daira AS daira
    FROM ${needs} n
    INNER JOIN ${locations} l ON n.location_id = l.id
    WHERE n.status IN ('open', 'partial')
  `);

  const zoneMap = new Map<
    string,
    {
      daira: string;
      commune: string;
      deficitUnits: number;
      weightedDeficit: number;
      needs: DeficitZone["matchingNeeds"];
    }
  >();

  for (const row of rows.rows) {
    if (!allowedCategories.includes(row.category as NeedCategory)) {
      continue;
    }

    const remaining = Math.max(row.quantity_needed - row.quantity_fulfilled, 0);
    if (remaining <= 0) {
      continue;
    }

    const key = `${row.daira}::${row.commune}`;
    const urgencyWeight = URGENCY_WEIGHT[row.urgency] ?? 1;
    const bucket = zoneMap.get(key) ?? {
      daira: row.daira,
      commune: row.commune,
      deficitUnits: 0,
      weightedDeficit: 0,
      needs: [],
    };

    bucket.deficitUnits += remaining;
    bucket.weightedDeficit += remaining * urgencyWeight;
    bucket.needs.push({
      id: row.id,
      title: row.title,
      remaining,
      urgency: row.urgency,
      category: row.category,
    });
    zoneMap.set(key, bucket);
  }

  const ranked = [...zoneMap.values()].sort(
    (a, b) => b.weightedDeficit - a.weightedDeficit,
  );

  const top = ranked[0];
  if (!top) {
    return null;
  }

  const totalNeeded = top.needs.reduce(
    (sum, need) => sum + need.remaining + 1,
    0,
  );
  const entry = pickEntryPointForDaira(top.daira);
  const cargoLabel =
    CONVOY_CARGO_OPTIONS.find((option) => option.value === cargoType)?.labelAr ??
    cargoType;

  return {
    daira: top.daira,
    commune: top.commune,
    communeAr: top.commune,
    deficitUnits: top.deficitUnits,
    deficitRatio: top.deficitUnits / totalNeeded,
    urgencyScore: top.weightedDeficit,
    matchingNeeds: top.needs.slice(0, 5),
    recommendedEntryPoint: entry.value,
    recommendedEntryPointAr: entry.labelAr,
    rationale: `أعلى عجز مطابق لحمولة «${cargoLabel}» في ${top.commune} (${top.deficitUnits} وحدة متبقية عبر ${top.needs.length} احتياج).`,
  };
}

export async function getReliefStatsSummary(): Promise<{
  openNeeds: number;
  activeSosAlerts: number;
  incomingConvoys: number;
  topDeficitZones: Array<{ commune: string; daira: string; deficitUnits: number }>;
}> {
  const [needsCount] = (
    await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM ${needs} WHERE status IN ('open', 'partial')
  `)
  ).rows;
  const [sosCount] = (
    await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM urgent_alerts WHERE status = 'active'
  `)
  ).rows;
  const [convoyCount] = (
    await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM incoming_convoys WHERE status IN ('planned', 'en_route', 'arrived')
  `)
  ).rows;

  const deficitRows = (
    await db.execute<{
    commune: string;
    daira: string;
    deficit: string;
  }>(sql`
    SELECT
      l.name AS commune,
      l.daira AS daira,
      SUM(GREATEST(n.quantity_needed - n.quantity_fulfilled, 0))::text AS deficit
    FROM ${needs} n
    INNER JOIN ${locations} l ON n.location_id = l.id
    WHERE n.status IN ('open', 'partial')
    GROUP BY l.name, l.daira
    ORDER BY SUM(GREATEST(n.quantity_needed - n.quantity_fulfilled, 0)) DESC
    LIMIT 5
  `)
  ).rows;

  return {
    openNeeds: Number(needsCount?.count ?? 0),
    activeSosAlerts: Number(sosCount?.count ?? 0),
    incomingConvoys: Number(convoyCount?.count ?? 0),
    topDeficitZones: deficitRows.map((row) => ({
      commune: row.commune,
      daira: row.daira,
      deficitUnits: Number(row.deficit),
    })),
  };
}

export function resolveDairaForCommune(commune: string): string {
  return getDairaForCommune(commune) ?? commune;
}
