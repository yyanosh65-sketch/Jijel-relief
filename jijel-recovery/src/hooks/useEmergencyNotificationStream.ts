"use client";

import { useEffect, useState } from "react";

import type { EmergencyNotificationPayload } from "@/lib/emergency-notifications";

export function useEmergencyNotificationStream(): EmergencyNotificationPayload[] {
  const [alerts, setAlerts] = useState<EmergencyNotificationPayload[]>([]);

  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("emergency", (event) => {
      try {
        const payload = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as EmergencyNotificationPayload;
        setAlerts((current) => {
          if (current.some((item) => item.id === payload.id)) {
            return current;
          }
          return [payload, ...current].slice(0, 12);
        });
      } catch {
        // Ignore malformed payloads.
      }
    });

    return () => source.close();
  }, []);

  return alerts;
}
