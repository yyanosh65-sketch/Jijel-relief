import { generateText, stepCountIs, tool } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import {
  convoyCargoTypeEnum,
  urgentAlerts,
  type ConvoyEntryPoint,
  type SosEmergencyType,
} from "@/db/schema";
import { enrichConvoyDestination } from "@/lib/agent/coordinator-knowledge";
import {
  createAgentAbortSignal,
  deepseek,
  DEEPSEEK_CHAT_MODEL,
  isAgentTransportError,
  isDeepSeekConfigured,
} from "@/lib/agent/deepseek";
import { buildFieldCoordinationBrief } from "@/lib/agent/field-coordination";
import {
  findHighestDeficitZone,
  getReliefStatsSummary,
} from "@/lib/agent/deficit";
import {
  heuristicExtractAidNeed,
} from "@/lib/agent/crisis-agent";
import { buildFeedDispatchWhatsAppMessage } from "@/lib/feed-parser";
import { resolveAgentLocation } from "@/lib/agent-location";
import { verifiedReliefContacts } from "@/lib/relief-contacts";

const DAMAGE_TYPE_TO_EMERGENCY: Record<string, SosEmergencyType> = {
  "اشتعال حرائق": "fire_flare",
  "مواشي ونحل في خطر": "livestock_trap",
  "انقطاع الماء ومعدات سقي": "water_cutoff",
  "ترميم سكن": "medical",
  "حاجة عامة": "medical",
};

const DAMAGE_TYPE_FROM_KEYWORDS: Array<{
  pattern: RegExp;
  label: SaveEmergencyAlertInput["damageType"];
}> = [
  { pattern: /حريق|نار|اشتعال|حرائق/i, label: "اشتعال حرائق" },
  { pattern: /مواشي|نحل|أغنام|بقر/i, label: "مواشي ونحل في خطر" },
  { pattern: /ماء|مضخة|صهريج|انقطاع/i, label: "انقطاع الماء ومعدات سقي" },
  { pattern: /سقف|منزل|بيت|ترميم/i, label: "ترميم سكن" },
];

const saveEmergencyAlertSchema = z.object({
  commune: z.string().describe("اسم البلدية أو الدائرة في جيجل"),
  villageName: z.string().describe("اسم الدوار أو القرية"),
  phone: z.string().describe("رقم هاتف الاتصال الجزائري"),
  damageType: z.enum([
    "اشتعال حرائق",
    "مواشي ونحل في خطر",
    "انقطاع الماء ومعدات سقي",
    "ترميم سكن",
    "حاجة عامة",
  ]),
  description: z.string().describe("وصف مختصر ودقيق للاحتياج"),
  requires4x4: z.boolean().describe("هل المسلك جبلي وعر يتطلب سيارات دفع رباعي"),
});

type SaveEmergencyAlertInput = z.infer<typeof saveEmergencyAlertSchema>;

type SavedAlertPayload = {
  success: true;
  alertId: number;
  assignedLocation: ReturnType<typeof resolveAgentLocation>;
  commune: string;
  villageName: string;
  phone: string;
  damageType: SaveEmergencyAlertInput["damageType"];
  description: string;
  requires4x4: boolean;
};

const LEGACY_AGENT_SYSTEM = `أنت وكيل إدارة الأزمات وإعادة إعمار جيجل (Jijel Recovery Agent). دورك هو تحليل نداءات الإغاثة ومنشورات وسائل التواصل، استخراج بيانات الموقع والأرقام بدقة، وتثبيتها في قاعدة البيانات.
عندما تجد نداء استغاثة واضحاً مع رقم هاتف وموقع تقريبي في ولاية جيجل، استدعِ أداة saveEmergencyAlert مرة واحدة فقط.
عند سؤال عن توجيه قافلة استخدم suggestConvoyDestination. عند سؤال عن إحصائيات الإغاثة استخدم getReliefStats.`;

