"use client";

import { useEffect, useState } from "react";

import {
  isBrowserOffline,
  type OfflinePendingSubmission,
  getPendingOfflineSubmissions,
  removePendingOfflineSubmission,
} from "@/lib/offline-storage";

/** Tiny hook for online/offline UI (does not block navigation). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function sync() {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    }

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}

/**
 * Best-effort flush of queued offline submissions when connectivity returns.
 * Server actions / APIs are invoked dynamically to avoid circular imports.
 */
export async function flushPendingOfflineSubmissions(): Promise<number> {
  if (isBrowserOffline()) return 0;

  const pending = await getPendingOfflineSubmissions();
  let synced = 0;

  for (const entry of pending) {
    if (entry.id == null) continue;
    try {
      const ok = await syncOneSubmission(entry);
      if (ok) {
        await removePendingOfflineSubmission(entry.id);
        synced += 1;
      }
    } catch (error) {
      console.warn("[offline] sync failed for", entry.type, error);
    }
  }

  return synced;
}

async function syncOneSubmission(
  entry: OfflinePendingSubmission,
): Promise<boolean> {
  const payload = entry.payload as Record<string, unknown> | null;
  if (!payload) return false;

  const type = entry.type.toUpperCase();

  if (type === "SOS" || type === "FZAA") {
    const { submitUrgentAlert } = await import("@/actions/emergency");
    const draft = (payload.draft ?? payload) as Record<string, unknown>;
    const result = await submitUrgentAlert({
      emergencyType: String(
        draft.emergencyType ?? payload.emergencyType ?? "medical",
      ) as "fire_flare" | "livestock_trap" | "medical" | "water_cutoff",
      description: String(draft.description ?? payload.description ?? "نداء بدون إنترنت"),
      reporterName: String(draft.reporterName ?? payload.reporterName ?? "مواطن"),
      reporterPhone: String(
        draft.contactPhone ??
          draft.reporterPhone ??
          payload.contactPhone ??
          "",
      ) || undefined,
      daira: String(draft.daira ?? payload.daira ?? ""),
      commune: String(draft.commune ?? payload.commune ?? ""),
      village: draft.village ? String(draft.village) : undefined,
      lat: Number(draft.lat ?? payload.lat ?? 0),
      lng: Number(draft.lng ?? payload.lng ?? 0),
    });
    return Boolean(result.success);
  }

  if (type === "CHECKIN" || type === "CHECK_IN") {
    const response = await fetch("/api/responders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload.form ?? payload),
    });
    const json = (await response.json()) as { success?: boolean };
    return Boolean(response.ok && json.success);
  }

  if (type === "ROAD" || type === "FIELD_REPORT") {
    const { createVillageFieldReport } = await import(
      "@/actions/field-reports"
    );
    const form = (payload.form ?? payload) as Parameters<
      typeof createVillageFieldReport
    >[0];
    const result = await createVillageFieldReport(form);
    return Boolean(result.success);
  }

  if (type === "TRAIL") {
    const form = (payload.form ?? payload) as Record<string, unknown>;
    const response = await fetch("/api/trails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = (await response.json()) as { success?: boolean };
    return Boolean(response.ok && json.success);
  }

  return false;
}
