"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  convoyCargoTypeEnum,
  convoyEntryPointEnum,
  convoys,
  convoyVehicleTypeEnum,
  type Convoy,
} from "@/db/schema";
import { buildConvoyGuideAssignUrl } from "@/lib/convoys";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

const registerConvoySchema = z.object({
  departureWilaya: z.string().trim().min(1, "ولاية الانطلاق مطلوبة"),
  driverName: z.string().trim().min(2, "اسم السائق مطلوب"),
  driverPhone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
  whatsappSameAsPhone: z.boolean().optional(),
  driverWhatsapp: z.string().trim().optional(),
  vehicleType: z.enum(convoyVehicleTypeEnum.enumValues),
  cargoType: z.enum(convoyCargoTypeEnum.enumValues),
  eta: z.string().trim().min(1, "وقت الوصول التقريبي مطلوب"),
  entryPoint: z.enum(convoyEntryPointEnum.enumValues),
  notes: z.string().trim().optional(),
});

export type RegisterConvoyInput = z.infer<typeof registerConvoySchema>;

export type RegisterConvoyResult = {
  convoy: Convoy;
  guideAssignPath: string;
};

function revalidateConvoyPaths(): void {
  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/guide");
}

export async function registerConvoy(
  data: RegisterConvoyInput,
): Promise<ActionResult<RegisterConvoyResult>> {
  try {
    const parsed = registerConvoySchema.safeParse(data);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "بيانات غير صالحة",
      };
    }

    const input = parsed.data;

    if (!isValidAlgerianPhone(input.driverPhone)) {
      return {
        success: false,
        error: "رقم الهاتف غير صالح — استخدم 05/06/07 أو +213.",
      };
    }

    const driverWhatsapp = input.whatsappSameAsPhone
      ? normalizeAlgerianPhone(input.driverPhone)
      : input.driverWhatsapp
        ? normalizeAlgerianPhone(input.driverWhatsapp)
        : null;

    if (driverWhatsapp && !isValidAlgerianPhone(driverWhatsapp)) {
      return {
        success: false,
        error: "رقم الواتساب غير صالح.",
      };
    }

    const etaDate = new Date(input.eta);

    if (Number.isNaN(etaDate.getTime())) {
      return {
        success: false,
        error: "وقت الوصول غير صالح.",
      };
    }

    const [convoy] = await db
      .insert(convoys)
      .values({
        departureWilaya: input.departureWilaya,
        driverName: input.driverName,
        driverPhone: normalizeAlgerianPhone(input.driverPhone),
        driverWhatsapp,
        vehicleType: input.vehicleType,
        cargoType: input.cargoType,
        eta: etaDate,
        entryPoint: input.entryPoint,
        notes: input.notes ?? null,
        status: "planned",
      })
      .returning();

    revalidateConvoyPaths();

    return {
      success: true,
      data: {
        convoy,
        guideAssignPath: buildConvoyGuideAssignUrl(convoy.id),
      },
    };
  } catch (error) {
    console.error("registerConvoy error:", error);
    return {
      success: false,
      error: "تعذر تسجيل القافلة. حاول مرة أخرى.",
    };
  }
}

export async function assignWelcomingGuide(
  convoyId: number,
  guideName: string,
  guidePhone: string,
): Promise<ActionResult<Convoy>> {
  try {
    if (!guideName.trim() || !isValidAlgerianPhone(guidePhone)) {
      return {
        success: false,
        error: "اسم المرافق ورقم هاتف صالح مطلوبان.",
      };
    }

    const [convoy] = await db
      .update(convoys)
      .set({
        welcomingGuideName: guideName.trim(),
        welcomingGuidePhone: normalizeAlgerianPhone(guidePhone),
        status: "en_route",
      })
      .where(eq(convoys.id, convoyId))
      .returning();

    if (!convoy) {
      return { success: false, error: "القافلة غير موجودة." };
    }

    revalidateConvoyPaths();

    return { success: true, data: convoy };
  } catch (error) {
    console.error("assignWelcomingGuide error:", error);
    return {
      success: false,
      error: "تعذر تعيين المرافق.",
    };
  }
}
