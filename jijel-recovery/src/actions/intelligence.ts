"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { sosAlerts, sosEmergencyTypeEnum } from "@/db/schema";
import {
  buildVillagePins,
  getDossierById,
  getNearbyFacilities,
  villageIntelligence,
  type EmergencyFacility,
  type RoadAccessPoint,
  type VillageDossier,
} from "@/lib/intelligence";
import type { ActionResult } from "@/lib/types";

const submitSosSchema = z.object({
  emergencyType: z.enum(sosEmergencyTypeEnum.enumValues),
  description: z.string().trim().min(1, "الوصف مطلوب"),
  reporterName: z.string().trim().min(1, "الاسم مطلوب"),
  reporterPhone: z.string().trim().optional(),
  daira: z.string().trim().min(1, "الدائرة مطلوبة"),
  commune: z.string().trim().min(1, "البلدية مطلوبة"),
  village: z.string().trim().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type SubmitSosInput = z.infer<typeof submitSosSchema>;

export type SosMapAlert = {
  id: number;
  emergencyType: SubmitSosInput["emergencyType"];
  description: string;
  reporterName: string;
  daira: string;
  commune: string;
  village: string | null;
  lat: number;
  lng: number;
  createdAt: Date;
};

export type MapIntelligenceData = {
  villagePins: VillageDossier[];
  facilities: EmergencyFacility[];
  roads: RoadAccessPoint[];
  sosAlerts: SosMapAlert[];
};

function revalidateEmergencyPaths(): void {
  revalidatePath("/");
  revalidatePath("/map");
}

export async function submitSosAlert(
  data: SubmitSosInput,
): Promise<ActionResult<SosMapAlert>> {
  try {
    const parsed = submitSosSchema.safeParse(data);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "بيانات غير صالحة",
      };
    }

    const input = parsed.data;

    const [alert] = await db
      .insert(sosAlerts)
      .values({
        emergencyType: input.emergencyType,
        description: input.description,
        reporterName: input.reporterName,
        reporterPhone: input.reporterPhone ?? null,
        daira: input.daira,
        commune: input.commune,
        village: input.village ?? null,
        coordinates: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
      })
      .returning();

    revalidateEmergencyPaths();

    const rows = await db.execute<{
      id: number;
      emergency_type: SosMapAlert["emergencyType"];
      description: string;
      reporter_name: string;
      daira: string;
      commune: string;
      village: string | null;
      created_at: Date;
      lat: number;
      lng: number;
    }>(sql`
      SELECT
        id,
        emergency_type,
        description,
        reporter_name,
        daira,
        commune,
        village,
        created_at,
        ST_Y(coordinates::geometry) AS lat,
        ST_X(coordinates::geometry) AS lng
      FROM ${sosAlerts}
      WHERE id = ${alert.id}
    `);

    const row = rows.rows[0];

    return {
      success: true,
      data: {
        id: row.id,
        emergencyType: row.emergency_type,
        description: row.description,
        reporterName: row.reporter_name,
        daira: row.daira,
        commune: row.commune,
        village: row.village,
        lat: Number(row.lat),
        lng: Number(row.lng),
        createdAt: row.created_at,
      },
    };
  } catch (error) {
    console.error("submitSosAlert error:", error);
    return {
      success: false,
      error: "تعذر إرسال نداء الاستغاثة.",
    };
  }
}

export async function getActiveSosAlerts(): Promise<ActionResult<SosMapAlert[]>> {
  try {
    const rows = await db.execute<{
      id: number;
      emergency_type: SosMapAlert["emergencyType"];
      description: string;
      reporter_name: string;
      daira: string;
      commune: string;
      village: string | null;
      created_at: Date;
      lat: number;
      lng: number;
    }>(sql`
      SELECT
        id,
        emergency_type,
        description,
        reporter_name,
        daira,
        commune,
        village,
        created_at,
        ST_Y(coordinates::geometry) AS lat,
        ST_X(coordinates::geometry) AS lng
      FROM ${sosAlerts}
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);

    const data: SosMapAlert[] = rows.rows.map((row) => ({
      id: row.id,
      emergencyType: row.emergency_type,
      description: row.description,
      reporterName: row.reporter_name,
      daira: row.daira,
      commune: row.commune,
      village: row.village,
      lat: Number(row.lat),
      lng: Number(row.lng),
      createdAt: row.created_at,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("getActiveSosAlerts error:", error);
    return { success: false, error: "تعذر تحميل تنبيهات SOS." };
  }
}

export async function getMapIntelligence(): Promise<
  ActionResult<MapIntelligenceData>
> {
  try {
    const sosResult = await getActiveSosAlerts();

    return {
      success: true,
      data: {
        villagePins: buildVillagePins(),
        facilities: villageIntelligence.facilities,
        roads: villageIntelligence.roads,
        sosAlerts: sosResult.success ? (sosResult.data ?? []) : [],
      },
    };
  } catch (error) {
    console.error("getMapIntelligence error:", error);
    return { success: false, error: "تعذر تحميل بيانات الخريطة." };
  }
}

export async function getVillageDossier(
  dossierId: string,
): Promise<
  ActionResult<{
    dossier: VillageDossier;
    facilities: EmergencyFacility[];
  }>
> {
  try {
    const dossier = getDossierById(dossierId);

    if (!dossier) {
      return { success: false, error: "لم يتم العثور على ملف القرية." };
    }

    return {
      success: true,
      data: {
        dossier,
        facilities: getNearbyFacilities(dossier),
      },
    };
  } catch (error) {
    console.error("getVillageDossier error:", error);
    return { success: false, error: "تعذر تحميل ملف القرية." };
  }
}
