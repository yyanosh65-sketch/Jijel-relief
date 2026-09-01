"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  communityHelpers,
  emergencyFacilities,
  sosEmergencyTypeEnum,
  urgentAlerts,
} from "@/db/schema";
import {
  buildNearestContactsFallback,
  buildReliefContactsFromJson,
  mapFacilityRowToContact,
  mapHelperRowToContact,
  resolveNearestHelpReference,
  sortContacts,
  type CategorizedNearestContacts,
  type NearestContact,
  type NearestHelpInput,
} from "@/lib/nearest-help";
import type { ActionResult } from "@/lib/types";

export type { NearestContact, CategorizedNearestContacts };

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

function revalidateEmergencyPaths(): void {
  revalidatePath("/");
  revalidatePath("/map");
}

async function fetchOfficialFacilities(
  input: NearestHelpInput,
  reference: NonNullable<ReturnType<typeof resolveNearestHelpReference>>,
  limit: number,
): Promise<NearestContact[]> {
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

  return facilityRows.rows.map((row) => mapFacilityRowToContact(row));
}

async function fetchOfficialFacilitiesByArea(
  input: NearestHelpInput,
  limit: number,
): Promise<NearestContact[]> {
  const commune = input.commune;
  if (!commune) {
    return [];
  }

  const facilityRows = await db
    .select({
      id: emergencyFacilities.id,
      name: emergencyFacilities.name,
      facilityType: emergencyFacilities.facilityType,
      commune: emergencyFacilities.commune,
      hotlinePhone: emergencyFacilities.hotlinePhone,
    })
    .from(emergencyFacilities)
    .where(eq(emergencyFacilities.commune, commune))
    .limit(limit);

  return facilityRows.map((row) =>
    mapFacilityRowToContact({
      id: row.id,
      name: row.name,
      facilityType: row.facilityType,
      commune: row.commune,
      hotlinePhone: row.hotlinePhone,
    }),
  );
}

async function fetchCommunityHelpers(
  reference: NonNullable<ReturnType<typeof resolveNearestHelpReference>>,
  limit: number,
): Promise<NearestContact[]> {
  const helperRows = await db.execute<{
    id: number;
    full_name: string;
    phone: string;
    whatsapp_phone: string | null;
    daira: string;
    commune: string;
    skills: unknown;
    availability_notes: string | null;
    distance_km: number;
  }>(sql`
    SELECT
      id,
      full_name,
      phone,
      whatsapp_phone,
      daira,
      commune,
      skills,
      availability_notes,
      ST_Distance(
        coordinates,
        ST_SetSRID(ST_MakePoint(${reference.lng}, ${reference.lat}), 4326)::geography
      ) / 1000 AS distance_km
    FROM ${communityHelpers}
    WHERE status = 'verified'
    ORDER BY coordinates <-> ST_SetSRID(ST_MakePoint(${reference.lng}, ${reference.lat}), 4326)::geography
    LIMIT ${limit}
  `);

  return helperRows.rows
    .map((row) => mapHelperRowToContact(row))
    .filter((contact) => (contact.distanceKm ?? 999) <= 80);
}

async function fetchCommunityHelpersByArea(
  input: NearestHelpInput,
  limit: number,
): Promise<NearestContact[]> {
  const helperConditions = [eq(communityHelpers.status, "verified")];

  if (input.commune) {
    helperConditions.push(eq(communityHelpers.commune, input.commune));
  } else if (input.daira) {
    helperConditions.push(eq(communityHelpers.daira, input.daira));
  }

  const helperRows = await db
    .select()
    .from(communityHelpers)
    .where(and(...helperConditions))
    .limit(limit);

  return helperRows.map((row) =>
    mapHelperRowToContact({
      id: row.id,
      fullName: row.fullName,
      phone: row.phone,
      whatsappPhone: row.whatsappPhone,
      daira: row.daira,
      commune: row.commune,
      skills: row.skills,
      availabilityNotes: row.availabilityNotes,
    }),
  );
}

export async function getNearestEmergencyContacts(
  input: NearestHelpInput,
): Promise<ActionResult<CategorizedNearestContacts>> {
  const limit = input.limitPerCategory ?? 4;
  const reference = resolveNearestHelpReference(input);
  const jsonContacts = buildReliefContactsFromJson(input, reference, limit);

  let officialFacilities: NearestContact[] = [];
  let communityHelpersList: NearestContact[] = [];

  try {
    if (reference) {
      officialFacilities = await fetchOfficialFacilities(input, reference, limit);
      communityHelpersList = await fetchCommunityHelpers(reference, limit);
    } else {
      officialFacilities = await fetchOfficialFacilitiesByArea(input, limit);
      communityHelpersList = await fetchCommunityHelpersByArea(input, limit);
    }
  } catch (error) {
    console.error("getNearestEmergencyContacts DB fallback:", error);
  }

  const totalJsonContacts =
    jsonContacts.reliefHubs.length +
    jsonContacts.fieldTeams.length +
    jsonContacts.villageLeads.length;

  const totalDbContacts =
    officialFacilities.length + communityHelpersList.length;

  if (totalJsonContacts === 0 && totalDbContacts === 0 && !reference) {
    return {
      success: true,
      data: buildNearestContactsFallback(input),
    };
  }

  return {
    success: true,
    data: {
      reliefHubs: jsonContacts.reliefHubs,
      fieldTeams: jsonContacts.fieldTeams,
      villageLeads: jsonContacts.villageLeads,
      officialFacilities,
      communityHelpers: sortContacts(communityHelpersList),
      usedCommuneFallback: reference?.usedCommuneFallback ?? false,
    },
  };
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