function inferDamageType(text: string): SaveEmergencyAlertInput["damageType"] {
  for (const entry of DAMAGE_TYPE_FROM_KEYWORDS) {
    if (entry.pattern.test(text)) {
      return entry.label;
    }
  }
  return "حاجة عامة";
}

async function persistEmergencyAlert(
  data: SaveEmergencyAlertInput,
): Promise<SavedAlertPayload> {
  const loc = resolveAgentLocation(data.commune);
  const emergencyType = DAMAGE_TYPE_TO_EMERGENCY[data.damageType] ?? "medical";
  const roadNote = data.requires4x4 ? "⚠️ مسلك وعر 4x4" : "طريق سالك";
  const fullDescription = `${data.description} | ${roadNote}`;

  const [saved] = await db
    .insert(urgentAlerts)
    .values({
      emergencyType,
      description: fullDescription,
      reporterName: "رصد تلقائي عبر الوكيل الذكي",
      reporterPhone: data.phone,
      daira: loc.daira,
      commune: loc.commune,
      village: data.villageName,
      lat: String(loc.lat),
      lng: String(loc.lng),
      status: "active",
      mediaUrls: [],
    })
    .returning({ id: urgentAlerts.id });

  revalidatePath("/");
  revalidatePath("/map");

  return {
    success: true,
    alertId: saved.id,
    assignedLocation: loc,
    commune: data.commune,
    villageName: data.villageName,
    phone: data.phone,
    damageType: data.damageType,
    description: data.description,
    requires4x4: data.requires4x4,
  };
}

