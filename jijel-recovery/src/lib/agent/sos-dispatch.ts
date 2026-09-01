import { sql } from "drizzle-orm";

import { db } from "@/db";
import { communityHelpers, type SosEmergencyType } from "@/db/schema";
import { haversineKmSql } from "@/lib/geo";
import {
  mapHelperRowToContact,
  parseHelperSkills,
  type NearestContact,
} from "@/lib/nearest-help";
import { getCommuneArabicName } from "@/lib/locations";
import { buildWhatsAppUrl } from "@/lib/phone";

const SOS_EMERGENCY_LABELS: Record<SosEmergencyType, string> = {
  fire_flare: "🔥 حريق/اشتعال",
  livestock_trap: "🐄 مواشي محاصرة",
  medical: "🏥 إسعاف طبي",
  water_cutoff: "💧 انقطاع ماء",
};

export type SosHelperDispatch = {
  id: string;
  name: string;
  phone: string;
  distanceKm: number;
  skillsLabel: string;
  communeAr: string;
  whatsappDispatchUrl: string;
};

export type SosDispatchBundle = {
  helpers: SosHelperDispatch[];
  radiusKm: number;
  messageTemplate: string;
};

function buildSosDispatchMessage(input: {
  emergencyType: SosEmergencyType;
  description: string;
  commune: string;
  village?: string;
  reporterName: string;
  reporterPhone?: string;
  lat: number;
  lng: number;
}): string {
  const locationLabel = [
    getCommuneArabicName(input.commune),
    input.village,
  ]
    .filter(Boolean)
    .join(" — ");

  const phoneLine = input.reporterPhone
    ? `هاتف المُبلّغ: ${input.reporterPhone}`
    : "رقم المُبلّغ غير متوفر — راجع المنصة";

  return [
    "🚨 نداء فزعة عاجل — منصة إغاثة جيجل",
    SOS_EMERGENCY_LABELS[input.emergencyType],
    `الموقع: ${locationLabel}`,
    `الوصف: ${input.description}`,
    phoneLine,
    `GPS: ${input.lat.toFixed(5)}, ${input.lng.toFixed(5)}`,
    "واش تقدر تجي فوراً؟",
  ].join("\n");
}

export async function findNearestHelpersForSos(input: {
  lat: number;
  lng: number;
  emergencyType: SosEmergencyType;
  description: string;
  commune: string;
  village?: string;
  reporterName: string;
  reporterPhone?: string;
  limit?: number;
  radiusKm?: number;
}): Promise<SosDispatchBundle> {
  const limit = input.limit ?? 3;
  const radiusKm = input.radiusKm ?? 15;

  const distanceKmExpr = haversineKmSql(
    input.lat,
    input.lng,
    sql`lat`,
    sql`lng`,
  );

  const helperRows = await db.execute<{
    id: number;
    full_name: string;
    phone: string;
    whatsapp_phone: string | null;
    daira: string;
    commune: string;
    skills: unknown;
    availability_notes: string | null;
    distance_km: number;
  }>(sql`
    SELECT
      id,
      full_name,
      phone,
      whatsapp_phone,
      daira,
      commune,
      skills,
      availability_notes,
      ${distanceKmExpr} AS distance_km
    FROM ${communityHelpers}
    WHERE status = 'verified'
    ORDER BY distance_km ASC
    LIMIT ${limit * 4}
  `);

  const messageTemplate = buildSosDispatchMessage(input);

  const helpers: SosHelperDispatch[] = helperRows.rows
    .filter((row) => row.distance_km <= radiusKm)
    .slice(0, limit)
    .map((row) => {
      const contact: NearestContact = mapHelperRowToContact(row);
      const whatsappPhone = row.whatsapp_phone ?? row.phone;
      const dispatchUrl =
        buildWhatsAppUrl(whatsappPhone, messageTemplate) ??
        `https://wa.me/?text=${encodeURIComponent(messageTemplate)}`;

      return {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        distanceKm: Number(row.distance_km.toFixed(1)),
        skillsLabel: parseHelperSkills(row.skills).join(", ") || "متطوع",
        communeAr: getCommuneArabicName(row.commune),
        whatsappDispatchUrl: dispatchUrl,
      };
    });

  return {
    helpers,
    radiusKm,
    messageTemplate,
  };
}
