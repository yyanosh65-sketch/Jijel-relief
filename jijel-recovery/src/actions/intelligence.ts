"use server";

import { sql } from "drizzle-orm";

import { db } from "@/db";
import { urgentAlerts } from "@/db/schema";
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
import type { SubmitUrgentAlertInput } from "@/actions/emergency";

export type SubmitSosInput = SubmitUrgentAlertInput;

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

export async function submitSosAlert(
  data: SubmitSosInput,
): Promise<ActionResult<SosMapAlert>> {
  const { submitUrgentAlert } = await import("@/actions/emergency");
  const result = await submitUrgentAlert(data);

  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }

  const alert = result.data;

  return {
    success: true,
    data: {
      id: alert.id,
      emergencyType: alert.emergencyType,
      description: alert.description,
      reporterName: alert.reporterName,
      daira: alert.daira,
      commune: alert.commune,
      village: alert.village,
      lat: alert.lat,
      lng: alert.lng,
      createdAt: alert.createdAt,
    },
  };
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
      FROM ${urgentAlerts}
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
