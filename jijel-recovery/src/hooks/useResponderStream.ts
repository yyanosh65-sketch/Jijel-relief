"use client";

import { useCallback, useEffect, useState } from "react";

import type { ActiveResponder, ResponderRole } from "@/db/schema";
import type { ResponderUpdatePayload } from "@/lib/responder-events";
import {
  emptyBadgeCounts,
  roleToBadgeBucket,
  type ResponderBadgeCounts,
} from "@/lib/responders";

function normalizeResponder(
  payload: ResponderUpdatePayload,
): ActiveResponder {
  return {
    ...payload,
    checkedInAt:
      typeof payload.checkedInAt === "string"
        ? new Date(payload.checkedInAt)
        : payload.checkedInAt,
  };
}

function buildBadgeMap(
  rows: ActiveResponder[],
): Map<number, ResponderBadgeCounts> {
  const map = new Map<number, ResponderBadgeCounts>();

  for (const row of rows) {
    if (row.status === "completed" || !row.needId) continue;
    const current = map.get(row.needId) ?? emptyBadgeCounts();
    const bucket = roleToBadgeBucket(row.role as ResponderRole);
    if (bucket) {
      current[bucket] += 1;
      current.total += 1;
      map.set(row.needId, current);
    }
  }

  return map;
}

/**
 * Loads active responders + keeps badge counts live via SSE `responder_update`.
 */
export function useResponderStream(): {
  responders: ActiveResponder[];
  badgesByNeedId: Map<number, ResponderBadgeCounts>;
  upsertLocal: (row: ActiveResponder) => void;
} {
  const [responders, setResponders] = useState<ActiveResponder[]>([]);

  const upsertLocal = useCallback((row: ActiveResponder) => {
    setResponders((current) => {
      const without = current.filter((item) => item.id !== row.id);
      return [row, ...without];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const response = await fetch("/api/responders");
        const json = (await response.json()) as {
          success?: boolean;
          data?: ResponderUpdatePayload[];
        };
        if (!cancelled && json.success && Array.isArray(json.data)) {
          setResponders(json.data.map(normalizeResponder));
        }
      } catch {
        // Ignore bootstrap failures — SSE can still populate later.
      }
    }

    void loadInitial();

    const source = new EventSource("/api/notifications/stream");

    source.addEventListener("responder_update", (event) => {
      try {
        const payload = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as ResponderUpdatePayload;
        const row = normalizeResponder(payload);
        setResponders((current) => {
          const without = current.filter((item) => item.id !== row.id);
          return [row, ...without];
        });
      } catch {
        // Ignore malformed payloads.
      }
    });

    return () => {
      cancelled = true;
      source.close();
    };
  }, []);

  return {
    responders,
    badgesByNeedId: buildBadgeMap(responders),
    upsertLocal,
  };
}
