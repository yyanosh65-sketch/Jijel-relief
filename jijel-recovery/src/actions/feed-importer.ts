"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { urgentAlerts } from "@/db/schema";
import {
  buildFeedDispatchWhatsAppMessage,
  parseFacebookSosPost,
  type FeedParseResult,
} from "@/lib/feed-parser";
import { verifiedReliefContacts } from "@/lib/relief-contacts";

function extractFacebookUrl(rawInput: string): string[] {
  const match = rawInput.match(/https?:\/\/(?:www\.)?(?:facebook|fb)\.com\/\S+/i);
  return match ? [match[0]] : [];
}

export type FeedDispatchResult = {
  alertId: number;
  parsed: FeedParseResult;
  whatsappTargets: { name: string; phone: string; whatsappUrl: string }[];
  shareUrl: string;
};

export async function previewFacebookSosPost(
  rawInput: string,
): Promise<FeedParseResult> {
  return parseFacebookSosPost(rawInput);
}

export async function parseAndDispatchSosPost(
  rawInput: string,
): Promise<FeedDispatchResult> {
  const parsed = parseFacebookSosPost(rawInput);

  if (!parsed.description.trim()) {
    throw new Error("لا يمكن حفظ نداء فارغ.");
  }

  const [row] = await db
    .insert(urgentAlerts)
    .values({
      emergencyType: parsed.emergencyType,
      description: parsed.description,
      reporterName: parsed.reporterName,
      reporterPhone: parsed.reporterPhone,
      daira: parsed.daira,
      commune: parsed.commune,
      village: parsed.village,
      lat: String(parsed.lat),
      lng: String(parsed.lng),
      status: "active",
      mediaUrls: extractFacebookUrl(rawInput),
    })
    .returning({ id: urgentAlerts.id });

  revalidatePath("/");
  revalidatePath("/map");

  const message = buildFeedDispatchWhatsAppMessage(parsed, row.id);
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const whatsappTargets = verifiedReliefContacts
    .filter(
      (c) =>
        c.category === "field_team" &&
        c.status === "active" &&
        c.daira === parsed.daira,
    )
    .map((c) => ({
      name: c.name,
      phone: c.whatsapp ?? c.phone,
      whatsappUrl: `https://wa.me/${(c.whatsapp ?? c.phone).replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
    }));

  return {
    alertId: row.id,
    parsed,
    whatsappTargets,
    shareUrl,
  };
}
