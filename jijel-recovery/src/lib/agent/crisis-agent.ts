import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import {
  generateText,
  stepCountIs,
  tool,
  type LanguageModel,
  type ModelMessage,
} from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  convoyCargoTypeEnum,
  locations,
  needCategoryEnum,
  needs,
  needUrgencyEnum,
  urgentAlerts,
  type ConvoyEntryPoint,
  type SosEmergencyType,
} from "@/db/schema";
import {
  buildJijelLocationIndex,
  resolveAgentLocation,
  type ResolvedAgentLocation,
} from "@/lib/agent-location";
import {
  checkMountainRoadStatus,
  CRISIS_AGENT_PERSONA,
  enrichConvoyDestination,
  getFieldContactsForDaira,
  JIJEL_ENTRY_POINTS_AR,
  KNOWN_DOUARS,
} from "@/lib/agent/coordinator-knowledge";
import {
  findHighestDeficitZone,
  getReliefStatsSummary,
  resolveDairaForCommune,
} from "@/lib/agent/deficit";
import villageIntelligence from "@/data/village-intelligence.json";

export type CrisisAgentProvider = "google" | "openai";

const EXTRACT_AID_NEED_SCHEMA = z.object({
  rawText: z.string().describe("النص الخام المستخرج من المنشور أو التسجيل الصوتي"),
});

const EXTRACTED_ENTITY_SCHEMA = z.object({
  entityType: z.enum(["aid_need", "sos_alert"]),
  title: z.string(),
  description: z.string(),
  category: z.enum(needCategoryEnum.enumValues),
  urgency: z.enum(needUrgencyEnum.enumValues),
  quantityNeeded: z.number().int().positive(),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  commune: z.string(),
  villageName: z.string().optional(),
  damageKeywords: z.array(z.string()),
  requires4x4: z.boolean(),
  emergencyType: z
    .enum(["fire_flare", "livestock_trap", "medical", "water_cutoff"])
    .optional(),
  confidence: z.enum(["high", "medium", "low"]),
});

const GEO_LOCATE_SCHEMA = z.object({
  villageQuery: z
    .string()
    .describe("اسم الدوار أو القرية أو البلدية كما ورد في النص"),
  communeHint: z.string().optional().describe("تلميح اختياري عن البلدية أو الدائرة"),
});

const CONVOY_DESTINATION_SCHEMA = z.object({
  cargoType: z.enum(convoyCargoTypeEnum.enumValues),
  notes: z.string().optional(),
});

export type ExtractedAidNeed = z.infer<typeof EXTRACTED_ENTITY_SCHEMA>;

export type GeoLocatedVillage = ResolvedAgentLocation & {
  query: string;
  matchedLabel: string;
  confidence: "high" | "medium" | "low";
  source: "commune_index" | "dossier" | "fallback";
};

export type CrisisAgentToolName =
  | "extractAidNeed"
  | "geoLocateVillage"
  | "suggestConvoyDestination"
  | "getReliefStats"
  | "getLocalFieldContacts"
  | "checkMountainRoads";

const DOUAR_KNOWLEDGE_BLOCK = KNOWN_DOUARS.map(
  (douar) => `- ${douar.aliases[0]} (${douar.communeAr}): ${douar.notes}`,
).join("\n");

const CRISIS_AGENT_SYSTEM = `أنت «${CRISIS_AGENT_PERSONA.name}» — ${CRISIS_AGENT_PERSONA.title}.
تتكلّم كمنسّق ميداني جزائري أصيل: مباشر، دافئ، وعملي. تخاطب السائقين والمتطوعين والمواطنين بلا لغة رسمية ثقيلة.
تقول «خويا»، «راه»، «شحال»، «وين»، «لازم» بشكل طبيعي — بدون مبالغة مسرحية.

معرفة جغرافية عميقة بولاية جيجل:
- المداخل الأربعة للقوافل: ${JIJEL_ENTRY_POINTS_AR.join(" | ")}
- دواوير ومعالم تعرفها: 
${DOUAR_KNOWLEDGE_BLOCK}

قواعد العمل:
- استخدم الأدوات قبل الإجابة — لا تخمّن أرقام الهاتف ولا حالة الطرق.
- عند توجيه قافلة (suggestConvoyDestination): اذكر الوجهة، المدخل، صعوبة التضاريس (4x4 ولا شاحنة ثقيلة)، اسم المنسّق المحلي، ورقمه الموثّق.
- عند طلب جهات اتصال أو فرق 4x4 لدائرة معيّنة: استخدم getLocalFieldContacts.
- عند سؤال عن مسالك جبلية مقطوعة (تاكسنة، إراقن، تبلوط…): استخدم checkMountainRoads.
- عند إحصائيات الإغاثة: استخدم getReliefStats.
- لخّص في 3–6 جمل عملية، مع أرقام واضحة يمكن نسخها للواتساب.`;

