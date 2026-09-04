import { NextResponse } from "next/server";

import { getCommuneDeficitTrackers } from "@/lib/agent/deficit";
import {
  JIJEL_ENTRY_CORRIDORS,
  ROAD_STATUS_LABELS,
} from "@/lib/road-corridors";
import { db } from "@/db";
import { mountainTrails } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY_AR: Record<string, string> = {
  food: "غذاء",
  water: "ماء",
  shelter: "إيواء",
  medical: "طبي",
  sos_orphan_family: "عائلات",
  clothing: "ملابس",
  transport: "نقل",
  other: "أخرى",
};

export async function GET() {
  try {
    const deficits = await getCommuneDeficitTrackers(8);

    const corridorAlerts = JIJEL_ENTRY_CORRIDORS.filter(
      (c) => c.status !== "open",
    ).map(
      (c) =>
        `${c.route} (${c.labelAr}): ${ROAD_STATUS_LABELS[c.status]} — ${c.noteAr}`,
    );

    let trailAlerts: string[] = [];
    try {
      const trails = await db
        .select({
          roadCode: mountainTrails.roadCode,
          clearanceLevel: mountainTrails.clearanceLevel,
          notes: mountainTrails.notes,
        })
        .from(mountainTrails)
        .where(
          inArray(mountainTrails.clearanceLevel, [
            "strict_4x4_required",
            "completely_blocked",
          ]),
        )
        .orderBy(desc(mountainTrails.updatedAt))
        .limit(6);

      trailAlerts = trails.map((t) => {
        const level =
          t.clearanceLevel === "completely_blocked"
            ? "مغلق تماماً"
            : "4×4 إلزامي";
        return `${t.roadCode}: ${level}${t.notes ? ` — ${t.notes}` : ""}`;
      });
    } catch {
      trailAlerts = [];
    }

    const roadAlerts = [...corridorAlerts, ...trailAlerts];

    return NextResponse.json(
      {
        success: true,
        data: {
          deficits: deficits.map((d) => ({
            ...d,
            categoriesAr: d.categories.map((c) => CATEGORY_AR[c] ?? c),
          })),
          roadAlerts,
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/agent/field-dispatch:", error);
    return NextResponse.json(
      { success: false, error: "تعذر جلب ملخص التنسيق الميداني." },
      { status: 500 },
    );
  }
}
