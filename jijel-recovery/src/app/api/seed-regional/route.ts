import { NextResponse } from "next/server";

import { seedRegionalRelief } from "@/db/seed-regional";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Dev/ops helper to seed Béjaïa / Skikda / Sétif relief hubs.
 * Disabled in production unless SEED_REGIONAL_SECRET matches.
 */
export async function POST(request: Request) {
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SEED_REGIONAL_SECRET;
  const provided = request.headers.get("x-seed-secret");

  if (isProd && (!secret || provided !== secret)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const result = await seedRegionalRelief();
    return NextResponse.json(
      {
        success: true,
        message: "Béjaïa, Skikda, and Sétif seeded",
        data: result,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST /api/seed-regional:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Regional seed failed.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
