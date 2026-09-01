"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  locations,
  needCategoryEnum,
  needs,
  needStatusEnum,
  needUrgencyEnum,
  type Need,
  type NeedCategory,
  type NeedStatus,
  type NeedUrgency,
  type Pledge,
} from "@/db/schema";
import { getDairaForCommune } from "@/lib/locations";
import { normalizeAlgerianPhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

const createNeedSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  category: z.enum(needCategoryEnum.enumValues),
  urgency: z.enum(needUrgencyEnum.enumValues),
  quantityNeeded: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than zero"),
  locationName: z.string().trim().min(1, "Location name is required"),
  daira: z.string().trim().min(1, "Daira is required"),
  address: z.string().trim().optional(),
  lat: z.coerce
    .number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  lng: z.coerce
    .number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
  contactName: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
});

const damageReportSchema = z.object({
  intakeCategory: z.enum(["olive", "livestock", "roof", "water"]),
  quantity: z.coerce.number().int().min(1).max(100_000),
  unit: z.string().trim().min(1).max(32),
  description: z.string().max(2000).optional(),
  contactName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(9).max(20),
  contactWhatsapp: z.string().trim().min(9).max(20).optional(),
  commune: z.string().trim().min(1).max(120),
  village: z.string().trim().max(120).optional(),
  daira: z.string().trim().min(1).max(120),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  mediaUrls: z.array(z.string().max(2_000_000)).max(5).optional(),
  voiceNoteData: z.string().max(2_000_000).optional(),
});

const INTAKE_CATEGORY_MAP: Record<
  z.infer<typeof damageReportSchema>["intakeCategory"],
  { category: NeedCategory; titleAr: string }
> = {
  olive: { category: "other", titleAr: "زيتون" },
  livestock: { category: "food", titleAr: "مواشي" },
  roof: { category: "shelter", titleAr: "سقف" },
  water: { category: "water", titleAr: "دوزان ماء" },
};

const getNeedsFiltersSchema = z.object({
  category: z.enum(needCategoryEnum.enumValues).optional(),
  urgency: z.enum(needUrgencyEnum.enumValues).optional(),
  daira: z.string().trim().min(1).optional(),
  status: z.enum(needStatusEnum.enumValues).optional(),
});

export type CreateNeedInput = z.infer<typeof createNeedSchema>;
export type GetNeedsFilters = z.infer<typeof getNeedsFiltersSchema>;

export type NeedWithRelations = Need & {
  location: {
    id: number;
    name: string;
    daira: string;
    address: string | null;
    coordinates: string;
    createdAt: Date;
  };
  pledges: Pledge[];
};

export type NearbyNeed = NeedWithRelations & {
  distanceKm: number;
};

export type MapNeed = NeedWithRelations & {
  lat: number;
  lng: number;
};

export type SubmitDamageReportResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

