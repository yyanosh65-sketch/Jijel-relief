import { transcribeVoiceDamageReport } from "@/lib/agent/voice-ingestion";
import { getConfiguredCrisisAgentProvider } from "@/lib/agent/crisis-agent";

export async function POST(req: Request) {
  try {
    if (!getConfiguredCrisisAgentProvider()) {
      return Response.json(
        {
          error:
            "لم يتم ضبط مفتاح GOOGLE_GENERATIVE_AI_API_KEY للتحليل الصوتي.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const audioDataUrl = String(body.audioDataUrl ?? body.voiceNoteData ?? "").trim();

    if (!audioDataUrl.startsWith("data:audio")) {
      return Response.json(
        { error: "ملف صوتي غير صالح — سجّل رسالة صوتية أولاً." },
        { status: 400 },
      );
    }

    const result = await transcribeVoiceDamageReport(audioDataUrl);

    return Response.json({
      success: true,
      report: result,
      structured: {
        transcript: result.transcript,
        commune: result.geo?.commune ?? result.commune,
        communeAr: result.geo?.commune_ar,
        daira: result.geo?.daira ?? result.daira,
        dairaAr: result.geo?.daira_ar,
        douar: result.douar ?? result.geo?.matchedLabel,
        contactPhone: result.contactPhone,
        contactName: result.contactName,
        intakeCategory: result.intakeCategory,
        quantityNeeded: result.quantityNeeded,
        unit: result.unit,
        description: result.description,
        urgency: result.urgency,
        confidence: result.confidence,
        lat: result.geo?.lat,
        lng: result.geo?.lng,
      },
    });
  } catch (error: unknown) {
    console.error("voice agent error:", error);
    const message =
      error instanceof Error ? error.message : "تعذر تحليل الرسالة الصوتية.";
    return Response.json({ error: message }, { status: 500 });
  }
}
