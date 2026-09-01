import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { geoLocateVillage } from "@/lib/agent/crisis-agent";
import { assertGeminiConfigured, parseDataUrl } from "@/lib/agent/multimodal";

export const voiceDamageReportSchema = z.object({
  transcript: z.string().describe("النص المنطوق كما سُمع بالدارجة الجيجلية"),
  commune: z.string().optional(),
  douar: z.string().optional(),
  daira: z.string().optional(),
  contactPhone: z.string().optional(),
  contactName: z.string().optional(),
  intakeCategory: z
    .enum(["olive", "livestock", "roof", "water", "other"])
    .optional(),
  quantityNeeded: z.number().int().positive().optional(),
  unit: z.string().optional(),
  description: z.string(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.enum(["high", "medium", "low"]),
});

export type VoiceDamageReport = z.infer<typeof voiceDamageReportSchema>;

const VOICE_SYSTEM = `أنت محلل صوتي لمنصة إغاثة جيجل.
استمع للتسجيل بالدارجة الجزائرية (لهجة جيجل) وحوّله لتقرير ضرر مهيكل.
استخرج: البلدية، الدوار، الدائرة، الهاتف، نوع الاحتياج (زيتون/مواشي/سقف/ماء)، الكمية، والوصف.
إذا لم يُذكر شيء بوضوح، اتركه فارغاً وخفّض مستوى الثقة.`;

export async function transcribeVoiceDamageReport(
  audioDataUrl: string,
): Promise<VoiceDamageReport & { geo?: ReturnType<typeof geoLocateVillage> }> {
  assertGeminiConfigured();

  const parsed = parseDataUrl(audioDataUrl);
  if (!parsed) {
    throw new Error("صيغة الصوت غير صالحة.");
  }

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    system: VOICE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "حلّل هذه الرسالة الصوتية من مواطن متضرر في ولاية جيجل وأعد تقرير الضرر المهيكل.",
          },
          {
            type: "file",
            data: parsed.buffer,
            mediaType: parsed.mediaType || "audio/webm",
          },
        ],
      },
    ],
    schema: voiceDamageReportSchema,
  });

  const locationQuery = object.douar ?? object.commune;
  const geo = locationQuery
    ? geoLocateVillage(locationQuery, object.commune ?? object.daira)
    : undefined;

  return { ...object, geo };
}