const FEED_AGENT_SYSTEM = `أنت «${CRISIS_AGENT_PERSONA.name}» تحلّل نداءات فيسبوك لمنصة إغاثة جيجل.
1. استدعِ extractAidNeed لتحليل المنشور.
2. استدعِ geoLocateVillage لتحديد إحداثيات الدوار/البلدية.
3. لخّص للمشغّل بالعربية الدارجة الجيجلية — مختصر وواضح.`;

function normalizeArabic(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function getConfiguredCrisisAgentProvider(): CrisisAgentProvider | null {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "google";
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  return null;
}

export function getCrisisAgentModel(): LanguageModel | null {
  const provider = getConfiguredCrisisAgentProvider();
  if (provider === "google") {
    return google("gemini-2.5-flash");
  }
  if (provider === "openai") {
    return openai("gpt-4o-mini");
  }
  return null;
}

export function assertCrisisAgentModel(): LanguageModel {
  const model = getCrisisAgentModel();
  if (!model) {
    throw new Error(
      "لم يتم ضبط مفتاح GOOGLE_GENERATIVE_AI_API_KEY أو OPENAI_API_KEY.",
    );
  }
  return model;
}

function inferEmergencyType(keywords: string[]): SosEmergencyType {
  const joined = keywords.join(" ").toLowerCase();
  if (/حريق|نار|اشتعال/.test(joined)) return "fire_flare";
  if (/مواشي|نحل|اغنام|أغنام|بقر/.test(joined)) return "livestock_trap";
  if (/ماء|مضخة|صهريج|انقطاع/.test(joined)) return "water_cutoff";
  return "medical";
}

function heuristicExtractAidNeed(rawText: string): ExtractedAidNeed {
  const phoneMatch = rawText.match(/0[567]\d{8}/);
  const keywords: string[] = [];
  const hazardPatterns = [
    /حريق/,
    /مواشي/,
    /نحل/,
    /ماء/,
    /سقف/,
    /زيتون/,
    /إسعاف/,
  ];
  for (const pattern of hazardPatterns) {
    const match = rawText.match(pattern);
    if (match) keywords.push(match[0]);
  }

  const isSos = /استغاث|SOS|عاجل|محاصر|حريق|إسعاف/i.test(rawText);
  const communeGuess =
    rawText.match(/(?:بلدية|دائرة|قرية|دوار)\s+([^\n،,.]{2,40})/i)?.[1] ??
    "جيجل";

  return {
    entityType: isSos ? "sos_alert" : "aid_need",
    title: rawText.slice(0, 80).trim() || "احتياج ميداني",
    description: rawText.slice(0, 1000).trim(),
    category: /ماء|صهريج|مضخة/.test(rawText)
      ? "water"
      : /مواشي|نحل|أعلاف/.test(rawText)
        ? "food"
        : /سقف|زنك|إسمنت/.test(rawText)
          ? "shelter"
          : "other",
    urgency: isSos ? "critical" : "high",
    quantityNeeded: 1,
    contactName: undefined,
    contactPhone: phoneMatch?.[0],
    commune: communeGuess,
    villageName:
      rawText.match(/(?:دوار|دشرة|قرية)\s+([^\n،,.]{2,40})/i)?.[1] ?? undefined,
    damageKeywords: keywords.length > 0 ? keywords : ["حاجة عامة"],
    requires4x4: /4x4|جبلي|وعر|مسلك/.test(rawText),
    emergencyType: inferEmergencyType(keywords),
    confidence: phoneMatch ? "medium" : "low",
  };
}

export function geoLocateVillage(
  villageQuery: string,
  communeHint?: string,
): GeoLocatedVillage {
  const normalizedQuery = normalizeArabic(villageQuery);
  const index = buildJijelLocationIndex();

  for (const dossier of villageIntelligence.dossiers) {
    const candidates = [dossier.name_ar, dossier.name, dossier.daira_ar].map(
      normalizeArabic,
    );
    if (candidates.some((candidate) => candidate.includes(normalizedQuery))) {
      return {
        query: villageQuery,
        matchedLabel: dossier.name_ar,
        commune: dossier.name,
        commune_ar: dossier.name_ar,
        daira: dossier.daira,
        daira_ar: dossier.daira_ar,
        lat: dossier.lat,
        lng: dossier.lng,
        confidence: "high",
        source: "dossier",
      };
    }
  }

  for (const entry of index) {
    const communeNorm = normalizeArabic(entry.commune_ar);
    if (
      communeNorm.includes(normalizedQuery) ||
      normalizedQuery.includes(communeNorm)
    ) {
      return {
        query: villageQuery,
        matchedLabel: entry.commune_ar,
        commune: entry.commune,
        commune_ar: entry.commune_ar,
        daira: entry.daira,
        daira_ar: entry.daira_ar,
        lat: entry.lat,
        lng: entry.lng,
        confidence: "high",
        source: "commune_index",
      };
    }
  }

  const resolved = resolveAgentLocation(communeHint ?? villageQuery);
  return {
    query: villageQuery,
    matchedLabel: communeHint ?? villageQuery,
    ...resolved,
    confidence: communeHint ? "medium" : "low",
    source: "fallback",
  };
}

export function createCrisisAgentTools() {
  return {
    extractAidNeed: tool({
      description:
        "تحليل نص أو تسجيل غير مهيكل واستخراج كيانات الكوارث (احتياج إغاثة أو نداء SOS)",
      inputSchema: EXTRACT_AID_NEED_SCHEMA,
      execute: async ({ rawText }) => {
        return heuristicExtractAidNeed(rawText);
      },
    }),
    geoLocateVillage: tool({
      description:
        "تحويل أسماء الدواوير والقرى الغامضة في جيجل إلى إحداثيات lat/lng",
      inputSchema: GEO_LOCATE_SCHEMA,
      execute: async ({ villageQuery, communeHint }) => {
        return geoLocateVillage(villageQuery, communeHint);
      },
    }),
    suggestConvoyDestination: tool({
      description:
        "اقتراح المنطقة ذات أعلى عجز مطابقة لنوع حمولة القافلة القادمة، مع منسّق محلي ورقم هاتف وصعوبة التضاريس",
      inputSchema: CONVOY_DESTINATION_SCHEMA,
      execute: async ({ cargoType, notes }) => {
        const zone = await findHighestDeficitZone(cargoType);
        if (!zone) {
          return {
            found: false,
            message: "ما لقيناش منطقة بعجز مطابق دابا.",
            notes: notes ?? null,
          };
        }

        const enrichment = enrichConvoyDestination({
          commune: zone.commune,
          daira: zone.daira,
          recommendedEntryPoint: zone.recommendedEntryPoint as ConvoyEntryPoint,
          recommendedEntryPointAr: zone.recommendedEntryPointAr,
        });

        return {
          found: true,
          ...zone,
          communeAr: enrichment.communeAr,
          dairaAr: enrichment.dairaAr,
          terrain: enrichment.terrain,
          localCoordinator: enrichment.localCoordinator,
          entranceCoordinator: enrichment.entranceCoordinator,
          notes: notes ?? null,
          coordinatorBriefAr: enrichment.localCoordinator
            ? `${enrichment.localCoordinator.nameAr} — ${enrichment.localCoordinator.phone}${enrichment.localCoordinator.verified ? " (موثّق)" : ""} — ${enrichment.terrain.vehicleRecommendationAr}`
            : enrichment.terrain.vehicleRecommendationAr,
        };
      },
    }),
    getLocalFieldContacts: tool({
      description:
        "جلب جهات الاتصال الميدانية وفرق 4x4 لدائرة أو منطقة معيّنة في جيجل",
      inputSchema: z.object({
        dairaQuery: z
          .string()
          .describe("اسم الدائرة مثل العنصر، الطاهير، تكسنة، جمعة بني حبيبي"),
        require4x4: z
          .boolean()
          .optional()
          .describe("عرض فرق 4x4 فقط"),
        contactType: z
          .enum(["field_team", "village_lead", "relief_hub", "all"])
          .default("field_team"),
      }),
      execute: async ({ dairaQuery, require4x4, contactType }) => {
        const contacts = getFieldContactsForDaira({
          dairaQuery,
          require4x4,
          contactType,
        });
        return {
          dairaQuery,
          count: contacts.length,
          contacts,
        };
      },
    }),
    checkMountainRoads: tool({
      description:
        "التحقق من حالة المسالك الجبلية والطرق المقطوعة في منطقة أو دوار معيّن",
      inputSchema: z.object({
        areaQuery: z
          .string()
          .describe("منطقة مثل تاكسنة، إراقن، تبلوط، زيامة، العنصر"),
      }),
      execute: async ({ areaQuery }) => checkMountainRoadStatus(areaQuery),
    }),
    getReliefStats: tool({
      description: "إحصائيات سريعة عن الاحتياجات المفتوحة ونداءات SOS والقوافل",
      inputSchema: z.object({
        scope: z.enum(["wilaya", "summary"]).default("summary"),
      }),
      execute: async () => getReliefStatsSummary(),
    }),
  };
}

export type SavedFeedRecord =
  | { kind: "aid_need"; id: number; locationId: number }
  | { kind: "sos_alert"; id: number };

export async function persistExtractedFeedEntities(input: {
  extracted: ExtractedAidNeed;
  geo: GeoLocatedVillage;
  sourceText: string;
}): Promise<SavedFeedRecord> {
  const { extracted, geo, sourceText } = input;
  const daira = resolveDairaForCommune(geo.commune);

  if (extracted.entityType === "sos_alert") {
    const [saved] = await db
      .insert(urgentAlerts)
      .values({
        emergencyType: extracted.emergencyType ?? inferEmergencyType(extracted.damageKeywords),
        description: `${extracted.description} | ${extracted.requires4x4 ? "⚠️ مسلك وعر 4x4" : "طريق سالك"}`,
        reporterName: extracted.contactName ?? "رصد تلقائي عبر الوكيل الذكي",
        reporterPhone: extracted.contactPhone ?? null,
        daira,
        commune: geo.commune,
        village: extracted.villageName ?? geo.matchedLabel,
        lat: String(geo.lat),
        lng: String(geo.lng),
        status: "active",
        mediaUrls: [],
      })
      .returning({ id: urgentAlerts.id });

    revalidatePath("/");
    revalidatePath("/map");
    return { kind: "sos_alert", id: saved.id };
  }

  const [location] = await db
    .insert(locations)
    .values({
      name: geo.commune,
      daira,
      address: extracted.villageName ?? geo.matchedLabel,
      lat: String(geo.lat),
      lng: String(geo.lng),
    })
    .returning();

  const [need] = await db
    .insert(needs)
    .values({
      locationId: location.id,
      title: extracted.title,
      description: extracted.description,
      category: extracted.category,
      urgency: extracted.urgency,
      status: "open",
      quantityNeeded: extracted.quantityNeeded,
      quantityFulfilled: 0,
      contactName: extracted.contactName ?? "منشور مجتمعي",
      contactPhone: extracted.contactPhone ?? null,
      contactWhatsapp: extracted.contactPhone ?? null,
      mediaUrls: [],
    })
    .returning({ id: needs.id });

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/report");

  return { kind: "aid_need", id: need.id, locationId: location.id };
}

export { CRISIS_AGENT_PERSONA } from "@/lib/agent/coordinator-knowledge";

export async function runCrisisAgentChat(input: {
  messages: ModelMessage[];
}): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
}> {
  const result = await generateText({
    model: assertCrisisAgentModel(),
    system: CRISIS_AGENT_SYSTEM,
    messages: input.messages,
    tools: createCrisisAgentTools(),
    stopWhen: stepCountIs(6),
  });

  return {
    text: result.text,
    toolResults: result.toolResults.map((entry) => ({
      toolName: entry.toolName,
      output: entry.output,
    })),
  };
}

