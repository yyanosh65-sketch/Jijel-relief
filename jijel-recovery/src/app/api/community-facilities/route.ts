import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { communityFacilities } from "@/db/schema";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(communityFacilities)
      .orderBy(desc(communityFacilities.createdAt));

    return NextResponse.json({ success: true, data: rows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/community-facilities:", error);
    return NextResponse.json(
      { success: false, error: "تعذر جلب المرافق المجتمعية." },
      { status: 500 },
    );
  }
}
