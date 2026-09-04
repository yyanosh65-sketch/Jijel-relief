import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  locations,
  mountainTrails,
  needs,
  urgentAlerts,
  volunteers,
} from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Live macro stats for the map HUD ticker.
 * - inIntervention: distinct settlement keys under open needs or active SOS
 * - registered4x4: available 4x4 volunteers (suv_4x4 / is_available)
 * - blockedTrails: mountain trails that are blocked or impassable
 */
export async function GET() {
  try {
    const [interventionRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT DISTINCT lower(trim(l.name)) AS settlement_key
          FROM ${needs} n
          INNER JOIN ${locations} l ON n.location_id = l.id
          WHERE n.status IN ('open', 'partial')
          UNION
          SELECT DISTINCT lower(trim(coalesce(a.village, a.commune))) AS settlement_key
          FROM ${urgentAlerts} a
          WHERE a.status IN ('active', 'acknowledged')
            AND coalesce(nullif(trim(a.village), ''), nullif(trim(a.commune), '')) IS NOT NULL
        ) settlements
      `)
    ).rows;

    const [fourByFourRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM ${volunteers}
        WHERE vehicle_type = 'suv_4x4'
          AND is_available = true
      `)
    ).rows;

    const [blockedTrailsRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM ${mountainTrails}
        WHERE clearance_level IN ('completely_blocked', 'strict_4x4_required')
      `)
    ).rows;

    const inIntervention = Number(interventionRow?.count ?? 0);
    const registered4x4 = Number(fourByFourRow?.count ?? 0);
    const blockedTrails = Number(blockedTrailsRow?.count ?? 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          inIntervention,
          registered4x4,
          blockedTrails,
          // Backward-compatible aliases for older HUD consumers
          settlementsUnderIntervention: inIntervention,
          fourByFourVehicles: registered4x4,
          blockedRoads: blockedTrails,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/map-macro-stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: "تعذر جلب الإحصائيات الميدانية.",
        data: {
          inIntervention: 0,
          registered4x4: 0,
          blockedTrails: 0,
          settlementsUnderIntervention: 0,
          fourByFourVehicles: 0,
          blockedRoads: 0,
        },
      },
      { status: 500 },
    );
  }
}
