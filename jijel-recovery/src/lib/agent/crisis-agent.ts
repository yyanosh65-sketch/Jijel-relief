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
  convoyEntryPointEnum,
  convoyVehicleTypeEnum,
  incomingConvoys,
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
import { checkMountainRoadStatus,
  CRISIS_AGENT_PERSONA,
  enrichConvoyDestination,
  getFieldContactsForDaira,
  JIJEL_ENTRY_POINTS_AR,
  KNOWN_DOUARS,
} from "@/lib/agent/coordinator-knowledge";
import { routeCargoConvoy } from "@/lib/agent/cargo-router";
import {
  findHighestDeficitZone,
  getReliefStatsSummary,
  resolveDairaForCommune,
} from "@/lib/agent/deficit";
import { generateDailyOperationsReport } from "@/lib/agent/operations-report";
import {
  classifyFeedPost,
  type ClassifiedFeedPost,
  type FeedFlowCategory,
  resolveFeedLocation,
} from "@/lib/feed-flow-classifier";
import {
  createAgentAbortSignal,
  deepseek,
  DEEPSEEK_CHAT_MODEL,
  isAgentTransportError,
  isDeepSeekConfigured,
} from "@/lib/agent/deepseek";
import villageIntelligence from "@/data/village-intelligence.json";

export type CrisisAgentProvider = "deepseek";

const EXTRACT_AID_NEED_SCHEMA = z.object({
  rawText: z.string().describe("النص الخام المستخرج من المنشور أو التسجيل الصوتي"),
});

const EXTRACTED_ENTITY_SCHEMA = z.object({
  entityType: z.enum([
    "aid_need",
    "sos_alert",
    "accommodation",
    "incoming_convoy",
  ]),
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
  flowCategory: z
    .enum(["sos_medical", "accommodation", "incoming_convoy"])
    .optional(),
  bedCapacity: z.number().int().positive().optional(),
  venueType: z.string().optional(),
  departureWilaya: z.string().optional(),
  driverName: z.string().optional(),
  cargoType: z.enum(convoyCargoTypeEnum.enumValues).optional(),
  vehicleType: z.enum(convoyVehicleTypeEnum.enumValues).optional(),
  entryPoint: z.enum(convoyEntryPointEnum.enumValues).optional(),
  etaHoursFromNow: z.number().int().positive().optional(),
  oxygenRequired: z.boolean().optional(),
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
  | "checkMountainRoads"
  | "generateOperationsReport"
  | "routeCargoConvoy";

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
- عند طلب تقرير يومي للعمليات أو ملخص PDF/Markdown لمسؤولي الميدان: استخدم generateOperationsReport.
- عند توجيه حمولة قافلة مسجّلة (شاحنة علف، خزانات ماء…): استخدم routeCargoConvoy.
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
  if (isDeepSeekConfigured()) {
    return "deepseek";
  }
  return null;
}

export function getCrisisAgentModel(): LanguageModel | null {
  if (!isDeepSeekConfigured()) {
    return null;
  }
  return deepseek(DEEPSEEK_CHAT_MODEL);
}

export function assertCrisisAgentModel(): LanguageModel {
  const model = getCrisisAgentModel();
  if (!model) {
    throw new Error("لم يتم ضبط مفتاح DEEPSEEK_API_KEY.");
  }
  return model;
}

async function generateAgentText(
  input: Parameters<typeof generateText>[0],
): Promise<Awaited<ReturnType<typeof generateText>>> {
  return generateText({
    ...input,
    abortSignal: input.abortSignal ?? createAgentAbortSignal(),
  });
}

function extractLastUserText(messages: ModelMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") {
      continue;
    }

    if (typeof message.content === "string") {
      return message.content;
    }

    if (Array.isArray(message.content)) {
      return message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");
    }
  }

  return "";
}

function extractDairaHint(text: string): string {
  const match = text.match(
    /(?:دائرة|في)\s+(العنصر|الطاهير|تكسنة|العوانة|جيملة|زيامة|جمعة بني حبيبي|الشحنة)/i,
  );
  return match?.[1] ?? "العنصر";
}