function createLegacyAgentTools(savedAlertRef: {
  current: SavedAlertPayload | null;
}) {
  return {
    saveEmergencyAlert: tool({
      description:
        "تسجيل نداء استغاثة عاجل في قاعدة البيانات بعد استخراج الموقع ورقم الهاتف",
      inputSchema: saveEmergencyAlertSchema,
      execute: async (data) => {
        const payload = await persistEmergencyAlert(data);
        savedAlertRef.current = payload;
        return payload;
      },
    }),
    suggestConvoyDestination: tool({
      description:
        "اقتراح المنطقة ذات أعلى عجز مطابقة لنوع حمولة القافلة القادمة",
      inputSchema: z.object({
        cargoType: z.enum(convoyCargoTypeEnum.enumValues),
        notes: z.string().optional(),
      }),
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

async function runLegacyAgentFallback(prompt: string): Promise<{
  text: string;
  toolResults: Array<{ toolName: string; output: unknown }>;
  savedAlert: SavedAlertPayload | null;
  fallback: true;
}> {
  const toolResults: Array<{ toolName: string; output: unknown }> = [];

  if (/إحصائ|احصائ|نداءات|SOS|عجز/i.test(prompt)) {
    const output = await getReliefStatsSummary();
    toolResults.push({ toolName: "getReliefStats", output });
    return {
      text: `وضع احتياطي: ${output.openNeeds} احتياج مفتوح، ${output.activeSosAlerts} نداء SOS نشط، ${output.incomingConvoys} قافلة قادمة.`,
      toolResults,
      savedAlert: null,
      fallback: true,
    };
  }

  if (/قافلة|حمولة|علف|شاحنة|وجهة/i.test(prompt)) {
    const cargoType = /علف|ماء|مؤن/i.test(prompt) ? "food" : "mixed";
    const zone = await findHighestDeficitZone(cargoType);
    const output = zone
      ? {
          found: true,
          ...zone,
          ...enrichConvoyDestination({
            commune: zone.commune,
            daira: zone.daira,
            recommendedEntryPoint: zone.recommendedEntryPoint as ConvoyEntryPoint,
            recommendedEntryPointAr: zone.recommendedEntryPointAr,
          }),
        }
      : { found: false, message: "لا عجز مطابق." };
    toolResults.push({ toolName: "suggestConvoyDestination", output });
    return {
      text: zone
        ? `وضع احتياطي: وجّه القافلة إلى ${zone.commune} (عجز ${zone.deficitUnits} وحدة).`
        : "وضع احتياطي: لا عجز مطابق حالياً.",
      toolResults,
      savedAlert: null,
      fallback: true,
    };
  }

  const extracted = heuristicExtractAidNeed(prompt);
  if (!extracted.contactPhone) {
    return {
      text: "وضع احتياطي: لم يُعثر على رقم هاتف صالح في النص.",
      toolResults,
      savedAlert: null,
      fallback: true,
    };
  }

  const alertInput: SaveEmergencyAlertInput = {
    commune: extracted.commune,
    villageName: extracted.villageName ?? extracted.commune,
    phone: extracted.contactPhone,
    damageType: inferDamageType(prompt),
    description: extracted.description,
    requires4x4: extracted.requires4x4,
  };

  const savedAlert = await persistEmergencyAlert(alertInput);
  toolResults.push({ toolName: "saveEmergencyAlert", output: savedAlert });

  return {
    text: `وضع احتياطي: تم تسجيل نداء في ${savedAlert.assignedLocation.commune_ar} — ${savedAlert.damageType}.`,
    toolResults,
    savedAlert,
    fallback: true,
  };
}

function buildDispatch(savedAlert: SavedAlertPayload, prompt: string) {
  const message = buildFeedDispatchWhatsAppMessage(
    {
      emergencyType:
        DAMAGE_TYPE_TO_EMERGENCY[savedAlert.damageType] ?? "medical",
      emergencyLabelAr: savedAlert.damageType,
      description: `${savedAlert.description} | ${savedAlert.requires4x4 ? "⚠️ مسلك وعر 4x4" : "طريق سالك"}`,
      reporterName: "رصد تلقائي عبر الوكيل الذكي",
      reporterPhone: savedAlert.phone,
      commune: savedAlert.assignedLocation.commune,
      communeAr: savedAlert.assignedLocation.commune_ar,
      daira: savedAlert.assignedLocation.daira,
      dairaAr: savedAlert.assignedLocation.daira_ar,
      village: savedAlert.villageName,
      lat: savedAlert.assignedLocation.lat,
      lng: savedAlert.assignedLocation.lng,
      matchedKeywords: [savedAlert.damageType],
      matchedCommuneText: savedAlert.commune,
      confidence: "high",
      sourceText: prompt,
    },
    savedAlert.alertId,
  );

  const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const whatsappTargets = verifiedReliefContacts
    .filter(
      (contact) =>
        contact.category === "field_team" &&
        contact.daira === savedAlert.assignedLocation.daira,
    )
    .map((contact) => ({
      name: contact.name,
      phone: contact.whatsapp ?? contact.phone,
      whatsappUrl: `https://wa.me/${(contact.whatsapp ?? contact.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
    }));

  return {
    alertId: savedAlert.alertId,
    shareUrl,
    whatsappTargets,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Field coordination / Smart Dispatch sheet prompts
    if (
      body &&
      typeof body === "object" &&
      typeof body.query === "string" &&
      (body.needId != null || body.settlementId != null || body.query)
    ) {
      const needId =
        body.needId != null && Number.isFinite(Number(body.needId))
          ? Number(body.needId)
          : null;
      const settlementId =
        body.settlementId != null && Number.isFinite(Number(body.settlementId))
          ? Number(body.settlementId)
          : null;
      const query = String(body.query || "").trim();

      if (query && (needId || settlementId || /طريق|شكون|واش يخص/i.test(query))) {
        const text = await buildFieldCoordinationBrief({
          needId,
          settlementId,
          query,
        });

        // Optionally enrich with DeepSeek when configured
        if (isDeepSeekConfigured() && (needId || settlementId)) {
          try {
            const enriched = await generateText({
              model: deepseek(DEEPSEEK_CHAT_MODEL),
              abortSignal: createAgentAbortSignal(12_000),
              system: `أنت وكيل تنسيق ميداني لإغاثة جيجل. جاوب بالدارجة الجزائرية فقط.

قواعد إلزامية:
1) أسماء الأماكن بالعربية فقط (مثال: بوراعي بلهادف، العنصر، تكسنة) — ممنوع كتابة الأسماء اللاتينية مثل Bouraoui Belhadef أو El Ancer.
2) الإجابة قصيرة وقابلة للمسح: قسمها إلى 2–3 أقسام كحد أقصى بالشكل التالي بالضبط:
🚨 العجز المتبقي:
• نقطة واحدة أو اثنتين
🚛 المسالك المفتوحة:
• نقطة واحدة أو اثنتين
⚠️ تنبيه هام:
• نقطة واحدة فقط إن لزم
3) لا تكتب فقرات طويلة ولا جدران نص. كل نقطة سطر قصير (أقل من ~20 كلمة).
4) ركّز على الفراغات، منع تكرار الأدوار، ومسالك RN43 / RN77 / CW135.`,
              prompt: `السؤال: ${query}\n\nمعطيات النظام (بالعربية):\n${text}`,
            });
            if (enriched.text?.trim()) {
              return Response.json({ text: enriched.text.trim(), mode: "field" });
            }
          } catch (error) {
            console.error("Field agent DeepSeek fallback to brief:", error);
          }
        }

        return Response.json({ text, mode: "field", fallback: true });
      }
    }

    if (!isDeepSeekConfigured()) {
      const { userPrompt, postText } = body as {
        userPrompt?: string;
        postText?: string;
      };
      const prompt = String(postText || userPrompt || "").trim();
      if (!prompt) {
        return Response.json({ error: "النص فارغ." }, { status: 400 });
      }

      const fallback = await runLegacyAgentFallback(prompt);
      return Response.json({
        text: fallback.text,
        toolResults: fallback.toolResults,
        savedAlert: fallback.savedAlert,
        dispatch: fallback.savedAlert
          ? buildDispatch(fallback.savedAlert, prompt)
          : null,
        fallback: true,
      });
    }

    const { userPrompt, postText } = body as {
      userPrompt?: string;
      postText?: string;
    };
    const prompt = (postText || userPrompt || "").trim();

    if (!prompt) {
      return Response.json({ error: "النص فارغ." }, { status: 400 });
    }

    const savedAlertRef: { current: SavedAlertPayload | null } = {
      current: null,
    };

    try {
      const result = await generateText({
        model: deepseek(DEEPSEEK_CHAT_MODEL),
        stopWhen: stepCountIs(5),
        abortSignal: createAgentAbortSignal(),
        system: LEGACY_AGENT_SYSTEM,
        prompt,
        tools: createLegacyAgentTools(savedAlertRef),
      });

      const toolResults = result.toolResults.map((entry) => ({
        toolName: entry.toolName,
        output: entry.output,
      }));

      const savedAlert =
        savedAlertRef.current ??
        (toolResults.find(
          (entry) =>
            entry.toolName === "saveEmergencyAlert" &&
            entry.output &&
            typeof entry.output === "object" &&
            "success" in entry.output,
        )?.output as SavedAlertPayload | undefined) ??
        null;

      return Response.json({
        text: result.text,
        toolResults,
        savedAlert,
        dispatch: savedAlert ? buildDispatch(savedAlert, prompt) : null,
      });
    } catch (error) {
      console.error("Legacy agent DeepSeek error:", error);
      if (!isAgentTransportError(error)) {
        throw error;
      }

      const fallback = await runLegacyAgentFallback(prompt);
      return Response.json({
        text: fallback.text,
        toolResults: fallback.toolResults,
        savedAlert: fallback.savedAlert,
        dispatch: fallback.savedAlert
          ? buildDispatch(fallback.savedAlert, prompt)
          : null,
        fallback: true,
      });
    }
  } catch (error: unknown) {
    console.error("Agent API Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Agent Error";
    return Response.json({ error: message }, { status: 500 });
  }
}
