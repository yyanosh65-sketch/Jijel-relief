"use server";

import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  charityAvailabilityEnum,
  charityInventories,
  charityItemCategoryEnum,
  type CharityAvailability,
  type CharityInventory,
  type CharityItemCategory,
} from "@/db/schema";
import { parseTargetDouarsInput } from "@/lib/charity-inventory";
import {
  getCommuneArabicName,
  getCommuneCoordinates,
  getDairaForCommune,
} from "@/lib/locations";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";
import type { ActionResult } from "@/lib/types";

const registerCharityInventorySchema = z.object({
  charityName: z.string().trim().min(2, "اسم الجمعية مطلوب"),
  representativeName: z.string().trim().min(2, "اسم الممثل مطلوب"),
  representativePhone: z.string().trim().min(8, "رقم الهاتف مطلوب"),
  representativeWhatsapp: z.string().trim().optional(),
  whatsappSameAsPhone: z.boolean().optional(),
  daira: z.string().trim().min(1, "الدائرة مطلوبة"),
  commune: z.string().trim().min(1, "البلدية مطلوبة"),
  category: z.enum(charityItemCategoryEnum.enumValues),
  itemTitle: z.string().trim().min(2, "اسم الصنف مطلوب"),
  availableQuantity: z.number().int().min(1, "الكمية يجب أن تكون أكبر من صفر"),
  unit: z.string().trim().min(1, "الوحدة مطلوبة"),
  coverageRadiusKm: z.number().int().min(1).max(200).optional(),
  targetDouarsText: z.string().trim().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type CharityInventoryRecord = {
  id: number;
  charityName: string;
  charityNameAr: string | null;
  representativeName: string;
  representativePhone: string;
  representativeWhatsapp: string | null;
  daira: string;
  commune: string;
  communeAr: string;
  category: CharityItemCategory;
  itemTitle: string;
  availableQuantity: number;
  unit: string;
  coverageRadiusKm: number | null;
  targetDouars: string[];
  availability: CharityAvailability;
  verified: boolean;
  notes: string | null;
  createdAt: Date;
};

function mapRow(row: CharityInventory): CharityInventoryRecord {
  return {
    id: row.id,
    charityName: row.charityName,
    charityNameAr: row.charityNameAr,
    representativeName: row.representativeName,
    representativePhone: row.representativePhone,
    representativeWhatsapp: row.representativeWhatsapp,
    daira: row.daira,
    commune: row.commune,
    communeAr: row.communeAr,
    category: row.category,
    itemTitle: row.itemTitle,
    availableQuantity: row.availableQuantity,
    unit: row.unit,
    coverageRadiusKm: row.coverageRadiusKm,
    targetDouars: row.targetDouars ?? [],
    availability: row.availability,
    verified: row.verified,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function deriveAvailability(quantity: number): CharityAvailability {
  if (quantity <= 0) return "depleted";
  if (quantity <= 5) return "limited";
  return "available";
}

function revalidateCharityPaths(): void {
  revalidatePath("/charities");
  revalidatePath("/");
}

export async function getCharityInventories(filters?: {
  commune?: string;
  category?: CharityItemCategory;
  availability?: CharityAvailability | "in_stock";
}): Promise<ActionResult<CharityInventoryRecord[]>> {
  try {
    const conditions = [
      eq(charityInventories.status, "approved"),
    ];

    if (filters?.commune) {
      conditions.push(eq(charityInventories.commune, filters.commune));
    }

    if (filters?.category) {
      conditions.push(eq(charityInventories.category, filters.category));
    }

    if (filters?.availability === "in_stock") {
      conditions.push(
        inArray(charityInventories.availability, ["available", "limited"]),
      );
    } else if (filters?.availability) {
      conditions.push(eq(charityInventories.availability, filters.availability));
    } else {
      conditions.push(ne(charityInventories.availability, "depleted"));
    }

    const rows = await db
      .select()
      .from(charityInventories)
      .where(and(...conditions))
      .orderBy(desc(charityInventories.verified), desc(charityInventories.createdAt));

    return {
      success: true,
      data: rows.map(mapRow),
    };
  } catch (error) {
    console.error("getCharityInventories error:", error);
    return {
      success: false,
      error: "تعذر تحميل سجل المساعدات.",
    };
  }
}

export async function registerCharityInventory(
  input: z.infer<typeof registerCharityInventorySchema>,
): Promise<ActionResult<CharityInventoryRecord>> {
  const parsed = registerCharityInventorySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة.",
    };
  }

  const data = parsed.data;

  if (!isValidAlgerianPhone(data.representativePhone)) {
    return {
      success: false,
      error: "رقم الهاتف غير صالح — استخدم 05/06/07 أو +213.",
    };
  }

  const whatsappPhone = data.whatsappSameAsPhone
    ? normalizeAlgerianPhone(data.representativePhone)
    : data.representativeWhatsapp
      ? normalizeAlgerianPhone(data.representativeWhatsapp)
      : null;

  if (whatsappPhone && !isValidAlgerianPhone(whatsappPhone)) {
    return {
      success: false,
      error: "رقم الواتساب غير صالح.",
    };
  }

  const communeCoords = getCommuneCoordinates(data.commune);
  if (!communeCoords) {
    return {
      success: false,
      error: "تعذر التحقق من البلدية المختارة.",
    };
  }

  const daira = data.daira || getDairaForCommune(data.commune) || data.daira;
  const communeAr = getCommuneArabicName(data.commune);
  const targetDouars = parseTargetDouarsInput(data.targetDouarsText ?? "");
  const availability = deriveAvailability(data.availableQuantity);
  const requireApproval = process.env.CHARITY_REQUIRE_ADMIN_APPROVAL === "1";

  try {
    const [row] = await db
      .insert(charityInventories)
      .values({
        charityName: data.charityName,
        charityNameAr: data.charityName,
        representativeName: data.representativeName,
        representativePhone: normalizeAlgerianPhone(data.representativePhone),
        representativeWhatsapp: whatsappPhone,
        daira,
        commune: data.commune,
        communeAr,
        category: data.category,
        itemTitle: data.itemTitle,
        availableQuantity: data.availableQuantity,
        unit: data.unit,
        coverageRadiusKm: data.coverageRadiusKm ?? null,
        targetDouars,
        availability,
        verified: false,
        status: requireApproval ? "pending" : "approved",
        notes: data.notes ?? null,
      })
      .returning();

    revalidateCharityPaths();

    return {
      success: true,
      data: mapRow(row),
    };
  } catch (error) {
    console.error("registerCharityInventory error:", error);
    return {
      success: false,
      error: "تعذر تسجيل المخزون.",
    };
  }
}

export async function requestCharityCoordination(
  inventoryId: number,
  requesterName: string,
  requesterPhone: string,
  message?: string,
): Promise<ActionResult<{ coordinationNote: string }>> {
  const parsedName = requesterName.trim();
  const parsedPhone = requesterPhone.trim();

  if (parsedName.length < 2 || !isValidAlgerianPhone(parsedPhone)) {
    return {
      success: false,
      error: "أدخل اسمك ورقم هاتف صالح.",
    };
  }

  const [item] = await db
    .select()
    .from(charityInventories)
    .where(eq(charityInventories.id, inventoryId))
    .limit(1);

  if (!item) {
    return {
      success: false,
      error: "الصنف غير موجود.",
    };
  }

  const coordinationNote = [
    `طلب تنسيق لـ ${item.itemTitle}`,
    `الجمعية: ${item.charityName}`,
    `مقدم الطلب: ${parsedName} (${normalizeAlgerianPhone(parsedPhone)})`,
    message?.trim() ? `ملاحظة: ${message.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    success: true,
    data: { coordinationNote },
  };
}
