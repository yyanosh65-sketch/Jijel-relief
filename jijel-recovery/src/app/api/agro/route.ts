import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { agroRecoveryPledges, agroCategoryEnum } from "@/db/schema";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORIES = agroCategoryEnum.enumValues;

const insertPledgeSchema = z.object({
  donorOrganization: z.string().trim().min(2).max(150),
  donorWilaya: z.string().trim().min(2).max(50),
  category: z.enum(agroCategoryEnum.enumValues),
  quantityOffered: z.coerce.number().int().positive(),
  targetCommune: z.string().trim().max(80).optional().nullable(),
  contactPhone: z.string().trim().min(9).max(20),
});

export async function GET() {
  try {
    // Aggregate totals per category
    const rows = await db
      .select({
        category: agroRecoveryPledges.category,
        totalQuantity: sql<number>`cast(sum(${agroRecoveryPledges.quantityOffered}) as int)`,
        pledgeCount: sql<number>`cast(count(*) as int)`,
      })
      .from(agroRecoveryPledges)
      .groupBy(agroRecoveryPledges.category);

    // Build a full map so every category is always present, even with 0
    const categoryMap: Record<
      string,
      { category: string; totalQuantity: number; pledgeCount: number }
    > = {};

    for (const cat of CATEGORIES) {
      categoryMap[cat] = { category: cat, totalQuantity: 0, pledgeCount: 0 };
    }
    for (const row of rows) {
      categoryMap[row.category] = {
        category: row.category,
        totalQuantity: row.totalQuantity ?? 0,
        pledgeCount: row.pledgeCount ?? 0,
      };
    }

    // Also return the 10 most recent pledges for the detail ledger
    const recent = await db
      .select()
      .from(agroRecoveryPledges)
      .orderBy(desc(agroRecoveryPledges.createdAt))
      .limit(50);

    return NextResponse.json(
      {
        success: true,
        data: {
          aggregates: Object.values(categoryMap),
          recent,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/agro:", error);
    return NextResponse.json(
      { success: false, error: "تعذر جلب بيانات الاسترداد الزراعي." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = insertPledgeSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: first?.message ?? "بيانات غير صالحة." },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (!isValidAlgerianPhone(input.contactPhone)) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صالح." },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(agroRecoveryPledges)
      .values({
        donorOrganization: input.donorOrganization,
        donorWilaya: input.donorWilaya,
        category: input.category,
        quantityOffered: input.quantityOffered,
        targetCommune: input.targetCommune ?? null,
        contactPhone: normalizeAlgerianPhone(input.contactPhone),
      })
      .returning();

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/agro:", error);
    return NextResponse.json(
      { success: false, error: "تعذر تسجيل التعهد الزراعي." },
      { status: 500 },
    );
  }
}
