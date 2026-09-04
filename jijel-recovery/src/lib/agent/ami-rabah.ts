import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { locations, mountainTrails, needs, volunteers } from "@/db/schema";
import {
  AMI_RABAH,
  AMI_RABAH_SYSTEM_PROMPT,
} from "@/lib/agent/ami-rabah-persona";
import { getCommuneArabicName } from "@/lib/locations";
import {
  JIJEL_ENTRY_CORRIDORS,
  ROAD_STATUS_LABELS,
} from "@/lib/road-corridors";
import { WILAYA_DEFINITIONS, type WilayaCode } from "@/lib/wilaya";

export {
  AMI_RABAH,
  AMI_RABAH_PROMPTS,
  AMI_RABAH_SYSTEM_PROMPT,
} from "@/lib/agent/ami-rabah-persona";

export type AmiCriticalNeed = {
  id: number;
  title: string;
  urgency: string;
  remaining: number;
  commune: string;
  communeAr: string;
  wilaya: WilayaCode;
  lat: number;
  lng: number;
};

export type AmiVolunteer4x4 = {
  id: number;
  fullName: string;
  phone: string;
  commune: string;
  wilaya: WilayaCode;
};

export type AmiOperationalContext = {
  criticalNeeds: AmiCriticalNeed[];
  volunteers4x4: AmiVolunteer4x4[];
  blockedTrails: Array<{
    roadCode: string;
    clearanceLevel: string;
    notes: string | null;
    lat: number;
    lng: number;
  }>;
};

function flyToTag(lat: number, lng: number, zoom = 13): string {
  return `<<<ACTION:${JSON.stringify({ type: "FLY_TO", lat, lng, zoom })}>>>`;
}

function telLink(phone: string, label?: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `[📞 ${label ?? phone}](tel:${digits})`;
}

/** Live DB snapshot injected into Ami Rabah replies / LLM context. */
export async function getAmiRabahOperationalContext(): Promise<AmiOperationalContext> {
  const needRows = await db
    .select({
      id: needs.id,
      title: needs.title,
      urgency: needs.urgency,
      quantityNeeded: needs.quantityNeeded,
      quantityFulfilled: needs.quantityFulfilled,
      wilaya: needs.wilaya,
      commune: locations.name,
      lat: locations.lat,
      lng: locations.lng,
    })
    .from(needs)
    .innerJoin(locations, eq(needs.locationId, locations.id))
    .where(
      and(
        inArray(needs.status, ["open", "partial"]),
        inArray(needs.urgency, ["critical", "high"]),
      ),
    )
    .orderBy(desc(sql`(${needs.quantityNeeded} - ${needs.quantityFulfilled})`))
    .limit(5);

  const criticalNeeds: AmiCriticalNeed[] = needRows
    .map((row) => ({
      id: row.id,
      title: row.title,
      urgency: row.urgency,
      remaining: Math.max(row.quantityNeeded - row.quantityFulfilled, 0),
      commune: row.commune,
      communeAr: getCommuneArabicName(row.commune) || row.commune,
      wilaya: row.wilaya,
      lat: Number(row.lat),
      lng: Number(row.lng),
    }))
    .sort((a, b) => {
      const rank = (u: string) => (u === "critical" ? 0 : u === "high" ? 1 : 2);
      const urg = rank(a.urgency) - rank(b.urgency);
      return urg !== 0 ? urg : b.remaining - a.remaining;
    })
    .slice(0, 5);

  const volunteerRows = await db
    .select({
      id: volunteers.id,
      fullName: volunteers.fullName,
      phone: volunteers.phone,
      commune: volunteers.commune,
      wilaya: volunteers.wilaya,
    })
    .from(volunteers)
    .where(
      and(
        eq(volunteers.vehicleType, "suv_4x4"),
        eq(volunteers.isAvailable, true),
      ),
    )
    .orderBy(desc(volunteers.createdAt))
    .limit(5);

  const trailRows = await db
    .select({
      roadCode: mountainTrails.roadCode,
      clearanceLevel: mountainTrails.clearanceLevel,
      notes: mountainTrails.notes,
      lat: mountainTrails.lat,
      lng: mountainTrails.lng,
    })
    .from(mountainTrails)
    .where(
      inArray(mountainTrails.clearanceLevel, [
        "completely_blocked",
        "strict_4x4_required",
      ]),
    )
    .orderBy(desc(mountainTrails.updatedAt))
    .limit(8);

  return {
    criticalNeeds,
    volunteers4x4: volunteerRows,
    blockedTrails: trailRows.map((row) => ({
      roadCode: row.roadCode,
      clearanceLevel: row.clearanceLevel,
      notes: row.notes,
      lat: Number(row.lat),
      lng: Number(row.lng),
    })),
  };
}

