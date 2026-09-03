import { and, desc, eq, ne, sql } from "drizzle-orm";

import { getReliefStatsSummary } from "@/lib/agent/deficit";
import { db } from "@/db";
import { activeResponders, needs } from "@/db/schema";
import {
  JIJEL_ENTRY_CORRIDORS,
  ROAD_STATUS_LABELS,
} from "@/lib/road-corridors";
import {
  RESPONDER_ROLE_LABELS,
  emptyBadgeCounts,
  roleToBadgeBucket,
  type ResponderBadgeCounts,
} from "@/lib/responders";
import type { ResponderRole } from "@/db/schema";
import {
  getCommuneArabicName,
  getDairaArabicName,
} from "@/lib/locations";

function summarizeRoles(roles: ResponderRole[]): ResponderBadgeCounts {
  const counts = emptyBadgeCounts();
  for (const role of roles) {
    const bucket = roleToBadgeBucket(role);
    if (!bucket) continue;
    counts[bucket] += 1;
    counts.total += 1;
  }
  return counts;
}

function corridorBriefAr(routes: string[] = ["RN43", "RN77", "CW135"]): string[] {
  return JIJEL_ENTRY_CORRIDORS.filter((c) => routes.includes(c.route)).map(
    (c) =>
      `${c.route} — ${c.labelAr}: ${ROAD_STATUS_LABELS[c.status]} — ${c.noteAr}`,
  );
}

/**
 * Wilaya-level briefing when no need / settlement is selected.
 */
export async function buildWilayaCoordinationBrief(
  query: string,
): Promise<string> {
  const stats = await getReliefStatsSummary();

  const [fulfilledRow] = (
    await db.execute<{ count: string }>(sql`
      SELECT COUNT(*)::text AS count
      FROM ${needs}
      WHERE status = 'fulfilled'
    `)
  ).rows;

  const covered = Number(fulfilledRow?.count ?? 0);
  const pending = stats.openNeeds;
  const topZones = stats.topDeficitZones.slice(0, 3).map(
    (zone) =>
      `${getCommuneArabicName(zone.commune)} (دائرة ${getDairaArabicName(zone.daira)}) — باقي ${zone.deficitUnits} وحدة`,
  );
  const majorAxes = corridorBriefAr(["RN43", "RN27", "RN77"]);

  if (/محاور|RN43|RN27|RN77|طريق|مسلك|حالة المحاور/i.test(query)) {
    return [
      "🚛 المسالك المفتوحة:",
      ...majorAxes.map((line) => `• ${line}`),
      "",
      "⚠️ تنبيه هام:",
      "• الشاحنة الثقيلة: فضّل RN43 الساحلي؛ RN77 جبلي ويفضّل 4x4.",
      "• RN27 عبر الميلية — حركة كثيفة، خطّط التفريغ في سيدي معروف.",
    ].join("\n");
  }

  if (/تضرر|أكثر المناطق|عجز|مناطق/i.test(query)) {
    return [
      "🚨 العجز المتبقي:",
      ...(topZones.length > 0
        ? topZones.map((line) => `• ${line}`)
        : ["• ما كاش مناطق عجز بارزة دوكا."]),
      "",
      "⚠️ تنبيه هام:",
      `• نداءات SOS نشطة: ${stats.activeSosAlerts} · قوافل قادمة: ${stats.incomingConvoys}`,
    ].join("\n");
  }

  return [
    "🚨 العجز المتبقي:",
    `• ولاية جيجل: ${pending} احتياج معلّق (مفتوح/جزئي) · ${covered} مغطّى بالكامل`,
    `• نداءات SOS نشطة: ${stats.activeSosAlerts}`,
    ...(topZones.slice(0, 2).map((line) => `• أولوية: ${line}`)),
    "",
    "🚛 المسالك المفتوحة:",
    ...majorAxes.slice(0, 2).map((line) => `• ${line}`),
    "",
    "⚠️ تنبيه هام:",
    `• قوافل قادمة مسجّلة: ${stats.incomingConvoys} — وزّع الحمولة على أعلى مناطق العجز قبل التكرار.`,
  ].join("\n");
}

/**
 * Builds a Darija operational briefing for field coordination prompts.
 * Uses Arabic place names and scannable section headers for the UI parser.
 * When no needId/settlementId is provided, returns a wilaya-level brief.
 */
