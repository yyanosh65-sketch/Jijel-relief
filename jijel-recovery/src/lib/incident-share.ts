import type { MapNeed } from "@/actions/needs";
import {
  formatNeedLocationArabic,
  getNeedUrgencyBadge,
  translateNeedTitle,
} from "@/lib/need-display";

export function buildNeedIncidentShareMessage(
  need: MapNeed,
  origin?: string,
): string {
  const baseUrl =
    origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://jijel-relief.local");

  const title = translateNeedTitle(need.title);
  const location = formatNeedLocationArabic(need);
  const urgency = getNeedUrgencyBadge(need.urgency);
  const remaining = need.quantityNeeded - need.quantityFulfilled;
  const mapUrl = `${baseUrl}/map?needId=${need.id}`;

  return [
    "🚨 نداء إغاثة — إغاثة جيجل",
    "",
    `📋 ${title}`,
    `📍 ${location}`,
    `⏱️ ${urgency.label}`,
    `📦 المتبقي: ${remaining} من ${need.quantityNeeded}`,
    "",
    `🗺️ عرض على الخريطة:\n${mapUrl}`,
    "",
    "ساعد في التنسيق أو شارك مع الجمعيات القريبة.",
  ].join("\n");
}

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
  const baseUrl =
    input.origin ??
    (typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "https://jijel-relief.local");

  const location = [input.villageAr, input.communeAr].filter(Boolean).join(" — ");
  const mapUrl = input.needId
    ? `${baseUrl}/map?needId=${input.needId}`
    : `${baseUrl}/map?lat=${input.lat}&lng=${input.lng}`;

  return [
    "🚨 تنبيه ميداني — إغاثة جيجل",
    "",
    `📋 ${input.title}`,
    `🏷️ ${input.pointTypeLabel}`,
    location ? `📍 ${location}` : null,
    input.notes ? `ℹ️ ${input.notes}` : null,
    "",
    `🗺️ عرض على الخريطة:\n${mapUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}