export function formatAmiRabahContextBlock(
  ctx: AmiOperationalContext,
): string {
  const needsBlock =
    ctx.criticalNeeds.length === 0
      ? "• ما كاش احتياجات حرجة معلّقة دوكا."
      : ctx.criticalNeeds
          .map(
            (n, i) =>
              `${i + 1}) ${n.title} — ${n.communeAr} (${n.wilaya}) عجز ${n.remaining} · ${n.lat},${n.lng}`,
          )
          .join("\n");

  const volunteersBlock =
    ctx.volunteers4x4.length === 0
      ? "• ما كاش 4x4 متاحين دوكا."
      : ctx.volunteers4x4
          .map(
            (v, i) =>
              `${i + 1}) ${v.fullName} — ${v.commune} · هاتف ${v.phone}`,
          )
          .join("\n");

  return [
    "=== سياق عمي رابح الميداني ===",
    "أعلى 5 احتياجات حرجة:",
    needsBlock,
    "",
    "أقرب 5 متطوعين 4x4 متاحين:",
    volunteersBlock,
  ].join("\n");
}

/** Clean WhatsApp / SMS sitrep across wilayas. */
export function formatWhatsAppSitrep(ctx: AmiOperationalContext): string {
  const byWilaya = new Map<string, AmiCriticalNeed[]>();
  for (const need of ctx.criticalNeeds) {
    const list = byWilaya.get(need.wilaya) ?? [];
    list.push(need);
    byWilaya.set(need.wilaya, list);
  }

  const lines: string[] = [
    "📋 *تقرير وضعية القوافل — إغاثة الشرق*",
    `من: ${AMI_RABAH.fullTitleAr}`,
    `⏱ ${new Date().toLocaleString("ar-DZ")}`,
    "",
  ];

  if (ctx.criticalNeeds.length === 0) {
    lines.push("✅ ما كاش عجز حرج معلّق في اللحظة الحالية.");
  } else {
    lines.push("🚨 *العجز الحرج:*");
    for (const [code, items] of byWilaya) {
      const label =
        WILAYA_DEFINITIONS[code as WilayaCode]?.labelAr ?? code;
      lines.push(`• *ولاية ${label}*`);
      for (const item of items) {
        lines.push(
          `  - ${item.communeAr}: ${item.title} (باقي ${item.remaining})`,
        );
      }
    }
  }

  lines.push("");
  lines.push("🚙 *4x4 المتاحين:*");
  if (ctx.volunteers4x4.length === 0) {
    lines.push("• لا وحدات مسجّلة متاحة حالياً.");
  } else {
    for (const v of ctx.volunteers4x4) {
      lines.push(`• ${v.fullName} — ${v.commune} — ${v.phone}`);
    }
  }

  lines.push("");
  lines.push("🚧 *المحاور:*");
  for (const c of JIJEL_ENTRY_CORRIDORS) {
    if (c.status === "open") continue;
    lines.push(`• ${c.route}: ${ROAD_STATUS_LABELS[c.status]} — ${c.noteAr}`);
  }

  lines.push("");
  lines.push("الحماية المدنية: 14 | إغاثة جيجل");
  return lines.join("\n");
}

function replyHighestDeficit(ctx: AmiOperationalContext): string {
  const top = ctx.criticalNeeds[0];
  if (!top) {
    return [
      "🚨 العجز المتبقي:",
      "• ما كاش نقطة حرجة معلّقة دوكا — راقب التحديثات.",
      "",
      "⚠️ تنبيه هام:",
      "• بقّى جاهز للتدخل السريع إذا طلع نداء جديد.",
    ].join("\n");
  }

  const others = ctx.criticalNeeds.slice(1, 3);
  return [
    "🚨 العجز المتبقي:",
    `• الأكبر دوكا: ${top.title} في ${top.communeAr} — باقي ${top.remaining} وحدة (${top.urgency}).`,
    ...others.map(
      (n) => `• بعده: ${n.communeAr} — ${n.title} (باقي ${n.remaining})`,
    ),
    "",
    "🚛 المسالك المفتوحة:",
    "• فضّل RN43 للشاحنات · RN77/CW135 للـ4x4 فقط.",
    "",
    "⚠️ تنبيه هام:",
    `• روح للخريطة على ${top.communeAr} قبل ما تبعث القافلة.`,
    flyToTag(top.lat, top.lng, 13),
  ].join("\n");
}

