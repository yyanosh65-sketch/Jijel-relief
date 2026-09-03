import { and, desc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import {
  activeResponders,
  responderRoleEnum,
  responderStatusEnum,
} from "@/db/schema";
import {
  broadcastResponderUpdate,
  type ResponderUpdatePayload,
} from "@/lib/responder-events";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const createResponderSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(9).max(20),
  role: z.enum(responderRoleEnum.enumValues),
  status: z.enum(responderStatusEnum.enumValues).default("on_site"),
  organizationName: z.string().trim().max(150).optional().nullable(),
  needId: z.coerce.number().int().positive().optional().nullable(),
  settlementId: z.coerce.number().int().positive().optional().nullable(),
  etaMinutes: z.coerce.number().int().min(0).max(24 * 60).optional().nullable(),
  suppliesBrought: z.string().trim().max(2000).optional().nullable(),
});

function serializeResponder(
  row: typeof activeResponders.$inferSelect,
): ResponderUpdatePayload {
  return {
    id: row.id,
    needId: row.needId,
    settlementId: row.settlementId,
    fullName: row.fullName,
    phone: row.phone,
    role: row.role,
    organizationName: row.organizationName,
    status: row.status,
    etaMinutes: row.etaMinutes,
    suppliesBrought: row.suppliesBrought,
    checkedInAt:
      row.checkedInAt instanceof Date
        ? row.checkedInAt.toISOString()
        : String(row.checkedInAt),
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const needIdRaw = searchParams.get("needId");
    const settlementIdRaw = searchParams.get("settlementId");
    const needId = needIdRaw ? Number(needIdRaw) : null;
    const settlementId = settlementIdRaw ? Number(settlementIdRaw) : null;

    const filters = [];

    if (needId && Number.isFinite(needId)) {
      filters.push(eq(activeResponders.needId, needId));
    }
    if (settlementId && Number.isFinite(settlementId)) {
      filters.push(eq(activeResponders.settlementId, settlementId));
    }

    // Default list: non-completed active responders (for map badges)
    if (filters.length === 0) {
      filters.push(ne(activeResponders.status, "completed"));
    }

    const rows = await db
      .select()
      .from(activeResponders)
      .where(and(...filters))
      .orderBy(desc(activeResponders.checkedInAt));

    return NextResponse.json({
      success: true,
      data: rows.map(serializeResponder),
    });
  } catch (error) {
    console.error("GET /api/responders:", error);
    return NextResponse.json(
      { success: false, error: "تعذر جلب فرق التدخل." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createResponderSchema.safeParse(body);

    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: first?.message ?? "بيانات غير صالحة." },
        { status: 400 },
      );
    }

    const input = parsed.data;

    if (!input.needId && !input.settlementId) {
      return NextResponse.json(
        {
          success: false,
          error: "لازم needId أو settlementId باش نسجّلو التواجد.",
        },
        { status: 400 },
      );
    }

    if (!isValidAlgerianPhone(input.phone)) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صالح." },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(activeResponders)
      .values({
        fullName: input.fullName,
        phone: normalizeAlgerianPhone(input.phone),
        role: input.role,
        status: input.status,
        organizationName: input.organizationName || null,
        needId: input.needId ?? null,
        settlementId: input.settlementId ?? null,
        etaMinutes:
          input.status === "en_route" ? (input.etaMinutes ?? null) : null,
        suppliesBrought: input.suppliesBrought || null,
      })
      .returning();

    const payload = serializeResponder(created);
    broadcastResponderUpdate(payload);

    return NextResponse.json(
      { success: true, data: payload },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/responders:", error);
    return NextResponse.json(
      { success: false, error: "تعذر تسجيل التواجد الميداني." },
      { status: 500 },
    );
  }
}
