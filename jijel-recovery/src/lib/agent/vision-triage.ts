import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { needCategoryEnum, needUrgencyEnum } from "@/db/schema";
import { assertGeminiConfigured, parseDataUrl } from "@/lib/agent/multimodal";

export const visionTriageSchema = z.object({
  damageType: z.enum([
    "olive_fire",
    "roof_damage",
    "livestock",
    "water",
    "mixed",
    "unknown",
  ]),
  estimatedScale: z.object({
    burntTrees: z.number().int().nonnegative().optional(),
    roofingSqMeters: z.number().nonnegative().optional(),
    affectedAnimals: z.number().int().nonnegative().optional(),
  }),
  urgency: z.enum(needUrgencyEnum.enumValues),
  urgencyScore: z.number().min(0).max(100),
  recommendedCategory: z.enum(needCategoryEnum.enumValues),
  intakeCategory: z
    .enum(["olive", "livestock", "roof", "water", "other"])
    .optional(),
  suggestedQuantity: z.number().positive().optional(),
  suggestedUnit: z.string().optional(),
  summaryAr: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

export type VisionTriageResult = z.infer<typeof visionTriageSchema>;

const VISION_SYSTEM = `أنت خبير تقييم أضرار ميداني في ولاية جيجل (حرائق زيتون، أسقف، مواشي، ماء).
قدّر حجم الضرر من الصور: عدد الأشجار المحترقة، مساحة السقف م²، عدد الرؤوس.
حدّد مستوى الاستعجال والفئة المناسبة للإغاثة.`;

export async function triageDamageImages(
  imageDataUrls: string[],
): Promise<VisionTriageResult> {
  assertGeminiConfigured();

  const images = imageDataUrls
    .filter((url) => url.startsWith("data:image/"))
    .slice(0, 3)
    .map((url) => {
      const parsed = parseDataUrl(url);
      if (!parsed) {
        return null;
      }
      return {
        type: "file" as const,
        data: parsed.buffer,
        mediaType: parsed.mediaType,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (images.length === 0) {
    throw new Error("لم تُرفق صور صالحة للتحليل.");
  }

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    system: VISION_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "حلّل صور الضرر التالية وقدّر الحجم والاستعجال لمنصة إغاثة جيجل.",
          },
          ...images,
        ],
      },
    ],
    schema: visionTriageSchema,
  });

  return object;
}