export async function buildFieldCoordinationBrief(input: {
  needId?: number | null;
  settlementId?: number | null;
  query: string;
}): Promise<string> {
  const query = input.query.trim();

  if (!input.needId && !input.settlementId) {
    return buildWilayaCoordinationBrief(query);
  }

  const filters = [];
  if (input.needId) filters.push(eq(activeResponders.needId, input.needId));
  if (input.settlementId) {
    filters.push(eq(activeResponders.settlementId, input.settlementId));
  }

  const responderRows =
    filters.length > 0
      ? await db
          .select()
          .from(activeResponders)
          .where(and(...filters, ne(activeResponders.status, "completed")))
          .orderBy(desc(activeResponders.checkedInAt))
      : [];

  const need =
    input.needId != null
      ? await db.query.needs.findFirst({
          where: eq(needs.id, input.needId),
          with: { location: true },
        })
      : null;

  const roles = responderRows.map((r) => r.role);
  const badges = summarizeRoles(roles);
  const remaining = need
    ? Math.max(0, need.quantityNeeded - need.quantityFulfilled)
    : null;

  const onSite = responderRows.filter((r) => r.status === "on_site");
  const enRoute = responderRows.filter((r) => r.status === "en_route");

  const placeAr = need?.location
    ? `${getCommuneArabicName(need.location.name)} — دائرة ${getDairaArabicName(need.location.daira)}`
    : null;

  const surplusWarnings: string[] = [];
  if (badges.medical >= 3) {
    surplusWarnings.push(
      "كاين فائض طبّي تم (3+ أطباء/إسعاف) — فضّل ما تزيدش نفس الدور دوكا.",
    );
  }
  if (badges.logistics >= 3) {
    surplusWarnings.push(
      "لوجستيك والسواقين متوفرين بزاف — شوف واش ينقص غذاء أو يد عاملة.",
    );
  }
  if (badges.food >= 3) {
    surplusWarnings.push(
      "فرق توزيع الغذاء موجودة — ركّز على مسالك التوصيل أو أدوار أخرى.",
    );
  }

  const contacts = onSite.slice(0, 3).map(
    (r) =>
      `${r.fullName} (${RESPONDER_ROLE_LABELS[r.role]}) — ${r.phone}${r.organizationName ? ` · ${r.organizationName}` : ""}`,
  );

  if (/طريق|نوصل|مسلك|RN|4x4|شاحنة/i.test(query)) {
    return [
      "🚛 المسالك المفتوحة:",
      ...corridorBriefAr().map((line) => `• ${line}`),
      "",
      "⚠️ تنبيه هام:",
      "• الشاحنة الثقيلة: فضّل RN43 الساحلي.",
      "• RN77 و CW135 جبليين — أحسن بـ 4x4 خفيفة ومع دليل محلي.",
    ].join("\n");
  }

  if (/نتاصل|شكون|هاتف|منسق|واتساب/i.test(query)) {
    if (contacts.length === 0) {
      return [
        "🚨 العجز المتبقي:",
        "• ما كاش منسّق مسجّل تم دوكا.",
        "",
        "⚠️ تنبيه هام:",
        "• سجّل تواجدك من زر «أنا رايح نعاون تم»، ولا اتصل برقم الاحتياج الأصلي.",
      ].join("\n");
    }
    return [
      "🚨 العجز المتبقي:",
      `• في الميدان دوكا: ${onSite.length} · في الطريق: ${enRoute.length}`,
      "",
      "⚠️ تنبيه هام:",
      ...contacts.map((c) => `• اتصل: ${c}`),
    ].join("\n");
  }

  const gapItems: string[] = [];
  if (need) {
    gapItems.push(`الاحتياج: ${need.title}${placeAr ? ` @ ${placeAr}` : ""}`);
    gapItems.push(
      `التغطية: ${need.quantityFulfilled}/${need.quantityNeeded} (باقي ${remaining})`,
    );
  } else {
    gapItems.push("ما عندناش بطاقة احتياج مربوطة — نعتمد على فرق التدخل فقط.");
  }
  gapItems.push(
    `الأدوار تم: 🩺 ${badges.medical} · 🚚 ${badges.logistics} · 🍞 ${badges.food}`,
  );
  if (badges.medical === 0 && need?.category === "medical") {
    gapItems.push("ناقص غطاء طبي — أولوية لطبيب/ممرض.");
  }
  if (
    badges.food === 0 &&
    (need?.category === "food" || need?.category === "water")
  ) {
    gapItems.push("ناقص توزيع غذاء/ماء في الموقع.");
  }
  if (badges.logistics === 0 && remaining && remaining > 10) {
    gapItems.push("الكمية كبيرة وباقي ما كاش سائق لوجستيك معلن.");
  }
  if (badges.total === 0) {
    gapItems.push("الموقع فاضي من فرق معلنة — أي حضور ميداني يفرق.");
  }

  return [
    "🚨 العجز المتبقي:",
    ...gapItems.slice(0, 3).map((line) => `• ${line}`),
    "",
    "🚛 المسالك المفتوحة:",
    ...corridorBriefAr()
      .slice(0, 2)
      .map((line) => `• ${line}`),
    "",
    "⚠️ تنبيه هام:",
    ...(surplusWarnings.length > 0
      ? surplusWarnings.slice(0, 2).map((line) => `• ${line}`)
      : ["• ما كاش فائض أدوار واضح — تقدر تدخل بالدور اللي ينقص."]),
  ].join("\n");
}
