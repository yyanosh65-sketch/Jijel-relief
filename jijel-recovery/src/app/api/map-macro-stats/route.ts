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
import {
  getWilayaDefinition,
  parseWilayaParam,
  type WilayaCode,
} from "@/lib/wilaya";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function wilayaBbox(wilaya: WilayaCode) {
  const [[south, west], [north, east]] = getWilayaDefinition(wilaya).maxBounds;
  return { south, west, north, east };
}

/**
 * Live macro stats for the map HUD ticker (optionally scoped by ?wilaya=).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wilaya = parseWilayaParam(searchParams.get("wilaya"));
  const { south, west, north, east } = wilayaBbox(wilaya);

  try {
    const [interventionRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM (
          SELECT DISTINCT lower(trim(l.name)) AS settlement_key
          FROM ${needs} n
          INNER JOIN ${locations} l ON n.location_id = l.id
          WHERE n.status IN ('open', 'partial')
            AND n.wilaya = ${wilaya}
          UNION
          SELECT DISTINCT lower(trim(coalesce(a.village, a.commune))) AS settlement_key
          FROM ${urgentAlerts} a
          WHERE a.status IN ('active', 'acknowledged')
            AND CAST(a.lat AS double precision) BETWEEN ${south} AND ${north}
            AND CAST(a.lng AS double precision) BETWEEN ${west} AND ${east}
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
          AND wilaya = ${wilaya}
      `)
    ).rows;

    const [blockedTrailsRow] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM ${mountainTrails}
        WHERE clearance_level IN ('completely_blocked', 'strict_4x4_required')
          AND CAST(lat AS double precision) BETWEEN ${south} AND ${north}
          AND CAST(lng AS double precision) BETWEEN ${west} AND ${east}
      `)
    ).rows;

    const inIntervention = Number(interventionRow?.count ?? 0);
    const registered4x4 = Number(fourByFourRow?.count ?? 0);
    const blockedTrails = Number(blockedTrailsRow?.count ?? 0);

    return NextResponse.json(
      {
        success: true,
        wilaya,
        data: {
          inIntervention,
          registered4x4,
          blockedTrails,
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
        wilaya,
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
