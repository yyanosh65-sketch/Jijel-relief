import { google } from "@ai-sdk/google";
import { generateText, stepCountIs, tool } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { urgentAlerts, type SosEmergencyType } from "@/db/schema";
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

export async function POST(req: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return Response.json(
        {
          error:
            "مفتاح GOOGLE_GENERATIVE_AI_API_KEY غير مضبوط — أضفه إلى .env.local لتفعيل الوكيل الذكي.",
        },
        { status: 503 },
      );
    }

    const { userPrompt, postText } = await req.json();
    const prompt = (postText || userPrompt || "").trim();

    if (!prompt) {
      return Response.json({ error: "النص فارغ." }, { status: 400 });
    }

    let savedAlertPayload: SavedAlertPayload | null = null;

    const result = await generateText({
      model: google("gemini-2.5-flash"),
      stopWhen: stepCountIs(5),
      system: `أنت وكيل إدارة الأزمات وإعادة إعمار جيجل (Jijel Recovery Agent). دورك هو تحليل نداءات الإغاثة ومنشورات وسائل التواصل، استخراج بيانات الموقع والأرقام بدقة، وتثبيتها في قاعدة البيانات.
عندما تجد نداء استغاثة واضحاً مع رقم هاتف وموقع تقريبي في ولاية جيجل، استدعِ أداة saveEmergencyAlert مرة واحدة فقط.`,
      prompt,
      tools: {
        saveEmergencyAlert: tool({
          description:
            "تسجيل نداء استغاثة عاجل في قاعدة البيانات بعد استخراج الموقع ورقم الهاتف",
          inputSchema: saveEmergencyAlertSchema,
          execute: async (data) => {
            const loc = resolveAgentLocation(data.commune);
            const emergencyType =
              DAMAGE_TYPE_TO_EMERGENCY[data.damageType] ?? "medical";
            const roadNote = data.requires4x4
              ? "⚠️ مسلك وعر 4x4"
              : "طريق سالك";
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

            savedAlertPayload = {
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

            return savedAlertPayload;
          },
        }),
      },
    });

    const toolResults = result.toolResults.map((entry) => ({
      toolName: entry.toolName,
      output: entry.output,
    }));

    const savedAlert =
      savedAlertPayload ??
      (toolResults.find(
        (entry) =>
          entry.toolName === "saveEmergencyAlert" &&
          entry.output &&
          typeof entry.output === "object" &&
          "success" in entry.output,
      )?.output as SavedAlertPayload | undefined) ??
      null;

    let dispatch: {
      alertId: number;
      shareUrl: string;
      whatsappTargets: { name: string; phone: string; whatsappUrl: string }[];
    } | null = null;

    if (savedAlert) {
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
            contact.status === "active" &&
            contact.daira === savedAlert.assignedLocation.daira,
        )
        .map((contact) => ({
          name: contact.name,
          phone: contact.whatsapp ?? contact.phone,
          whatsappUrl: `https://wa.me/${(contact.whatsapp ?? contact.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
        }));

      dispatch = {
        alertId: savedAlert.alertId,
        shareUrl,
        whatsappTargets,
      };
    }

    return Response.json({
      text: result.text,
      toolResults,
      savedAlert,
      dispatch,
    });
  } catch (error: unknown) {
    console.error("Agent API Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal Agent Error";
    return Response.json({ error: message }, { status: 500 });
  }
}
