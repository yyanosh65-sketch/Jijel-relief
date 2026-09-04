import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { locations, mountainTrails, needs, volunteers } from "@/db/schema";
import { JIJEL_ENTRY_CORRIDORS } from "@/lib/road-corridors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [settlementsRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(DISTINCT l.id)::text AS count
        FROM ${needs} n
        INNER JOIN ${locations} l ON n.location_id = l.id
        WHERE n.status IN ('open', 'partial')
      `)
    ).rows;

    const [fourByFourRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM ${volunteers}
        WHERE vehicle_type = 'suv_4x4'
      `)
    ).rows;

    const [blockedTrailsRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM ${mountainTrails}
        WHERE clearance_level IN ('completely_blocked', 'strict_4x4_required')
      `)
    ).rows;

    const blockedCorridors = JIJEL_ENTRY_CORRIDORS.filter(
      (c) => c.status === "difficult_4x4",
    ).length;

    const blockedRoads =
      Number(blockedTrailsRow?.count ?? 0) + blockedCorridors;

    return NextResponse.json(
      {
        success: true,
        data: {
          settlementsUnderIntervention: Number(settlementsRow?.count ?? 0),
          fourByFourVehicles: Number(fourByFourRow?.count ?? 0),
          blockedRoads,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/map-macro-stats:", error);
    return NextResponse.json(
      {
        success: true,
        data: {
          settlementsUnderIntervention: 0,
          fourByFourVehicles: 0,
          blockedRoads: JIJEL_ENTRY_CORRIDORS.filter(
            (c) => c.status === "difficult_4x4",
          ).length,
        },
      },
      { status: 200 },
    );
  }
}
