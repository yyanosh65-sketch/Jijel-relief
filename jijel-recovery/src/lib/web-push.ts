import { eq } from "drizzle-orm";
import webpush from "web-push";

import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

export type PushBroadcastPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  needId?: number;
  lat?: number;
  lng?: number;
  urgency?: string;
};

let vapidConfigured = false;

function configureVapid(): boolean {
  if (vapidConfigured) {
    return true;
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ?? "mailto:relief@jijel-relief.local";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null;
}

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
}

export async function broadcastPushNotifications(
  payload: PushBroadcastPayload,
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!configureVapid()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await db.select().from(pushSubscriptions);

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    tag: payload.tag ?? `jijel-${Date.now()}`,
    needId: payload.needId,
    lat: payload.lat,
    lng: payload.lng,
    urgency: payload.urgency,
  });

  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload,
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null;

        if (statusCode === 404 || statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        }

        console.error("Web push delivery failed:", error);
      }
    }),
  );

  return { sent, failed, skipped: false };
}

export function buildEmergencyPushPayload(input: {
  title: string;
  message: string;
  commune?: string | null;
  communeAr?: string | null;
  village?: string | null;
  sourceKind?: string;
  sourceId?: number | null;
  urgency?: string | null;
  lat?: number;
  lng?: number;
}): PushBroadcastPayload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const locationLabel = [input.village, input.communeAr ?? input.commune]
    .filter(Boolean)
    .join(" — ");

  let url = `${appUrl}/map`;
  if (input.sourceKind === "aid_need" && input.sourceId) {
    url = `${appUrl}/map?needId=${input.sourceId}`;
  } else if (input.lat != null && input.lng != null) {
    url = `${appUrl}/map?lat=${input.lat}&lng=${input.lng}`;
  }

  return {
    title: input.title,
    body: locationLabel
      ? `${input.message}\n📍 ${locationLabel}`
      : input.message,
    url,
    tag: input.sourceId
      ? `emergency-${input.sourceKind}-${input.sourceId}`
      : `emergency-${Date.now()}`,
    needId:
      input.sourceKind === "aid_need" && input.sourceId
        ? input.sourceId
        : undefined,
    lat: input.lat,
    lng: input.lng,
    urgency: input.urgency ?? undefined,
  };
}

export function buildRoadClosurePushPayload(input: {
  routeLabel: string;
  communeAr: string;
  villageAr?: string | null;
  lat: number;
  lng: number;
  notes?: string | null;
}): PushBroadcastPayload {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const location = [input.villageAr, input.communeAr].filter(Boolean).join(" — ");

  return {
    title: "⚠️ تنبيه: مسلك مقطوع",
    body: `${input.routeLabel}${location ? ` — ${location}` : ""}${input.notes ? `\n${input.notes}` : ""}`,
    url: `${appUrl}/map?lat=${input.lat}&lng=${input.lng}`,
    tag: `road-closure-${input.lat}-${input.lng}`,
    lat: input.lat,
    lng: input.lng,
    urgency: "critical",
  };
}