function formDataToObject(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

function revalidateNeedPaths(): void {
  revalidatePath("/");
  revalidatePath("/needs");
  revalidatePath("/map");
  revalidatePath("/report");
}

function parseMediaUrls(formData: FormData): string[] | null {
  const mediaRaw = formData.get("mediaUrls");

  if (typeof mediaRaw !== "string" || !mediaRaw.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(mediaRaw) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return null;
  }
}

export async function submitDamageReport(
  formData: FormData,
): Promise<SubmitDamageReportResult> {
  const mediaUrls = parseMediaUrls(formData);

  if (mediaUrls === null) {
    return { ok: false, error: "تنسيق الوسائط غير صالح." };
  }

  const whatsappRaw = formData.get("contactWhatsapp");
  const whatsappNormalized =
    typeof whatsappRaw === "string" && whatsappRaw.trim()
      ? normalizeAlgerianPhone(whatsappRaw)
      : undefined;

  const commune = String(formData.get("commune") ?? "").trim();
  const dairaFromForm = String(formData.get("daira") ?? "").trim();
  const resolvedDaira = dairaFromForm || getDairaForCommune(commune) || "";

  const parsed = damageReportSchema.safeParse({
    intakeCategory: formData.get("intakeCategory"),
    quantity: formData.get("quantity"),
    unit: formData.get("unit"),
    description: formData.get("description") || undefined,
    contactName: formData.get("contactName"),
    contactPhone: normalizeAlgerianPhone(String(formData.get("contactPhone") ?? "")),
    contactWhatsapp: whatsappNormalized,
    commune,
    village: formData.get("village") || undefined,
    daira: resolvedDaira,
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    voiceNoteData:
      typeof formData.get("voiceNoteData") === "string" &&
      String(formData.get("voiceNoteData")).trim()
        ? String(formData.get("voiceNoteData")).trim()
        : undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "تحقق من الحقول المطلوبة وأعد المحاولة." };
  }

  const input = parsed.data;
  const mapping = INTAKE_CATEGORY_MAP[input.intakeCategory];
  const locationLabel = input.village
    ? `${input.commune} — ${input.village}`
    : input.commune;
  const title = `${mapping.titleAr} — ${input.quantity} ${input.unit}`;
  const descriptionParts = [
    `طلب مساعدة: ${mapping.titleAr}`,
    `الكمية: ${input.quantity} ${input.unit}`,
    input.village ? `الدشرة: ${input.village}` : null,
    input.description?.trim() ? input.description.trim() : null,
  ].filter(Boolean);

  try {
    const needId = await db.transaction(async (tx) => {
      const [location] = await tx
        .insert(locations)
        .values({
          name: locationLabel,
          daira: input.daira,
          address: input.village ?? null,
          coordinates: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
        })
        .returning();

      const [need] = await tx
        .insert(needs)
        .values({
          locationId: location.id,
          title,
          description: descriptionParts.join("\n"),
          category: mapping.category,
          urgency: "high",
          quantityNeeded: input.quantity,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          contactWhatsapp: input.contactWhatsapp ?? null,
          mediaUrls: input.mediaUrls?.length ? input.mediaUrls : [],
          voiceNoteData: input.voiceNoteData ?? null,
        })
        .returning({ id: needs.id });

      return need.id;
    });

    revalidateNeedPaths();

    return { ok: true, id: needId };
  } catch (error) {
    console.error("submitDamageReport error:", error);
    return { ok: false, error: "تعذّر حفظ الطلب. حاول مرة أخرى." };
  }
}

export async function createNeed(
  formData: FormData,
): Promise<ActionResult<NeedWithRelations>> {
  try {
    const parsed = createNeedSchema.safeParse(formDataToObject(formData));

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Invalid form data",
      };
    }

    const input = parsed.data;

    const result = await db.transaction(async (tx) => {
      const [location] = await tx
        .insert(locations)
        .values({
          name: input.locationName,
          daira: input.daira,
          address: input.address ?? null,
          coordinates: sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`,
        })
        .returning();

      const [need] = await tx
        .insert(needs)
        .values({
          locationId: location.id,
          title: input.title,
          description: input.description,
          category: input.category,
          urgency: input.urgency,
          quantityNeeded: input.quantityNeeded,
          contactName: input.contactName ?? null,
          contactPhone: input.contactPhone ?? null,
        })
        .returning();

      return {
        ...need,
        location,
        pledges: [] as Pledge[],
      };
    });

    revalidateNeedPaths();

    return { success: true, data: result };
  } catch (error) {
    console.error("createNeed error:", error);
    return {
      success: false,
      error: "Failed to create need. Please try again.",
    };
  }
}

export async function getNeeds(
  filters: GetNeedsFilters = {},
): Promise<ActionResult<NeedWithRelations[]>> {
  try {
    const parsedFilters = getNeedsFiltersSchema.safeParse(filters);

    if (!parsedFilters.success) {
      const firstIssue = parsedFilters.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Invalid filters",
      };
    }

    const { category, urgency, daira, status } = parsedFilters.data;

    const conditions = [];

    if (category) {
      conditions.push(eq(needs.category, category as NeedCategory));
    }

    if (urgency) {
      conditions.push(eq(needs.urgency, urgency as NeedUrgency));
    }

    if (status) {
      conditions.push(eq(needs.status, status as NeedStatus));
    }

    if (daira) {
      const matchingLocations = await db
        .select({ id: locations.id })
        .from(locations)
        .where(eq(locations.daira, daira));

      const locationIds = matchingLocations.map((location) => location.id);

      if (locationIds.length === 0) {
        return { success: true, data: [] };
      }

      conditions.push(inArray(needs.locationId, locationIds));
    }

    const rows = await db.query.needs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        location: true,
        pledges: true,
      },
      orderBy: (needsTable, { desc }) => [desc(needsTable.createdAt)],
    });

    return { success: true, data: rows };
  } catch (error) {
    console.error("getNeeds error:", error);
    return {
      success: false,
      error: "Failed to fetch needs.",
    };
  }
}

export async function getMapNeeds(): Promise<ActionResult<MapNeed[]>> {
  try {
    const rows = await db.execute<{
      id: number;
      location_id: number;
      title: string;
      description: string;
      category: NeedCategory;
      urgency: NeedUrgency;
      status: NeedStatus;
      quantity_needed: number;
      quantity_fulfilled: number;
      contact_name: string | null;
      contact_phone: string | null;
      contact_whatsapp: string | null;
      media_urls: string[] | null;
      voice_note_data: string | null;
      created_at: Date;
      updated_at: Date;
      location_id_join: number;
      location_name: string;
      location_daira: string;
      location_address: string | null;
      location_created_at: Date;
      lat: number;
      lng: number;
    }>(sql`
      SELECT
        n.id,
        n.location_id,
        n.title,
        n.description,
        n.category,
        n.urgency,
        n.status,
        n.quantity_needed,
        n.quantity_fulfilled,
        n.contact_name,
        n.contact_phone,
        n.contact_whatsapp,
        n.media_urls,
        n.voice_note_data,
        n.created_at,
        n.updated_at,
        l.id AS location_id_join,
        l.name AS location_name,
        l.daira AS location_daira,
        l.address AS location_address,
        l.created_at AS location_created_at,
        ST_Y(l.coordinates::geometry) AS lat,
        ST_X(l.coordinates::geometry) AS lng
      FROM ${needs} n
      INNER JOIN ${locations} l ON n.location_id = l.id
      WHERE n.status IN ('open', 'partial')
      ORDER BY n.created_at DESC
    `);

    const needIds = rows.rows.map((row) => row.id);
    const pledgeRows =
      needIds.length > 0
        ? await db.query.pledges.findMany({
            where: (pledgesTable, { inArray }) =>
              inArray(pledgesTable.needId, needIds),
          })
        : [];

    const pledgesByNeedId = new Map<number, Pledge[]>();

    for (const pledge of pledgeRows) {
      const existing = pledgesByNeedId.get(pledge.needId) ?? [];
      existing.push(pledge);
      pledgesByNeedId.set(pledge.needId, existing);
    }

    const data: MapNeed[] = rows.rows.map((row) => ({
      id: row.id,
      locationId: row.location_id,
      title: row.title,
      description: row.description,
      category: row.category,
      urgency: row.urgency,
      status: row.status,
      quantityNeeded: row.quantity_needed,
      quantityFulfilled: row.quantity_fulfilled,
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      contactWhatsapp: row.contact_whatsapp,
      mediaUrls: row.media_urls ?? [],
      voiceNoteData: row.voice_note_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      location: {
        id: row.location_id_join,
        name: row.location_name,
        daira: row.location_daira,
        address: row.location_address,
        coordinates: `${row.lat},${row.lng}`,
        createdAt: row.location_created_at,
      },
      pledges: pledgesByNeedId.get(row.id) ?? [],
      lat: Number(row.lat),
      lng: Number(row.lng),
    }));

    return { success: true, data };
  } catch (error) {
    console.error("getMapNeeds error:", error);
    return {
      success: false,
      error: "Failed to fetch map needs.",
    };
  }
}

export async function getNearbyNeeds(
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<ActionResult<NearbyNeed[]>> {
  try {
    const coordinatesSchema = z.object({
      lat: z
        .number()
        .min(-90, "Latitude must be between -90 and 90")
        .max(90, "Latitude must be between -90 and 90"),
      lng: z
        .number()
        .min(-180, "Longitude must be between -180 and 180")
        .max(180, "Longitude must be between -180 and 180"),
      radiusKm: z
        .number()
        .positive("Radius must be greater than zero")
        .max(500, "Radius cannot exceed 500 km"),
    });

    const parsed = coordinatesSchema.safeParse({ lat, lng, radiusKm });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Invalid coordinates or radius",
      };
    }

    const { lat: validLat, lng: validLng, radiusKm: validRadiusKm } =
      parsed.data;
    const radiusMeters = validRadiusKm * 1000;

    const rows = await db.execute<{
      id: number;
      location_id: number;
      title: string;
      description: string;
      category: NeedCategory;
      urgency: NeedUrgency;
      status: NeedStatus;
      quantity_needed: number;
      quantity_fulfilled: number;
      contact_name: string | null;
      contact_phone: string | null;
      contact_whatsapp: string | null;
      media_urls: string[] | null;
      voice_note_data: string | null;
      created_at: Date;
      updated_at: Date;
      location_id_join: number;
      location_name: string;
      location_daira: string;
      location_address: string | null;
      location_created_at: Date;
      distance_meters: number;
    }>(sql`
      SELECT
        n.id,
        n.location_id,
        n.title,
        n.description,
        n.category,
        n.urgency,
        n.status,
        n.quantity_needed,
        n.quantity_fulfilled,
        n.contact_name,
        n.contact_phone,
        n.contact_whatsapp,
        n.media_urls,
        n.voice_note_data,
        n.created_at,
        n.updated_at,
        l.id AS location_id_join,
        l.name AS location_name,
        l.daira AS location_daira,
        l.address AS location_address,
        l.created_at AS location_created_at,
        ST_Distance(
          l.coordinates,
          ST_SetSRID(ST_MakePoint(${validLng}, ${validLat}), 4326)::geography
        ) AS distance_meters
      FROM ${needs} n
      INNER JOIN ${locations} l ON n.location_id = l.id
      WHERE ST_DWithin(
        l.coordinates,
        ST_SetSRID(ST_MakePoint(${validLng}, ${validLat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY distance_meters ASC, n.created_at DESC
    `);

    const needIds = rows.rows.map((row) => row.id);
    const pledgeRows =
      needIds.length > 0
        ? await db.query.pledges.findMany({
            where: (pledgesTable, { inArray }) =>
              inArray(pledgesTable.needId, needIds),
          })
        : [];

    const pledgesByNeedId = new Map<number, Pledge[]>();

    for (const pledge of pledgeRows) {
      const existing = pledgesByNeedId.get(pledge.needId) ?? [];
      existing.push(pledge);
      pledgesByNeedId.set(pledge.needId, existing);
    }

    const data: NearbyNeed[] = rows.rows.map((row) => ({
      id: row.id,
      locationId: row.location_id,
      title: row.title,
      description: row.description,
      category: row.category,
      urgency: row.urgency,
      status: row.status,
      quantityNeeded: row.quantity_needed,
      quantityFulfilled: row.quantity_fulfilled,
      contactName: row.contact_name,
      contactPhone: row.contact_phone,
      contactWhatsapp: row.contact_whatsapp,
      mediaUrls: row.media_urls ?? [],
      voiceNoteData: row.voice_note_data,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      location: {
        id: row.location_id_join,
        name: row.location_name,
        daira: row.location_daira,
        address: row.location_address,
        coordinates: "",
        createdAt: row.location_created_at,
      },
      pledges: pledgesByNeedId.get(row.id) ?? [],
      distanceKm: Number(row.distance_meters) / 1000,
    }));

    return { success: true, data };
  } catch (error) {
    console.error("getNearbyNeeds error:", error);
    return {
      success: false,
      error: "Failed to fetch nearby needs.",
    };
  }
}