function inferCargoTypeFromText(text: string): (typeof convoyCargoTypeEnum.enumValues)[number] {
  if (/علف|ماء|خزان|مؤن|أغذية/i.test(text)) {
    return "food";
  }
  if (/عتاد|فلاح|أنابيب|مضخة/i.test(text)) {
    return "farm_equipment";
  }
  if (/دواء|طب|إسعاف/i.test(text)) {
    return "medicine";
  }
  if (/بطانية|غطاء|ملابس/i.test(text)) {
    return "blankets";
  }
  return "mixed";
}

export async function runChatFallback(input: {
  messages: ModelMessage[];
}): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
  fallback: true;
}> {
  const userText = extractLastUserText(input.messages);
  const toolResults: Array<{ toolName: string; output: unknown }> = [];

  if (/مسالك|طريق|مقطوع|تاكسنة|عراقن|تبلوط/i.test(userText)) {
    const area =
      userText.match(/(?:في|ب)\s+([^?.!]+)/i)?.[1]?.trim() ?? "تاكسنة";
    const output = checkMountainRoadStatus(area);
    toolResults.push({ toolName: "checkMountainRoads", output });
    return {
      text: `${CRISIS_AGENT_PERSONA.name}: راه الاتصال بالخادم مقطوع — هاذي آخر معلومة محلية على ${output.areaLabel}: ${output.terrain.labelAr}.`,
      toolResults,
      fallback: true,
    };
  }

  if (/4x4|جهات اتصال|اتصال|فرق/i.test(userText)) {
    const dairaQuery = extractDairaHint(userText);
    const contacts = getFieldContactsForDaira({
      dairaQuery,
      require4x4: /4x4/i.test(userText),
    });
    const output = { dairaQuery, count: contacts.length, contacts };
    toolResults.push({ toolName: "getLocalFieldContacts", output });
    const first = contacts[0];
    return {
      text: first
        ? `${CRISIS_AGENT_PERSONA.name}: اتصل بـ ${first.contactPerson} — ${first.phone}${first.is4x4Team ? " (4x4)" : ""}.`
        : `${CRISIS_AGENT_PERSONA.name}: ما لقيناش جهات اتصال محلية مطابقة دابا.`,
      toolResults,
      fallback: true,
    };
  }

  if (/قافلة|حمولة|علف|شاحنة|وجهة/i.test(userText)) {
    const cargoType = inferCargoTypeFromText(userText);
    const output = await routeCargoConvoy({ cargoType });
    toolResults.push({ toolName: "routeCargoConvoy", output });
    if (output.found && output.destination) {
      return {
        text: `${CRISIS_AGENT_PERSONA.name}: وجّه القافلة لـ ${output.destination.communeAr} — عجز ${output.destination.deficitUnits} وحدة. ${output.localCoordinator ? `اتصل بـ ${output.localCoordinator.nameAr}: ${output.localCoordinator.phone}` : ""}`,
        toolResults,
        fallback: true,
      };
    }
  }

  if (/تقرير|عمليات|يومي/i.test(userText)) {
    const output = await generateDailyOperationsReport();
    toolResults.push({ toolName: "generateOperationsReport", output });
    return {
      text: `${CRISIS_AGENT_PERSONA.name}: التقرير اليومي جاهز — ${output.stats.openNeeds} احتياج مفتوح و ${output.stats.activeSosAlerts} نداء SOS نشط.`,
      toolResults,
      fallback: true,
    };
  }

  if (/إحصائ|احصائ|نداءات|SOS|عجز/i.test(userText)) {
    const output = await getReliefStatsSummary();
    toolResults.push({ toolName: "getReliefStats", output });
    return {
      text: `${CRISIS_AGENT_PERSONA.name}: راه ${output.openNeeds} احتياج مفتوح، ${output.activeSosAlerts} نداء SOS نشط، و ${output.incomingConvoys} قافلة قادمة.`,
      toolResults,
      fallback: true,
    };
  }

  return {
    text: `${CRISIS_AGENT_PERSONA.name}: تعذّر الاتصال بخادم الذكاء الاصطناعي — جرّب مرة أخرى أو اتصل بالمنسّق مباشرة.`,
    toolResults,
    fallback: true,
  };
}

