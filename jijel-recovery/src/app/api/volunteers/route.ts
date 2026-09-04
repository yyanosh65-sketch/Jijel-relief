import { desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import {
  volunteerSpecialtyEnum,
  volunteerVehicleEnum,
  volunteers,
  wilayaCodeEnum,
} from "@/db/schema";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const insertSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(20),
  commune: z.string().trim().min(1).max(80),
  vehicleType: z.enum(volunteerVehicleEnum.enumValues),
  specialty: z.enum(volunteerSpecialtyEnum.enumValues),
  wilaya: z.enum(wilayaCodeEnum.enumValues).optional(),
});

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(volunteers)
      .orderBy(desc(volunteers.createdAt))
      .limit(100);

    const [fourByFour] = (
      await db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::text AS count
        FROM ${volunteers}
        WHERE vehicle_type = 'suv_4x4'
          AND is_available = true
      `)
    ).rows;

    return NextResponse.json(
      {
        success: true,
        data: rows,
        stats: { fourByFourCount: Number(fourByFour?.count ?? 0) },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("GET /api/volunteers:", error);
    return NextResponse.json(
      { success: false, error: "تعذر جلب المتطوعين." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = insertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "تحقق من الحقول المطلوبة." },
        { status: 400 },
      );
    }

    if (!isValidAlgerianPhone(parsed.data.phone)) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صالح." },
        { status: 400 },
      );
    }

    const [row] = await db
      .insert(volunteers)
      .values({
        fullName: parsed.data.fullName,
        phone: normalizeAlgerianPhone(parsed.data.phone),
        commune: parsed.data.commune,
        vehicleType: parsed.data.vehicleType,
        specialty: parsed.data.specialty,
        status: "pending",
        isAvailable: true,
        wilaya: parsed.data.wilaya ?? "18_jijel",
      })
      .returning();

    return NextResponse.json(
      {
        success: true,
        data: row,
        message:
          "تم تسجيلك في بنك الإغاثة الميداني! سيتم الاتصال بك لتوجيه التدخل",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/volunteers:", error);
    return NextResponse.json(
      { success: false, error: "تعذر تسجيل المتطوع." },
      { status: 500 },
    );
  }
}
