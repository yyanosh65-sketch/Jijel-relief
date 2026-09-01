import { findHighestDeficitZone, getReliefStatsSummary } from "@/lib/agent/deficit";
import { CRISIS_AGENT_PERSONA } from "@/lib/agent/coordinator-knowledge";
import type { ConvoyCargoType } from "@/db/schema";
import { CONVOY_CARGO_OPTIONS } from "@/lib/convoys";
import { getCommuneArabicName, getDairaArabicName } from "@/lib/locations";

export type OperationsReport = {
  title: string;
  generatedAt: string;
  markdown: string;
  stats: Awaited<ReturnType<typeof getReliefStatsSummary>>;
};

const CARGO_TYPES: ConvoyCargoType[] = [
  "food",
  "farm_equipment",
  "blankets",
  "medicine",
  "mixed",
];

export async function generateDailyOperationsReport(): Promise<OperationsReport> {
  const generatedAt = new Date().toISOString();
  const stats = await getReliefStatsSummary();

  const deficitLines = await Promise.all(
    CARGO_TYPES.map(async (cargoType) => {
      const zone = await findHighestDeficitZone(cargoType);
      const label =
        CONVOY_CARGO_OPTIONS.find((option) => option.value === cargoType)
          ?.labelAr ?? cargoType;

      if (!zone) {
        return `- **${label}**: لا عجز مطابق حالياً`;
      }

      return `- **${label}**: ${getCommuneArabicName(zone.commune)} (دائرة ${getDairaArabicName(zone.daira)}) — ${zone.deficitUnits} وحدة متبقية`;
    }),
  );

  const topZonesLines = stats.topDeficitZones
    .map(
      (zone, index) =>
        `${index + 1}. ${getCommuneArabicName(zone.commune)} — دائرة ${getDairaArabicName(zone.daira)}: **${zone.deficitUnits}** وحدة`,
    )
    .join("\n");

  const markdown = `# تقرير عمليات إغاثة جيجل — يومي

**أُعدّ بواسطة:** ${CRISIS_AGENT_PERSONA.name} (${CRISIS_AGENT_PERSONA.title})  
**التاريخ:** ${new Date(generatedAt).toLocaleString("ar-DZ", { timeZone: "Africa/Algiers" })}

---

## ملخص سريع

| المؤشر | القيمة |
|--------|--------|
| احتياجات مفتوحة | ${stats.openNeeds} |
| نداءات SOS نشطة | ${stats.activeSosAlerts} |
| قوافل قادمة | ${stats.incomingConvoys} |

---

## أعلى مناطق العجز (Top 5)

${topZonesLines || "_لا بيانات_"}

---

## توجيه القوافل حسب نوع الحمولة

${deficitLines.join("\n")}

---

## توصيات ميدانية (${CRISIS_AGENT_PERSONA.name})

1. ركّز القوافل القادمة من ميلة/سطيف على مداخل الجنوب-الشرقي (سيدي معروف / غبالة).
2. المناطق الجبلية (تاكسنة، زيامة، العنصر) تتطلّب مرافقة 4x4 قبل الشاحنات الثقيلة.
3. راجع نداءات SOS النشطة (${stats.activeSosAlerts}) قبل إعادة توجيه الحمولة.

---

_تقرير آلي — للاستخدام الداخلي ولجان الإغاثة الميدانية._
`;

  return {
    title: `تقرير عمليات إغاثة جيجل — ${new Date(generatedAt).toLocaleDateString("ar-DZ")}`,
    generatedAt,
    markdown,
    stats,
  };
}