function replyMatch4x4(ctx: AmiOperationalContext): string {
  const hotspot = ctx.criticalNeeds[0];
  const fleet = ctx.volunteers4x4;

  if (fleet.length === 0) {
    return [
      "🚙 فك العزلة:",
      "• ما لقيناش 4x4 متاحين في السجل دوكا.",
      "• سجّل وسيلة جديدة من القائمة أو اتصل بالحماية المدنية 14.",
      hotspot ? flyToTag(hotspot.lat, hotspot.lng, 12) : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const lines = [
    "🚙 أقرب 4x4 لفك العزلة:",
    hotspot
      ? `• النقطة الحرجة: ${hotspot.title} @ ${hotspot.communeAr}`
      : "• ما كاش نقطة حرجة — هاذوما المتاحين للتدخل العام:",
    "",
  ];

  for (const v of fleet.slice(0, 5)) {
    lines.push(
      `• ${v.fullName} — ${v.commune} — ${telLink(v.phone, v.phone)}`,
    );
  }

  if (hotspot) {
    lines.push("");
    lines.push("⚠️ تنبيه هام:");
    lines.push(`• وجّه أول اتصال نحو أقرب متطوع لـ ${hotspot.communeAr}.`);
    lines.push(flyToTag(hotspot.lat, hotspot.lng, 13));
  }

  return lines.join("\n");
}

function replyBlockedRoutes(ctx: AmiOperationalContext): string {
  const corridorHard = JIJEL_ENTRY_CORRIDORS.filter(
    (c) => c.status === "difficult_4x4" || c.status === "heavy_traffic",
  );

  const lines = [
    "🚧 المسالك المقطوعة / الصعبة:",
    ...corridorHard.map(
      (c) => `• ${c.route} — ${ROAD_STATUS_LABELS[c.status]}: ${c.noteAr}`,
    ),
  ];

  if (ctx.blockedTrails.length > 0) {
    lines.push("");
    lines.push("مسالك جبلية من التقارير الميدانية:");
    for (const trail of ctx.blockedTrails.slice(0, 5)) {
      const label =
        trail.clearanceLevel === "completely_blocked"
          ? "مقطوع كلياً"
          : "يتطلب 4x4 صارم";
      lines.push(
        `• ${trail.roadCode}: ${label}${trail.notes ? ` — ${trail.notes}` : ""}`,
      );
    }
    const first = ctx.blockedTrails[0];
    if (first && Number.isFinite(first.lat) && Number.isFinite(first.lng)) {
      lines.push(flyToTag(first.lat, first.lng, 12));
    }
  } else {
    lines.push("");
    lines.push("• ما كاش بلاغ مسلك جبلي مقطوع جديد في القاعدة.");
  }

  lines.push("");
  lines.push("⚠️ تنبيه هام:");
  lines.push("• الشاحنة الثقيلة: RN43 فقط · الجبل: 4x4 خفيفة.");

  return lines.join("\n");
}

function replySitrep(ctx: AmiOperationalContext): string {
  const sitrep = formatWhatsAppSitrep(ctx);
  const top = ctx.criticalNeeds[0];
  return [
    "📋 تقرير الوضعية جاهز للنسخ إلى واتساب:",
    "",
    sitrep,
    "",
    "⚠️ تنبيه هام:",
    "• استعمل زر «نسخ تقرير القوافل 📋» تحت الرسالة لإرساله للمجموعات.",
    top ? flyToTag(top.lat, top.lng, 11) : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Deterministic Ami Rabah replies for high-yield field chips / intents.
 * Returns null when the query should fall through to the generic brief + LLM.
 */
export async function buildAmiRabahIntentReply(
  query: string,
): Promise<{ text: string; sitrep?: string; intent: string } | null> {
  const q = query.trim();
  const ctx = await getAmiRabahOperationalContext();

  if (/عجز الأكبر|وين راه العجز|highest.*deficit|عجز أكبر/i.test(q)) {
    return { text: replyHighestDeficit(ctx), intent: "deficit" };
  }

  if (/4x4|فك عزلة|اقترحلي أقرب/i.test(q)) {
    return { text: replyMatch4x4(ctx), intent: "match4x4" };
  }

  if (/تقرير الوضعية|واتساب|sitrep|انسخ تقرير/i.test(q)) {
    return {
      text: replySitrep(ctx),
      sitrep: formatWhatsAppSitrep(ctx),
      intent: "sitrep",
    };
  }

  if (/مقطوع|مسالك|طريق مسدود|impassable|واش من مسالك/i.test(q)) {
    return { text: replyBlockedRoutes(ctx), intent: "routes" };
  }

  if (/مساعدة|نقل|توصيل|سيارة|سائق|متطوع/i.test(q)) {
    return { text: replyMatch4x4(ctx), intent: "transport" };
  }

  return null;
}