export async function processSocialFeed(rawText: string): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
  extracted: ExtractedAidNeed | null;
  geo: GeoLocatedVillage | null;
  saved: SavedFeedRecord | null;
  structured: {
    entityType: string | null;
    title: string | null;
    commune: string | null;
    communeAr: string | null;
    daira: string | null;
    village: string | null;
    phone: string | null;
    urgency: string | null;
    lat: number | null;
    lng: number | null;
    recordId: number | null;
    recordKind: SavedFeedRecord["kind"] | null;
  };
}> {
  const result = await generateText({
    model: assertCrisisAgentModel(),
    system: FEED_AGENT_SYSTEM,
    prompt: rawText,
    tools: createCrisisAgentTools(),
    stopWhen: stepCountIs(5),
  });

  const toolResults = result.toolResults.map((entry) => ({
    toolName: entry.toolName,
    output: entry.output,
  }));

  const extracted =
    (toolResults.find((entry) => entry.toolName === "extractAidNeed")
      ?.output as ExtractedAidNeed | undefined) ??
    heuristicExtractAidNeed(rawText);

  const geo =
    (toolResults.find((entry) => entry.toolName === "geoLocateVillage")
      ?.output as GeoLocatedVillage | undefined) ??
    geoLocateVillage(extracted.villageName ?? extracted.commune, extracted.commune);

  let saved: SavedFeedRecord | null = null;
  if (extracted.description.trim()) {
    saved = await persistExtractedFeedEntities({
      extracted,
      geo,
      sourceText: rawText,
    });
  }

  return {
    text: result.text,
    toolResults,
    extracted,
    geo,
    saved,
    structured: {
      entityType: extracted.entityType,
      title: extracted.title,
      commune: geo.commune,
      communeAr: geo.commune_ar,
      daira: geo.daira,
      village: extracted.villageName ?? geo.matchedLabel,
      phone: extracted.contactPhone ?? null,
      urgency: extracted.urgency,
      lat: geo.lat,
      lng: geo.lng,
      recordId: saved?.id ?? null,
      recordKind: saved?.kind ?? null,
    },
  };
}
