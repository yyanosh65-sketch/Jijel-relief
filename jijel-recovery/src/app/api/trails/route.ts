import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { mountainTrails, trailClearanceEnum } from "@/db/schema";
import { serializeMountainTrail } from "@/lib/trail-clearance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createTrailSchema = z.object({
  roadCode: z.string().trim().min(1).max(50),
  settlementId: z.coerce.number().int().positive().optional().nullable(),
  clearanceLevel: z.enum(trailClearanceEnum.enumValues),
  audioVoiceNoteUrl: z.string().trim().max(5_000_000).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  reportedByPhone: z.string().trim().min(8).max(20),
  lat: z.union([z.string(), z.number()]),
  lng: z.union([z.string(), z.number()]),
  /** When set, update this row instead of upserting by roadCode */
  id: z.coerce.number().int().positive().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roadCode = searchParams.get("roadCode")?.trim() || null;
    const settlementIdRaw = searchParams.get("settlementId");
    const settlementId = settlementIdRaw ? Number(settlementIdRaw) : null;

    const filters = [];
    if (roadCode) {
      filters.push(eq(mountainTrails.roadCode, roadCode));
    }
    if (settlementId && Number.isFinite(settlementId)) {
      filters.push(eq(mountainTrails.settlementId, settlementId));
    }

    const rows =
      filters.length > 0
        ? await db
            .select()
            .from(mountainTrails)
            .where(and(...filters))
            .orderBy(desc(mountainTrails.updatedAt))
        : await db
            .select()
            .from(mountainTrails)
            .orderBy(desc(mountainTrails.updatedAt));

    return NextResponse.json({
      success: true,
      data: rows.map(serializeMountainTrail),
    });
  } catch (error) {
    console.error("[GET /api/trails]", error);
    return NextResponse.json(
      { success: false, error: "تعذر تحميل حالة المسالك الجبلية." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createTrailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "بيانات المسلك غير صالحة.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const lat = String(input.lat).trim();
    const lng = String(input.lng).trim();

    if (!lat || !lng || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      return NextResponse.json(
        { success: false, error: "الإحداثيات مطلوبة." },
        { status: 400 },
      );
    }

    const values = {
      roadCode: input.roadCode,
      settlementId: input.settlementId ?? null,
      clearanceLevel: input.clearanceLevel,
      audioVoiceNoteUrl: input.audioVoiceNoteUrl || null,
      notes: input.notes || null,
      reportedByPhone: input.reportedByPhone,
      lat,
      lng,
      updatedAt: new Date(),
    };

    let row: typeof mountainTrails.$inferSelect;
    let updated = false;

    if (input.id) {
      const [existing] = await db
        .update(mountainTrails)
        .set(values)
        .where(eq(mountainTrails.id, input.id))
        .returning();
      if (existing) {
        row = existing;
        updated = true;
      } else {
        const [created] = await db
          .insert(mountainTrails)
          .values(values)
          .returning();
        row = created;
      }
    } else {
      const existing = await db.query.mountainTrails.findFirst({
        where: eq(mountainTrails.roadCode, input.roadCode),
        orderBy: [desc(mountainTrails.updatedAt)],
      });

      if (existing) {
        const [patched] = await db
          .update(mountainTrails)
          .set(values)
          .where(eq(mountainTrails.id, existing.id))
          .returning();
        row = patched;
        updated = true;
      } else {
        const [created] = await db
          .insert(mountainTrails)
          .values(values)
          .returning();
        row = created;
      }
    }

    return NextResponse.json(
      {
        success: true,
        updated,
        data: serializeMountainTrail(row),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/trails]", error);
    return NextResponse.json(
      { success: false, error: "تعذر حفظ حالة المسلك." },
      { status: 500 },
    );
  }
}
