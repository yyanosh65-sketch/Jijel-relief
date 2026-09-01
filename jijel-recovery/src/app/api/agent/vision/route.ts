import { triageDamageImages } from "@/lib/agent/vision-triage";
import { getConfiguredCrisisAgentProvider } from "@/lib/agent/crisis-agent";

export async function POST(req: Request) {
  try {
    if (!getConfiguredCrisisAgentProvider()) {
      return Response.json(
        {
          error:
            "لم يتم ضبط مفتاح GOOGLE_GENERATIVE_AI_API_KEY لتحليل الصور.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const imageDataUrls = Array.isArray(body.imageDataUrls)
      ? body.imageDataUrls.filter(
          (url: unknown): url is string =>
            typeof url === "string" && url.startsWith("data:image/"),
        )
      : body.imageDataUrl
        ? [String(body.imageDataUrl)]
        : [];

    if (imageDataUrls.length === 0) {
      return Response.json(
        { error: "أرفق صورة واحدة على الأقل للتحليل." },
        { status: 400 },
      );
    }

    const triage = await triageDamageImages(imageDataUrls);

    return Response.json({
      success: true,
      triage,
    });
  } catch (error: unknown) {
    console.error("vision agent error:", error);
    const message =
      error instanceof Error ? error.message : "تعذر تحليل صور الضرر.";
    return Response.json({ error: message }, { status: 500 });
  }
}
