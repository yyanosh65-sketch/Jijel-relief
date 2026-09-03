import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { inventoryTransfers } from "@/db/schema";
import { isValidAlgerianPhone, normalizeAlgerianPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const claimSchema = z.object({
  id: z.coerce.number().int().positive(),
  action: z.literal("claim"),
});

const insertSurplusSchema = z.object({
  sourceHubName: z.string().trim().min(2).max(120),
  sourceCommune: z.string().trim().min(2).max(80),
  itemCategory: z.string().trim().min(2).max(80),
  surplusQuantity: z.coerce.number().int().nonnegative(),
  neededInExchange: z.string().trim().max(150).optional().nullable(),
  coordinatorPhone: z.string().trim().min(9).max(20),
});

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(inventoryTransfers)
      .where(eq(inventoryTransfers.status, "available_surplus"))
      .orderBy(desc(inventoryTransfers.createdAt));

    return NextResponse.json({ success: true, data: rows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/inventory/barter:", error);
    return NextResponse.json(
      { success: false, error: "تعذر جلب بورصة التبادل." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body?.action === "claim") {
      const parsedClaim = claimSchema.safeParse(body);
      if (!parsedClaim.success) {
        return NextResponse.json(
          { success: false, error: "بيانات المطالبة غير صالحة." },
          { status: 400 },
        );
      }

      const [updated] = await db
        .update(inventoryTransfers)
        .set({ status: "matched_in_transit" })
        .where(eq(inventoryTransfers.id, parsedClaim.data.id))
        .returning();

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "لم يتم العثور على سجل المطالبة." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { success: true, data: updated },
        { status: 200 },
      );
    }

    const parsedInsert = insertSurplusSchema.safeParse(body);
    if (!parsedInsert.success) {
      return NextResponse.json(
        { success: false, error: "بيانات إدخال الفائض غير صالحة." },
        { status: 400 },
      );
    }

    const input = parsedInsert.data;

    if (!isValidAlgerianPhone(input.coordinatorPhone)) {
      return NextResponse.json(
        { success: false, error: "رقم الهاتف غير صالح." },
        { status: 400 },
      );
    }

    const [created] = await db
      .insert(inventoryTransfers)
      .values({
        sourceHubName: input.sourceHubName,
        sourceCommune: input.sourceCommune,
        itemCategory: input.itemCategory,
        surplusQuantity: input.surplusQuantity,
        neededInExchange: input.neededInExchange ?? null,
        coordinatorPhone: normalizeAlgerianPhone(input.coordinatorPhone),
        status: "available_surplus",
      })
      .returning();

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/inventory/barter:", error);
    return NextResponse.json(
      { success: false, error: "تعذر معالجة طلب بورصة التبادل." },
      { status: 500 },
    );
  }
}

