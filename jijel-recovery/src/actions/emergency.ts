"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  emergencyFacilities,
  sosEmergencyTypeEnum,
  urgentAlerts,
} from "@/db/schema";
import { haversineKm } from "@/lib/geo";
import { villageIntelligence } from "@/lib/intelligence";
import type { ActionResult } from "@/lib/types";

const submitUrgentAlertSchema = z.object({
  emergencyType: z.enum(sosEmergencyTypeEnum.enumValues),
  description: z.string().trim().min(1, "الوصف مطلوب"),
  reporterName: z.string().trim().min(1, "الاسم مطلوب"),
  reporterPhone: z.string().trim().optional(),
  daira: z.string().trim().min(1, "الدائرة مطلوبة"),
  commune: z.string().trim().min(1, "البلدية مطلوبة"),
  village: z.string().trim().optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  mediaUrls: z.array(z.string()).max(3).optional(),
  voiceNoteData: z.string().optional(),
});

export type SubmitUrgentAlertInput = z.infer<typeof submitUrgentAlertSchema>;

export type UrgentAlertRecord = {
  id: number;
  emergencyType: SubmitUrgentAlertInput["emergencyType"];
  description: string;
  reporterName: string;
  daira: string;
  commune: string;
  village: string | null;
  lat: number;
  lng: number;
  mediaUrls: string[];
  voiceNoteData: string | null;
  createdAt: Date;
};

export type NearestContact = {
  id: string;
  kind: "facility" | "volunteer";
  name: string;
  subtitle: string;
  phone: string;
  distanceKm: number | null;
};

const FACILITY_TYPE_LABELS: Record<string, string> = {
  civil_protection: "الحماية المدنية",
  veterinary_clinic: "مستوصف بيطري",
  forest_conservancy: "محافظة الغابات",
};

function revalidateEmergencyPaths(): void {
  revalidatePath("/");
  revalidatePath("/map");
}

export async function getNearestEmergencyContacts(input: {
  lat?: number;
  lng?: number;
  commune?: string;
  limit?: number;
}): Promise<ActionResult<NearestContact[]>> {
  try {
    const limit = input.limit ?? 6;
    const hasGps =
      typeof input.lat === "number" &&
      typeof input.lng === "number" &&
      !Number.isNaN(input.lat) &&
      !Number.isNaN(input.lng);

    const contacts: NearestContact[] = [];

    if (hasGps) {
      const facilityRows = await db.execute<{
        id: number;
        name: string;
        facility_type: string;
        commune: string;
        hotline_phone: string;
        distance_km: number;
      }>(sql`
        SELECT
          id,
          name,
          facility_type,
          commune,
          hotline_phone,
          ST_Distance(
            coordinates,
            ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography
          ) / 1000 AS distance_km
        FROM ${emergencyFacilities}
        ORDER BY coordinates <-> ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography
        LIMIT ${limit}
      `);

      for (const row of facilityRows.rows) {
        contacts.push({
          id: `facility-${row.id}`,
          kind: "facility",
          name: row.name,
          subtitle:
            FACILITY_TYPE_LABELS[row.facility_type] ?? row.commune,
          phone: row.hotline_phone,
          distanceKm: Number(row.distance_km.toFixed(1)),
        });
      }
    } else if (input.commune) {
      const facilityRows = await db
        .select({
          id: emergencyFacilities.id,
          name: emergencyFacilities.name,
          facilityType: emergencyFacilities.facilityType,
          commune: emergencyFacilities.commune,
          hotlinePhone: emergencyFacilities.hotlinePhone,
        })
        .from(emergencyFacilities)
        .where(sql`${emergencyFacilities.commune} = ${input.commune}`)
        .limit(limit);

      for (const row of facilityRows) {
        contacts.push({
          id: `facility-${row.id}`,
          kind: "facility",
          name: row.name,
          subtitle: FACILITY_TYPE_LABELS[row.facilityType] ?? row.commune,
          phone: row.hotlinePhone,
          distanceKm: null,
        });
      }
    }

    const volunteers = villageIntelligence.dossiers
      .filter((dossier) => dossier.coordinator.verified)
      .map((dossier) => ({
        dossier,
        contact: {
          id: `volunteer-${dossier.id}`,
          kind: "volunteer" as const,
          name: dossier.coordinator.name_ar,
          subtitle: `متطوع محلي — ${dossier.name_ar}`,
          phone: dossier.coordinator.phone,
          distanceKm: hasGps
            ? Number(
                haversineKm(
                  input.lat!,
                  input.lng!,
                  dossier.lat,
                  dossier.lng,
                ).toFixed(1),
              )
            : null,
        },
      }))
      .filter(({ dossier, contact }) => {
        if (hasGps) {
          return contact.distanceKm !== null && contact.distanceKm <= 40;
        }

        if (input.commune) {
          return (
            dossier.name === input.commune || dossier.daira === input.commune
          );
        }

        return false;
      })
      .map(({ contact }) => contact)
      .slice(0, 3);

    const merged = [...contacts, ...volunteers]
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, limit);

    return { success: true, data: merged };
  } catch (error) {
    console.error("getNearestEmergencyContacts error:", error);
    return { success: false, error: "تعذر تحميل جهات المساعدة القريبة." };
  }
}

export async function submitUrgentAlert(
  data: SubmitUrgentAlertInput,
): Promise<ActionResult<UrgentAlertRecord>> {
  try {
    const parsed = submitUrgentAlertSchema.safeParse(data);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "بيانات غير صالحة",
      };
    }

    const input = parsed.data;

    const [alert] = await db
      .insert(urgentAlerts)
      .values({
        emergencyType: input.emergencyType,
        description: input.description,
        reporterName: input.reporterName,
        reporterPhone: input.reporterPhone ?? null,
        daira: input.daira,
        commune: input.commune,
        village: input.village ?? null,
        coordinates: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
        mediaUrls: input.mediaUrls ?? [],
        voiceNoteData: input.voiceNoteData ?? null,
      })
      .returning();

    revalidateEmergencyPaths();

    const rows = await db.execute<{
      id: number;
      emergency_type: UrgentAlertRecord["emergencyType"];
      description: string;
      reporter_name: string;
      daira: string;
      commune: string;
      village: string | null;
      media_urls: string[];
      voice_note_data: string | null;
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
        media_urls,
        voice_note_data,
        created_at,
        ST_Y(coordinates::geometry) AS lat,
        ST_X(coordinates::geometry) AS lng
      FROM ${urgentAlerts}
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
        mediaUrls: row.media_urls ?? [],
        voiceNoteData: row.voice_note_data,
        createdAt: row.created_at,
      },
    };
  } catch (error) {
    console.error("submitUrgentAlert error:", error);
    return {
      success: false,
      error: "تعذر إرسال نداء الاستغاثة.",
    };
  }
}