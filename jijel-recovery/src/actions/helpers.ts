"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  communityHelpers,
  helperSkillEnum,
  type CommunityHelper,
  type HelperSkill,
} from "@/db/schema";
import { getCommuneCoordinates } from "@/lib/locations";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

const registerHelperSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم مطلوب"),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
  whatsappSameAsPhone: z.boolean().optional(),
  whatsappPhone: z.string().trim().optional(),
  daira: z.string().trim().min(1, "الدائرة مطلوبة"),
  commune: z.string().trim().min(1, "البلدية مطلوبة"),
  skills: z
    .array(z.enum(helperSkillEnum.enumValues))
    .min(1, "اختر نوع مساعدة واحد على الأقل"),
  availabilityNotes: z.string().trim().optional(),
});

export type RegisterCommunityHelperInput = z.infer<typeof registerHelperSchema>;

export type CommunityHelperRecord = CommunityHelper;

function revalidateHelperPaths(): void {
  revalidatePath("/");
  revalidatePath("/map");
}

export async function registerCommunityHelper(
  data: RegisterCommunityHelperInput,
): Promise<ActionResult<CommunityHelperRecord>> {
  try {
    const parsed = registerHelperSchema.safeParse(data);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "بيانات غير صالحة",
      };
    }

    const input = parsed.data;

    if (!isValidAlgerianPhone(input.phone)) {
      return {
        success: false,
        error: "رقم الهاتف غير صالح — استخدم 05/06/07 أو +213.",
      };
    }

    const whatsappPhone = input.whatsappSameAsPhone
      ? normalizeAlgerianPhone(input.phone)
      : input.whatsappPhone
        ? normalizeAlgerianPhone(input.whatsappPhone)
        : null;

    if (whatsappPhone && !isValidAlgerianPhone(whatsappPhone)) {
      return {
        success: false,
        error: "رقم الواتساب غير صالح.",
      };
    }

    const communeCoords = getCommuneCoordinates(input.commune);

    if (!communeCoords) {
      return {
        success: false,
        error: "تعذر تحديد إحداثيات البلدية.",
      };
    }

    const [helper] = await db
      .insert(communityHelpers)
      .values({
        fullName: input.fullName,
        phone: normalizeAlgerianPhone(input.phone),
        whatsappPhone,
        daira: input.daira,
        commune: input.commune,
        lat: String(communeCoords.lat),
        lng: String(communeCoords.lng),
        skills: input.skills as HelperSkill[],
        availabilityNotes: input.availabilityNotes ?? null,
        status: "pending",
      })
      .returning();

    revalidateHelperPaths();

    return { success: true, data: helper };
  } catch (error) {
    console.error("registerCommunityHelper error:", error);
    return {
      success: false,
      error: "تعذر تسجيل المتطوع. حاول مرة أخرى.",
    };
  }
}
