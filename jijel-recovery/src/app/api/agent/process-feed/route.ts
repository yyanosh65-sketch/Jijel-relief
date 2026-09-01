import {
  assertCrisisAgentModel,
  getConfiguredCrisisAgentProvider,
  processSocialFeed,
} from "@/lib/agent/crisis-agent";
import { buildFeedDispatchWhatsAppMessage } from "@/lib/feed-parser";
import { verifiedReliefContacts } from "@/lib/relief-contacts";

export async function POST(req: Request) {
  try {
    if (!getConfiguredCrisisAgentProvider()) {
      return Response.json(
        {
          error:
            "لم يتم ضبط مفتاح GOOGLE_GENERATIVE_AI_API_KEY أو OPENAI_API_KEY.",
        },
        { status: 503 },
      );
    }

    assertCrisisAgentModel();

    const body = await req.json();
    const rawText = String(body.rawText ?? body.postText ?? "").trim();

    if (!rawText) {
      return Response.json({ error: "النص فارغ." }, { status: 400 });
    }

    const result = await processSocialFeed(rawText);

    let dispatch: {
      shareUrl: string;
      whatsappTargets: { name: string; phone: string; whatsappUrl: string }[];
    } | null = null;

    if (result.saved?.kind === "sos_alert" && result.extracted && result.geo) {
      const message = buildFeedDispatchWhatsAppMessage(
        {
          emergencyType: result.extracted.emergencyType ?? "medical",
          emergencyLabelAr: result.extracted.damageKeywords.join("، ") || "نداء عام",
          description: result.extracted.description,
          reporterName: result.extracted.contactName ?? "رصد تلقائي عبر الوكيل الذكي",
          reporterPhone: result.extracted.contactPhone ?? null,
          commune: result.geo.commune,
          communeAr: result.geo.commune_ar,
          daira: result.geo.daira,
          dairaAr: result.geo.daira_ar,
          village: result.extracted.villageName ?? result.geo.matchedLabel,
          lat: result.geo.lat,
          lng: result.geo.lng,
          matchedKeywords: result.extracted.damageKeywords,
          matchedCommuneText: result.geo.matchedLabel,
          confidence: result.extracted.confidence,
          sourceText: rawText,
        },
        result.saved.id,
      );

      const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      const whatsappTargets = verifiedReliefContacts
        .filter(
          (contact) =>
            contact.category === "field_team" &&
            contact.status === "active" &&
            contact.daira === result.geo!.daira,
        )
        .map((contact) => ({
          name: contact.name,
          phone: contact.whatsapp ?? contact.phone,
          whatsappUrl: `https://wa.me/${(contact.whatsapp ?? contact.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
        }));

      dispatch = { shareUrl, whatsappTargets };
    }

    return Response.json({
      ...result,
      dispatch,
    });
  } catch (error: unknown) {
    console.error("process-feed error:", error);
    const message = error instanceof Error ? error.message : "Internal Agent Error";
    return Response.json({ error: message }, { status: 500 });
  }
}