export async function processSocialFeedFallback(rawText: string): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
  extracted: ExtractedAidNeed;
  geo: GeoLocatedVillage;
  classified: ClassifiedFeedPost;
  saved: SavedFeedRecord | null;
  structured: FeedStructuredResult;
  fallback: true;
}> {
  const classified = classifyFeedPost(rawText);
  const extracted = classifiedToExtracted(classified);
  const geo = classifiedToGeo(classified);

  const toolResults = [
    { toolName: "classifyFeedPost", output: classified },
    { toolName: "extractAidNeed", output: extracted },
    { toolName: "geoLocateVillage", output: geo },
  ];

  let saved: SavedFeedRecord | null = null;
  if (extracted.description.trim()) {
    saved = await persistExtractedFeedEntities({
      extracted,
      geo,
      sourceText: rawText,
    });
  }

  return {
    text: `${CRISIS_AGENT_PERSONA.name}: تم تحليل المنشور محلياً — ${classified.badge.emoji} ${classified.badge.labelAr} في ${geo.commune_ar}.`,
    toolResults,
    extracted,
    geo,
    classified,
    saved,
    structured: buildFeedStructuredResult({
      extracted,
      geo,
      classified,
      saved,
    }),
    fallback: true,
  };
}

export type FeedStructuredResult = {
  entityType: string | null;
  flowCategory: FeedFlowCategory | null;
  flowBadge: ClassifiedFeedPost["badge"] | null;
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

function buildFeedStructuredResult(input: {
  extracted: ExtractedAidNeed;
  geo: GeoLocatedVillage;
  classified: ClassifiedFeedPost;
  saved: SavedFeedRecord | null;
}): FeedStructuredResult {
  return {
    entityType: input.extracted.entityType,
    flowCategory: input.classified.flowCategory,
    flowBadge: input.classified.badge,
    title: input.extracted.title,
    commune: input.geo.commune,
    communeAr: input.geo.commune_ar,
    daira: input.geo.daira,
    village: input.extracted.villageName ?? input.geo.matchedLabel,
    phone: input.extracted.contactPhone ?? null,
    urgency: input.extracted.urgency,
    lat: input.geo.lat,
    lng: input.geo.lng,
    recordId: input.saved?.id ?? null,
    recordKind: input.saved?.kind ?? null,
  };
}

function inferEmergencyType(keywords: string[]): SosEmergencyType {
  const joined = keywords.join(" ").toLowerCase();
  if (/حريق|نار|اشتعال/.test(joined)) return "fire_flare";
  if (/مواشي|نحل|اغنام|أغنام|بقر/.test(joined)) return "livestock_trap";
  if (/ماء|مضخة|صهريج|انقطاع/.test(joined)) return "water_cutoff";
  return "medical";
}

export function heuristicExtractAidNeed(rawText: string): ExtractedAidNeed {
  return classifiedToExtracted(classifyFeedPost(rawText));
}

export function geoLocateVillage(
  villageQuery: string,
  communeHint?: string,
): GeoLocatedVillage {
  const resolved = resolveFeedLocation(
    communeHint ? `${villageQuery} ${communeHint}` : villageQuery,
  );

  if (resolved.source !== "fallback") {
    return {
      query: villageQuery,
      matchedLabel: resolved.matchedLabel,
      commune: resolved.commune,
      commune_ar: resolved.communeAr,
      daira: resolved.daira,
      daira_ar: resolved.dairaAr,
      lat: resolved.lat,
      lng: resolved.lng,
      confidence: resolved.confidence,
      source:
        resolved.source === "douar_alias" ? "dossier" : "commune_index",
    };
  }

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

  const agentResolved = resolveAgentLocation(communeHint ?? villageQuery);
  return {
    query: villageQuery,
    matchedLabel: communeHint ?? villageQuery,
    ...agentResolved,
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
    routeCargoConvoy: tool({
      description:
        "توجيه حمولة قافلة تلقائياً نحو أعلى عجز مع منسّق محلي ومدخل وطريق",
      inputSchema: z.object({
        cargoType: z.enum(convoyCargoTypeEnum.enumValues),
        vehicleType: z.enum(convoyVehicleTypeEnum.enumValues).optional(),
        preferredEntryPoint: z.enum(convoyEntryPointEnum.enumValues).optional(),
      }),
      execute: async ({ cargoType, vehicleType, preferredEntryPoint }) =>
        routeCargoConvoy({
          cargoType,
          vehicleType,
          preferredEntryPoint,
        }),
    }),
    generateOperationsReport: tool({
      description:
        "إنشاء تقرير عمليات يومي Markdown لمسؤولي الإغاثة والميدان",
      inputSchema: z.object({
        scope: z.enum(["daily"]).default("daily"),
      }),
      execute: async () => generateDailyOperationsReport(),
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
  | { kind: "sos_alert"; id: number }
  | { kind: "accommodation"; id: number; locationId: number }
  | { kind: "incoming_convoy"; id: number };

function classifiedToExtracted(classified: ClassifiedFeedPost): ExtractedAidNeed {
  const entityType =
    classified.flowCategory === "sos_medical"
      ? "sos_alert"
      : classified.flowCategory === "accommodation"
        ? "accommodation"
        : classified.flowCategory === "incoming_convoy"
          ? "incoming_convoy"
          : "aid_need";

  return {
    entityType,
    title: classified.title,
    description: classified.description,
    category:
      classified.flowCategory === "accommodation"
        ? "shelter"
        : classified.cargoType === "medicine"
          ? "medical"
          : classified.cargoType === "food"
            ? "food"
            : "other",
    urgency:
      classified.flowCategory === "sos_medical" ? "critical" : "high",
    quantityNeeded: classified.bedCapacity ?? 1,
    contactName: classified.driverName,
    contactPhone: classified.phone ?? undefined,
    commune: classified.location.commune,
    villageName: classified.location.village ?? undefined,
    damageKeywords: classified.oxygenRequired
      ? ["أكسجين", "طبي"]
      : classified.venueType
        ? [classified.venueType]
        : ["حاجة عامة"],
    requires4x4: /4x4|جبلي|وعر|مسلك/.test(classified.description),
    emergencyType: classified.emergencyType ?? "medical",
    confidence: classified.confidence,
    flowCategory: classified.flowCategory,
    bedCapacity: classified.bedCapacity,
    venueType: classified.venueType,
    departureWilaya: classified.departureWilaya,
    driverName: classified.driverName,
    cargoType: classified.cargoType,
    vehicleType: classified.vehicleType,
    entryPoint: classified.entryPoint,
    etaHoursFromNow: classified.etaHoursFromNow,
    oxygenRequired: classified.oxygenRequired,
  };
}

function classifiedToGeo(classified: ClassifiedFeedPost): GeoLocatedVillage {
  const { location } = classified;
  return {
    query: location.village ?? location.communeAr,
    matchedLabel: location.matchedLabel,
    commune: location.commune,
    commune_ar: location.communeAr,
    daira: location.daira,
    daira_ar: location.dairaAr,
    lat: location.lat,
    lng: location.lng,
    confidence: location.confidence,
    source:
      location.source === "douar_alias"
        ? "dossier"
        : location.source === "commune_index"
          ? "commune_index"
          : "fallback",
  };
}

export async function persistExtractedFeedEntities(input: {
  extracted: ExtractedAidNeed;
  geo: GeoLocatedVillage;
  sourceText: string;
}): Promise<SavedFeedRecord> {
  const { extracted, geo, sourceText } = input;
  const daira = resolveDairaForCommune(geo.commune);

  if (
    extracted.entityType === "sos_alert" ||
    extracted.flowCategory === "sos_medical"
  ) {
    const oxygenNote = extracted.oxygenRequired ? " | 🫁 حاجة أكسجين عاجلة" : "";
    const [saved] = await db
      .insert(urgentAlerts)
      .values({
        emergencyType:
          extracted.emergencyType ?? inferEmergencyType(extracted.damageKeywords),
        description: `${extracted.description}${oxygenNote} | ${extracted.requires4x4 ? "⚠️ مسلك وعر 4x4" : "طريق سالك"}`,
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

  if (
    extracted.entityType === "incoming_convoy" ||
    extracted.flowCategory === "incoming_convoy"
  ) {
    const eta = new Date();
    eta.setHours(eta.getHours() + (extracted.etaHoursFromNow ?? 6));

    const [convoy] = await db
      .insert(incomingConvoys)
      .values({
        departureWilaya: extracted.departureWilaya ?? "غير محددة",
        driverName: extracted.driverName ?? extracted.contactName ?? "سائق قافلة",
        driverPhone: extracted.contactPhone ?? "0500000000",
        driverWhatsapp: extracted.contactPhone ?? null,
        vehicleType: extracted.vehicleType ?? "truck",
        cargoType: extracted.cargoType ?? "mixed",
        eta,
        entryPoint: extracted.entryPoint ?? "setif_south",
        status: "planned",
        notes: `مستورد من فيسبوك: ${sourceText.slice(0, 500)}`,
      })
      .returning({ id: incomingConvoys.id });

    revalidatePath("/");
    revalidatePath("/map");
    revalidatePath("/guide");
    return { kind: "incoming_convoy", id: convoy.id };
  }

  const isAccommodation =
    extracted.entityType === "accommodation" ||
    extracted.flowCategory === "accommodation";

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

  const venueLabel = extracted.venueType ? ` — ${extracted.venueType}` : "";
  const bedLabel = extracted.bedCapacity
    ? ` (${extracted.bedCapacity} سرير)`
    : "";

  const [need] = await db
    .insert(needs)
    .values({
      locationId: location.id,
      title: isAccommodation
        ? `إيواء ومبيت${venueLabel}${bedLabel}`
        : extracted.title,
      description: isAccommodation
        ? `${extracted.description}\n\n🏠 عرض إيواء مستورد من فيسبوك.`
        : extracted.description,
      category: isAccommodation ? "shelter" : extracted.category,
      urgency: extracted.urgency,
      status: "open",
      quantityNeeded: extracted.bedCapacity ?? extracted.quantityNeeded,
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

  return isAccommodation
    ? { kind: "accommodation", id: need.id, locationId: location.id }
    : { kind: "aid_need", id: need.id, locationId: location.id };
}

export { CRISIS_AGENT_PERSONA } from "@/lib/agent/coordinator-knowledge";

export async function runCrisisAgentChat(input: {
  messages: ModelMessage[];
}): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
  fallback?: boolean;
}> {
  try {
    const result = await generateAgentText({
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
  } catch (error) {
    console.error("runCrisisAgentChat fallback:", error);
    if (!isAgentTransportError(error)) {
      throw error;
    }
    return runChatFallback(input);
  }
}

export async function processSocialFeed(rawText: string): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
  extracted: ExtractedAidNeed | null;
  geo: GeoLocatedVillage | null;
  classified: ClassifiedFeedPost | null;
  saved: SavedFeedRecord | null;
  structured: FeedStructuredResult;
}> {
  try {
    const classified = classifyFeedPost(rawText);

    const result = await generateAgentText({
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
      classifiedToExtracted(classified);

    const geo =
      (toolResults.find((entry) => entry.toolName === "geoLocateVillage")
        ?.output as GeoLocatedVillage | undefined) ?? classifiedToGeo(classified);

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
      classified,
      saved,
      structured: buildFeedStructuredResult({
        extracted,
        geo,
        classified,
        saved,
      }),
    };
  } catch (error) {
    console.error("processSocialFeed fallback:", error);
    if (!isAgentTransportError(error)) {
      throw error;
    }
    const fallback = await processSocialFeedFallback(rawText);
    const { fallback: _fallback, ...result } = fallback;
    return result;
  }
}
