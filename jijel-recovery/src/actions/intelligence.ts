"use server";

import { db } from "@/db";
import {
  buildVillagePins,
  getDossierById,
  getNearbyFacilities,
  villageIntelligence,
  type EmergencyFacility,
  type RoadAccessPoint,
  type VillageDossier,
} from "@/lib/intelligence";
import { convoyWaypoints, type ConvoyWaypoint } from "@/lib/convoy-waypoints";
import type { ActionResult } from "@/lib/types";
import type { SubmitUrgentAlertInput } from "@/actions/emergency";

export type SubmitSosInput = SubmitUrgentAlertInput;

export type SosMapAlert = {
  id: number;
  emergencyType: SubmitSosInput["emergencyType"];
  description: string;
  reporterName: string;
  reporterPhone: string | null;
  daira: string;
  commune: string;
  village: string | null;
  lat: number;
  lng: number;
  facebookUrl: string | null;
  createdAt: Date;
};

export type MapIntelligenceData = {
  villagePins: VillageDossier[];
  facilities: EmergencyFacility[];
  roads: RoadAccessPoint[];
  sosAlerts: SosMapAlert[];
  waypoints: ConvoyWaypoint[];
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
      reporterPhone: alert.reporterPhone,
      daira: alert.daira,
      commune: alert.commune,
      village: alert.village,
      lat: alert.lat,
      lng: alert.lng,
      facebookUrl: alert.facebookUrl ?? null,
      createdAt: alert.createdAt,
    },
  };
}

export async function getActiveSosAlerts(): Promise<ActionResult<SosMapAlert[]>> {
  try {
    const rows = await db.query.urgentAlerts.findMany({
      where: (table, { eq }) => eq(table.status, "active"),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    const data: SosMapAlert[] = rows.map((row) => ({
      id: row.id,
      emergencyType: row.emergencyType,
      description: row.description,
      reporterName: row.reporterName,
      reporterPhone: row.reporterPhone,
      daira: row.daira,
      commune: row.commune,
      village: row.village,
      lat: Number(row.lat),
      lng: Number(row.lng),
      facebookUrl: row.facebookUrl,
      createdAt: row.createdAt,
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
        waypoints: convoyWaypoints,
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
