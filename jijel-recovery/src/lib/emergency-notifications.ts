import { desc } from "drizzle-orm";

import { db } from "@/db";
import { emergencyNotifications } from "@/db/schema";
import type { NeedCategory, NeedUrgency } from "@/db/schema";
import {
  broadcastPushNotifications,
  buildEmergencyPushPayload,
  buildRoadClosurePushPayload,
} from "@/lib/web-push";

export type EmergencyNotificationPayload = {
  id: number;
  title: string;
  message: string;
  commune: string;
  communeAr: string | null;
  village: string | null;
  phone: string | null;
  facebookUrl: string | null;
  urgency: string | null;
  category: string | null;
  sourceKind: "sos_alert" | "aid_need";
  sourceId: number | null;
  createdAt: string;
};

type EmergencyNotificationBus = {
  listeners: Set<(event: EmergencyNotificationPayload) => void>;
  recent: EmergencyNotificationPayload[];
};

declare global {
  // eslint-disable-next-line no-var
  var __emergencyNotificationBus: EmergencyNotificationBus | undefined;
}

function getBus(): EmergencyNotificationBus {
  if (!globalThis.__emergencyNotificationBus) {
    globalThis.__emergencyNotificationBus = {
      listeners: new Set(),
      recent: [],
    };
  }
  return globalThis.__emergencyNotificationBus;
}

export function subscribeEmergencyNotifications(
  listener: (event: EmergencyNotificationPayload) => void,
): () => void {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => bus.listeners.delete(listener);
}

export function getRecentEmergencyNotifications(): EmergencyNotificationPayload[] {
  return [...getBus().recent];
}

function publishToBus(event: EmergencyNotificationPayload): void {
  const bus = getBus();
  bus.recent = [event, ...bus.recent].slice(0, 40);
  for (const listener of bus.listeners) {
    listener(event);
  }
}

export function isEmergencyPushEligible(input: {
  urgency?: NeedUrgency | string | null;
  category?: NeedCategory | string | null;
  flowCategory?: string | null;
}): boolean {
  if (input.urgency === "critical") return true;
  if (input.category === "sos_orphan_family" || input.category === "medical") {
    return true;
  }
  if (input.flowCategory === "sos_medical") return true;
  return false;
}

export async function createEmergencyNotification(input: {
  title: string;
  message: string;
  commune: string;
  communeAr?: string | null;
  village?: string | null;
  phone?: string | null;
  facebookUrl?: string | null;
  urgency?: string | null;
  category?: string | null;
  sourceKind: "sos_alert" | "aid_need";
  sourceId?: number | null;
}): Promise<EmergencyNotificationPayload | null> {
  if (
    !isEmergencyPushEligible({
      urgency: input.urgency,
      category: input.category,
      flowCategory:
        input.sourceKind === "sos_alert" ? "sos_medical" : undefined,
    })
  ) {
    return null;
  }

  const [row] = await db
    .insert(emergencyNotifications)
    .values({
      title: input.title,
      message: input.message,
      commune: input.commune,
      communeAr: input.communeAr ?? null,
      village: input.village ?? null,
      phone: input.phone ?? null,
      facebookUrl: input.facebookUrl ?? null,
      urgency: input.urgency ?? null,
      category: input.category ?? null,
      sourceKind: input.sourceKind,
      sourceId: input.sourceId ?? null,
    })
    .returning();

  const payload: EmergencyNotificationPayload = {
    id: row.id,
    title: row.title,
    message: row.message,
    commune: row.commune,
    communeAr: row.communeAr,
    village: row.village,
    phone: row.phone,
    facebookUrl: row.facebookUrl,
    urgency: row.urgency,
    category: row.category,
    sourceKind: row.sourceKind as EmergencyNotificationPayload["sourceKind"],
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
  };

  publishToBus(payload);

  void broadcastPushNotifications(
    buildEmergencyPushPayload({
      title: payload.title,
      message: payload.message,
      commune: payload.commune,
      communeAr: payload.communeAr,
      village: payload.village,
      sourceKind: payload.sourceKind,
      sourceId: payload.sourceId,
      urgency: payload.urgency,
    }),
  ).catch((error) => {
    console.error("Emergency web push broadcast failed:", error);
  });

  return payload;
}

export async function notifyRoadClosure(input: {
  routeLabel: string;
  communeAr: string;
  villageAr?: string | null;
  lat: number;
  lng: number;
  notes?: string | null;
}): Promise<void> {
  const payload = buildRoadClosurePushPayload(input);

  void broadcastPushNotifications(payload).catch((error) => {
    console.error("Road closure web push broadcast failed:", error);
  });
}

export async function listRecentEmergencyNotifications(
  limit = 20,
): Promise<EmergencyNotificationPayload[]> {
  const rows = await db
    .select()
    .from(emergencyNotifications)
    .orderBy(desc(emergencyNotifications.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    message: row.message,
    commune: row.commune,
    communeAr: row.communeAr,
    village: row.village,
    phone: row.phone,
    facebookUrl: row.facebookUrl,
    urgency: row.urgency,
    category: row.category,
    sourceKind: row.sourceKind as EmergencyNotificationPayload["sourceKind"],
    sourceId: row.sourceId,
    createdAt: row.createdAt.toISOString(),
  }));
}
