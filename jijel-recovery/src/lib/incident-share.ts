import type { MapNeed } from "@/actions/needs";
import { getCommuneArabicName } from "@/lib/locations";
import { translateNeedTitle } from "@/lib/need-display";

function resolveAppOrigin(origin?: string): string {
  return origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function buildNeedWhatsAppDispatchMessage(
  need: MapNeed,
  origin?: string,
): string {
  const baseUrl = resolveAppOrigin(origin);
  const commune = getCommuneArabicName(need.location.name);
  const village =
    need.location.address?.trim() ||
    need.location.name ||
    commune;
  const title = translateNeedTitle(need.title);
  const details = need.description?.trim()
    ? `${title} — ${need.description.trim()}`
    : title;
  const phone = need.contactPhone?.trim() || "غير متوفر";
  const url = `${baseUrl}/map?needId=${need.id}`;

  return [
    "🚨 *نداء استغاثة عاجل - إغاثة جيجل*",
    `📍 المكان: ${commune} - ${village}`,
    `📦 الاحتياج: ${details}`,
    `📞 هاتف التنسيق: ${phone}`,
    `🔗 رابط الحالة على المنصة: ${url}`,
  ].join("\n");
}

export function buildMapPinWhatsAppDispatchMessage(input: {
  communeAr?: string;
  villageAr?: string;
  title: string;
  details?: string;
  phone?: string | null;
  needId?: number;
  lat: number;
  lng: number;
  origin?: string;
}): string {
  const baseUrl = resolveAppOrigin(input.origin);
  const commune = input.communeAr ?? "جيجل";
  const village = input.villageAr ?? commune;
  const details = input.details?.trim() || input.title;
  const phone = input.phone?.trim() || "غير متوفر";
  const url = input.needId
    ? `${baseUrl}/map?needId=${input.needId}`
    : `${baseUrl}/map?lat=${input.lat}&lng=${input.lng}`;

  return [
    "🚨 *نداء استغاثة عاجل - إغاثة جيجل*",
    `📍 المكان: ${commune} - ${village}`,
    `📦 الاحتياج: ${details}`,
    `📞 هاتف التنسيق: ${phone}`,
    `🔗 رابط الحالة على المنصة: ${url}`,
  ].join("\n");
}

/** @deprecated Use buildNeedWhatsAppDispatchMessage */
export function buildNeedIncidentShareMessage(
  need: MapNeed,
  origin?: string,
): string {
  return buildNeedWhatsAppDispatchMessage(need, origin);
}

/** @deprecated Use buildMapPinWhatsAppDispatchMessage */
export function buildMapPinShareMessage(input: {
  title: string;
  pointTypeLabel: string;
  communeAr?: string;
  villageAr?: string;
  lat: number;
  lng: number;
  notes?: string;
  needId?: number;
  origin?: string;
}): string {
  return buildMapPinWhatsAppDispatchMessage({
    communeAr: input.communeAr,
    villageAr: input.villageAr,
    title: input.title,
    details: input.notes
      ? `${input.title} (${input.pointTypeLabel}) — ${input.notes}`
      : `${input.title} (${input.pointTypeLabel})`,
    lat: input.lat,
    lng: input.lng,
    needId: input.needId,
    origin: input.origin,
  });
}
