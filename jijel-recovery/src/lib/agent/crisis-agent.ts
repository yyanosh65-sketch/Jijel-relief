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
  type SosEmergencyType,
} from "@/db/schema";
import {
  buildJijelLocationIndex,
  resolveAgentLocation,
  type ResolvedAgentLocation,
} from "@/lib/agent-location";
import {
  findHighestDeficitZone,
  getReliefStatsSummary,
  resolveDairaForCommune,
} from "@/lib/agent/deficit";
import villageIntelligence from "@/data/village-intelligence.json";
import { getCommuneArabicName, getDairaArabicName } from "@/lib/locations";

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
  | "getReliefStats";

const CRISIS_AGENT_SYSTEM = `أنت وكيل إدارة الأزمات وإعادة إعمار ولاية جيجل (Jijel Crisis Agent).
- حلّل النصوص غير المهيكلة (فيسبوك، واتساب، تسجيلات) بدقة.
- استخدم الأدوات المتاحة قبل الإجابة النهائية.
- عند وجود نداء استغاثة واضح مع هاتف وموقع، استخرج الكيانات ثم حدّد الإحداثيات.
- عند سؤال عن توجيه قافلة، استخدم suggestConvoyDestination.
- عند سؤال عن إحصائيات الإغاثة، استخدم getReliefStats.
- أجب بالعربية بشكل مختصر وعملي للمشغّلين الميدانيين.`;

const FEED_AGENT_SYSTEM = `أنت محلل نداءات فيسبوك لمنصة إغاثة جيجل.
1. استدعِ extractAidNeed لتحليل المنشور.
2. استدعِ geoLocateVillage لتحديد إحداثيات الدوار/البلدية.
3. لخّص النتيجة للمشغّل بالعربية.`;

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
        "اقتراح المنطقة ذات أعلى عجز مطابقة لنوع حمولة القافلة القادمة",
      inputSchema: CONVOY_DESTINATION_SCHEMA,
      execute: async ({ cargoType, notes }) => {
        const zone = await findHighestDeficitZone(cargoType);
        if (!zone) {
          return {
            found: false,
            message: "لا توجد مناطق بعجز مطابق حالياً.",
            notes: notes ?? null,
          };
        }
        return {
          found: true,
          ...zone,
          communeAr: getCommuneArabicName(zone.commune),
          dairaAr: getDairaArabicName(zone.daira),
          notes: notes ?? null,
        };
      },
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
