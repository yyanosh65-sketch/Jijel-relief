import { z } from "zod";

import { db } from "@/db";
import { locations, needs, urgentAlerts } from "@/db/schema";
import { extractFacebookUrl } from "@/lib/feed-facebook";
import { createEmergencyNotification } from "@/lib/emergency-notifications";
import { getCommuneArabicName, getDairaForCommune } from "@/lib/locations";
import { normalizeAlgerianPhone, isValidAlgerianPhone } from "@/lib/phone";
import { revalidatePath } from "next/cache";

export const submitReportSchema = z.object({
  description: z.string().trim().min(10, "الوصف قصير جداً"),
  commune: z.string().trim().min(1, "البلدية مطلوبة"),
  village: z.string().trim().optional(),
  contactName: z.string().trim().min(2).optional(),
  contactPhone: z.string().trim().min(8, "رقم الهاتف مطلوب"),
  urgency: z.enum(["critical", "high", "medium"]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  reportType: z.enum(["need", "sos"]).default("need"),
});

export type SubmitReportInput = z.infer<typeof submitReportSchema>;

export async function submitCommunityReport(
  input: SubmitReportInput,
): Promise<{ ok: true; id: number; kind: "need" | "sos_alert" } | { ok: false; error: string }> {
  const parsed = submitReportSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة",
    };
  }

  const data = parsed.data;

  if (!isValidAlgerianPhone(data.contactPhone)) {
    return { ok: false, error: "رقم الهاتف غير صالح." };
  }

  const phone = normalizeAlgerianPhone(data.contactPhone);
  const daira = getDairaForCommune(data.commune) ?? "Jijel";
  const communeAr = getCommuneArabicName(data.commune);
  const facebookUrl = extractFacebookUrl(data.description);
  const lat = data.lat ?? 36.75;
  const lng = data.lng ?? 6.05;
  const locationLabel = data.village
    ? `${communeAr} — ${data.village}`
    : communeAr;
  const title =
    data.reportType === "sos" || data.urgency === "critical"
      ? `نداء استغاثة — ${locationLabel}`
      : `نداء إغاثة — ${locationLabel}`;

  try {
    if (data.reportType === "sos" || data.urgency === "critical") {
      const [alert] = await db
        .insert(urgentAlerts)
        .values({
          emergencyType: "medical",
          description: data.description,
          reporterName: data.contactName ?? "مواطن",
          reporterPhone: phone,
          daira,
          commune: data.commune,
          village: data.village ?? null,
          lat: String(lat),
          lng: String(lng),
          status: "active",
          mediaUrls: facebookUrl ? [facebookUrl] : [],
          facebookUrl,
        })
        .returning({ id: urgentAlerts.id });

      await createEmergencyNotification({
        title,
        message: data.description,
        commune: data.commune,
        communeAr,
        village: data.village ?? null,
        phone,
        facebookUrl,
        urgency: data.urgency,
        category: "medical",
        sourceKind: "sos_alert",
        sourceId: alert.id,
      });

      revalidatePath("/");
      revalidatePath("/map");

      return { ok: true, id: alert.id, kind: "sos_alert" };
    }

    const [location] = await db
      .insert(locations)
      .values({
        name: locationLabel,
        daira,
        address: data.village ?? null,
        lat: String(lat),
        lng: String(lng),
      })
      .returning();

    const [need] = await db
      .insert(needs)
      .values({
        locationId: location.id,
        title,
        description: data.description,
        category: "other",
        urgency: data.urgency,
        quantityNeeded: 1,
        contactName: data.contactName ?? "منسق ميداني",
        contactPhone: phone,
        contactWhatsapp: phone,
        mediaUrls: facebookUrl ? [facebookUrl] : [],
        facebookUrl,
      })
      .returning({ id: needs.id });

    if (data.urgency === "high") {
      await createEmergencyNotification({
        title,
        message: data.description,
        commune: data.commune,
        communeAr,
        village: data.village ?? null,
        phone,
        facebookUrl,
        urgency: data.urgency,
        category: "other",
        sourceKind: "aid_need",
        sourceId: need.id,
      });
    }

    revalidatePath("/");
    revalidatePath("/map");
    revalidatePath("/report");

    return { ok: true, id: need.id, kind: "need" };
  } catch (error) {
    console.error("submitCommunityReport error:", error);
    return { ok: false, error: "تعذر حفظ النداء. حاول مرة أخرى." };
  }
}
