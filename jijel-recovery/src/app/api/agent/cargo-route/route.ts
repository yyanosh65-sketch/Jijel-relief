import { routeCargoConvoy } from "@/lib/agent/cargo-router";
import {
  convoyCargoTypeEnum,
  convoyEntryPointEnum,
  convoyVehicleTypeEnum,
} from "@/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cargoType = body.cargoType;

    if (!convoyCargoTypeEnum.enumValues.includes(cargoType)) {
      return Response.json({ error: "نوع الحمولة غير صالح." }, { status: 400 });
    }

    const vehicleType = convoyVehicleTypeEnum.enumValues.includes(body.vehicleType)
      ? body.vehicleType
      : undefined;
    const preferredEntryPoint = convoyEntryPointEnum.enumValues.includes(
      body.entryPoint,
    )
      ? body.entryPoint
      : undefined;

    const route = await routeCargoConvoy({
      cargoType,
      vehicleType,
      preferredEntryPoint,
    });

    return Response.json({ success: true, route });
  } catch (error: unknown) {
    console.error("cargo route error:", error);
    const message =
      error instanceof Error ? error.message : "تعذر حساب مسار الحمولة.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cargoType = searchParams.get("cargoType");

  if (!cargoType || !convoyCargoTypeEnum.enumValues.includes(cargoType as never)) {
    return Response.json({ error: "نوع الحمولة مطلوب." }, { status: 400 });
  }

  const vehicleType = searchParams.get("vehicleType");
  const entryPoint = searchParams.get("entryPoint");

  const route = await routeCargoConvoy({
    cargoType: cargoType as (typeof convoyCargoTypeEnum.enumValues)[number],
    vehicleType: convoyVehicleTypeEnum.enumValues.includes(vehicleType as never)
      ? (vehicleType as (typeof convoyVehicleTypeEnum.enumValues)[number])
      : undefined,
    preferredEntryPoint: convoyEntryPointEnum.enumValues.includes(
      entryPoint as never,
    )
      ? (entryPoint as (typeof convoyEntryPointEnum.enumValues)[number])
      : undefined,
  });

  return Response.json({ success: true, route });
}
