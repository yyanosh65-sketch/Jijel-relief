"use server";

import { sql, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  emergencyFacilities,
  sosEmergencyTypeEnum,
  urgentAlerts,
} from "@/db/schema";
import { haversineKm } from "@/lib/geo";
import {
  getCommuneArabicName,
  getDairaArabicName,
  resolveLocationReference,
} from "@/lib/locations";
import { JIJEL_CENTER } from "@/lib/map-utils";
import {
  RELIEF_CONTACT_BADGES,
  reliefContacts,
  type ReliefContactCategory,
} from "@/lib/relief-contacts";
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
  category: ReliefContactCategory;
  badge: string;
  name: string;
  subtitle: string;
  phone: string;
  distanceKm: number | null;
};

export type CategorizedNearestContacts = {
  reliefHubs: NearestContact[];
  fieldTeams: NearestContact[];
  villageLeads: NearestContact[];
  officialFacilities: NearestContact[];
  usedCommuneFallback: boolean;
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

function computeDistanceKm(
  ref: { lat: number; lng: number },
  lat: number,
  lng: number,
): number {
  return Number(haversineKm(ref.lat, ref.lng, lat, lng).toFixed(1));
}

function sortContacts(contacts: NearestContact[]): NearestContact[] {
  return [...contacts].sort((left, right) => {
    if (left.distanceKm === null && right.distanceKm === null) {
      return 0;
    }

    if (left.distanceKm === null) {
      return 1;
    }

    if (right.distanceKm === null) {
      return -1;
    }

    return left.distanceKm - right.distanceKm;
  });
}

function matchesSelectedArea(
  entry: { commune: string; daira: string },
  commune?: string,
  daira?: string,
): boolean {
  if (!commune && !daira) {
    return true;
  }

  if (commune && (entry.commune === commune || entry.daira === commune)) {
    return true;
  }

  if (daira && entry.daira === daira) {
    return true;
  }

  return false;
}

export async function getNearestEmergencyContacts(input: {
  lat?: number;
  lng?: number;
  commune?: string;
  daira?: string;
  limitPerCategory?: number;
}): Promise<ActionResult<CategorizedNearestContacts>> {
  try {
    const limit = input.limitPerCategory ?? 4;
    const reference = resolveLocationReference({
      lat: input.lat,
      lng: input.lng,
      commune: input.commune,
      daira: input.daira,
      jijelCenter: JIJEL_CENTER,
      outsideThresholdKm: 100,
    });

    const distanceFor = (lat: number, lng: number): number | null =>
      reference ? computeDistanceKm(reference, lat, lng) : null;

    const areaFilter = <T extends { commune: string; daira: string }>(
      items: T[],
    ): T[] => {
      if (reference) {
        return items;
      }

      return items.filter((item) =>
        matchesSelectedArea(item, input.commune, input.daira),
      );
    };

    const reliefHubs = sortContacts(
      areaFilter(reliefContacts.reliefHubs)
        .map((hub) => ({
          id: hub.id,
          category: "relief_hub" as const,
          badge: RELIEF_CONTACT_BADGES.relief_hub,
          name: hub.name_ar,
          subtitle: `${getCommuneArabicName(hub.commune)} — دائرة ${getDairaArabicName(hub.daira)}`,
          phone: hub.phone,
          distanceKm: distanceFor(hub.lat, hub.lng),
        }))
        .filter((contact) =>
          reference ? (contact.distanceKm ?? 999) <= 60 : true,
        )
        .slice(0, limit),
    );

    const fieldTeams = sortContacts(
      areaFilter(reliefContacts.fieldTeams)
        .map((team) => ({
          id: team.id,
          category: "field_team" as const,
          badge: RELIEF_CONTACT_BADGES.field_team,
          name: team.name_ar,
          subtitle: `تغطية: ${team.coverage.map((area) => getCommuneArabicName(area)).join("، ")}`,
          phone: team.phone,
          distanceKm: distanceFor(team.lat, team.lng),
        }))
        .filter((contact) =>
          reference ? (contact.distanceKm ?? 999) <= 60 : true,
        )
        .slice(0, limit),
    );

    const villageLeads = sortContacts(
      areaFilter(reliefContacts.villageLeads.filter((lead) => lead.verified))
        .map((lead) => ({
          id: lead.id,
          category: "village_lead" as const,
          badge: RELIEF_CONTACT_BADGES.village_lead,
          name: lead.name_ar,
          subtitle: lead.role_ar,
          phone: lead.phone,
          distanceKm: distanceFor(lead.lat, lead.lng),
        }))
        .filter((contact) =>
          reference ? (contact.distanceKm ?? 999) <= 50 : true,
        )
        .slice(0, limit),
    );

    let officialFacilities: NearestContact[] = [];

    if (reference) {
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
            ST_SetSRID(ST_MakePoint(${reference.lng}, ${reference.lat}), 4326)::geography
          ) / 1000 AS distance_km
        FROM ${emergencyFacilities}
        ORDER BY coordinates <-> ST_SetSRID(ST_MakePoint(${reference.lng}, ${reference.lat}), 4326)::geography
        LIMIT ${limit}
      `);

      officialFacilities = facilityRows.rows.map((row) => ({
        id: `facility-${row.id}`,
        category: "official_facility" as const,
        badge: RELIEF_CONTACT_BADGES.official_facility,
        name: row.name,
        subtitle:
          FACILITY_TYPE_LABELS[row.facility_type] ??
          getCommuneArabicName(row.commune),
        phone: row.hotline_phone,
        distanceKm: Number(row.distance_km.toFixed(1)),
      }));
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
        .where(eq(emergencyFacilities.commune, input.commune))
        .limit(limit);

      officialFacilities = facilityRows.map((row) => ({
        id: `facility-${row.id}`,
        category: "official_facility" as const,
        badge: RELIEF_CONTACT_BADGES.official_facility,
        name: row.name,
        subtitle:
          FACILITY_TYPE_LABELS[row.facilityType] ??
          getCommuneArabicName(row.commune),
        phone: row.hotlinePhone,
        distanceKm: null,
      }));
    }

    return {
      success: true,
      data: {
        reliefHubs,
        fieldTeams,
        villageLeads,
        officialFacilities,
        usedCommuneFallback: reference?.usedCommuneFallback ?? false,
      },
    };
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