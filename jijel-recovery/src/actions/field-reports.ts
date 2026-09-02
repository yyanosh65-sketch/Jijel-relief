"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  fieldInfrastructureStatusEnum,
  fieldRoadPassabilityEnum,
  villageFieldReports,
  type FieldInfrastructureStatus,
  type FieldRoadPassability,
  type VillageFieldReport,
} from "@/db/schema";
import { normalizeAlgerianPhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

const createFieldReportSchema = z.object({
  villageAr: z.string().trim().min(1),
  commune: z.string().trim().min(1),
  communeAr: z.string().trim().min(1),
  daira: z.string().trim().min(1),
  dairaAr: z.string().trim().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  reporterName: z.string().trim().min(2, "الاسم مطلوب"),
  reporterPhone: z.string().trim().min(8, "رقم الهاتف مطلوب"),
  affectedFamilies: z.number().int().min(0).optional(),
  populationEstimate: z.number().int().min(0).optional(),
  roadPassability: z.enum(fieldRoadPassabilityEnum.enumValues),
  waterStatus: z.enum(fieldInfrastructureStatusEnum.enumValues),
  fodderStatus: z.enum(fieldInfrastructureStatusEnum.enumValues),
  electricityStatus: z.enum(fieldInfrastructureStatusEnum.enumValues),
  urgentNeeds: z.array(z.string()).max(12),
  notes: z.string().trim().max(2000).optional(),
  mediaUrls: z.array(z.string().max(2_000_000)).max(8),
});

export type FieldReportRecord = {
  id: number;
  villageNameAr: string;
  commune: string;
  communeAr: string;
  daira: string;
  dairaAr: string;
  lat: number;
  lng: number;
  reporterName: string;
  reporterPhone: string;
  affectedFamilies: number | null;
  populationEstimate: number | null;
  roadPassability: FieldRoadPassability;
  waterStatus: FieldInfrastructureStatus;
  fodderStatus: FieldInfrastructureStatus;
  electricityStatus: FieldInfrastructureStatus;
  urgentNeeds: string[];
  notes: string | null;
  mediaUrls: string[];
  createdAt: Date;
};

function mapReportRow(row: VillageFieldReport): FieldReportRecord {
  return {
    id: row.id,
    villageNameAr: row.villageNameAr,
    commune: row.commune,
    communeAr: row.communeAr,
    daira: row.daira,
    dairaAr: row.dairaAr,
    lat: Number(row.lat),
    lng: Number(row.lng),
    reporterName: row.reporterName,
    reporterPhone: row.reporterPhone,
    affectedFamilies: row.affectedFamilies,
    populationEstimate: row.populationEstimate,
    roadPassability: row.roadPassability,
    waterStatus: row.waterStatus,
    fodderStatus: row.fodderStatus,
    electricityStatus: row.electricityStatus,
    urgentNeeds: row.urgentNeeds ?? [],
    notes: row.notes,
    mediaUrls: row.mediaUrls ?? [],
    createdAt: row.createdAt,
  };
}

export async function getVillageFieldReports(input: {
  villageAr: string;
  communeAr: string;
  dairaAr: string;
}): Promise<ActionResult<FieldReportRecord[]>> {
  try {
    const rows = await db
      .select()
      .from(villageFieldReports)
      .where(
        and(
          eq(villageFieldReports.villageNameAr, input.villageAr.trim()),
          eq(villageFieldReports.communeAr, input.communeAr.trim()),
          eq(villageFieldReports.dairaAr, input.dairaAr.trim()),
        ),
      )
      .orderBy(desc(villageFieldReports.createdAt));

    return {
      success: true,
      data: rows.map(mapReportRow),
    };
  } catch (error) {
    console.error("getVillageFieldReports error:", error);
    return {
      success: false,
      error: "تعذر تحميل التقارير الميدانية.",
    };
  }
}

export async function createVillageFieldReport(
  input: z.infer<typeof createFieldReportSchema>,
): Promise<ActionResult<FieldReportRecord>> {
  const parsed = createFieldReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }

  const data = parsed.data;

  try {
    const [row] = await db
      .insert(villageFieldReports)
      .values({
        villageNameAr: data.villageAr,
        commune: data.commune,
        communeAr: data.communeAr,
        daira: data.daira,
        dairaAr: data.dairaAr,
        lat: String(data.lat),
        lng: String(data.lng),
        reporterName: data.reporterName,
        reporterPhone: normalizeAlgerianPhone(data.reporterPhone),
        affectedFamilies: data.affectedFamilies ?? null,
        populationEstimate: data.populationEstimate ?? null,
        roadPassability: data.roadPassability,
        waterStatus: data.waterStatus,
        fodderStatus: data.fodderStatus,
        electricityStatus: data.electricityStatus,
        urgentNeeds: data.urgentNeeds,
        notes: data.notes ?? null,
        mediaUrls: data.mediaUrls,
      })
      .returning();

    revalidatePath("/map");
    revalidatePath("/");

    return {
      success: true,
      data: mapReportRow(row),
    };
  } catch (error) {
    console.error("createVillageFieldReport error:", error);
    return {
      success: false,
      error: "تعذر حفظ التقرير الميداني.",
    };
  }
}
