"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker } from "react-leaflet";

import {
  cacheMountainTrails,
  getCachedMountainTrails,
  isBrowserOffline,
} from "@/lib/offline-storage";
import { clampJijelLandCoordinates } from "@/lib/geo";
import {
  createTrailMarkerIconHtml,
  type SerializedMountainTrail,
} from "@/lib/trail-clearance";

type TrailClearanceLayerProps = {
  visible: boolean;
  refreshKey?: number;
  onTrailClick?: (trail: SerializedMountainTrail) => void;
};

export default function TrailClearanceLayer({
  visible,
  refreshKey = 0,
  onTrailClick,
}: TrailClearanceLayerProps) {
  const [trails, setTrails] = useState<SerializedMountainTrail[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (isBrowserOffline()) {
          const cached = await getCachedMountainTrails();
          if (!cancelled && cached) {
            setTrails(cached as SerializedMountainTrail[]);
          }
          return;
        }

        const response = await fetch("/api/trails");
        const json = (await response.json()) as {
          success?: boolean;
          data?: SerializedMountainTrail[];
        };

        if (!cancelled && json.success && Array.isArray(json.data)) {
          setTrails(json.data);
          void cacheMountainTrails(json.data);
          return;
        }

        const cached = await getCachedMountainTrails();
        if (!cancelled && cached) {
          setTrails(cached as SerializedMountainTrail[]);
        }
      } catch {
        const cached = await getCachedMountainTrails();
        if (!cancelled && cached) {
          setTrails(cached as SerializedMountainTrail[]);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const icons = useMemo(() => {
    const map = new Map<string, L.DivIcon>();
    for (const trail of trails) {
      const key = trail.clearanceLevel;
      if (map.has(key)) continue;
      map.set(
        key,
        L.divIcon({
          className: "",
          html: createTrailMarkerIconHtml(trail.clearanceLevel),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      );
    }
    return map;
  }, [trails]);

  if (!visible || trails.length === 0) {
    return null;
  }

  // Deduplicate by roadCode keeping newest (API already DESC)
  const seen = new Set<string>();
  const latest = trails.filter((trail) => {
    const key = trail.roadCode.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <>
      {latest.map((trail) => {
        const { lat, lng } = clampJijelLandCoordinates(
          Number(trail.lat),
          Number(trail.lng),
        );
        const icon =
          icons.get(trail.clearanceLevel) ??
          L.divIcon({
            className: "",
            html: createTrailMarkerIconHtml(trail.clearanceLevel),
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

        return (
          <Marker
            key={trail.id}
            position={[lat, lng]}
            icon={icon}
            zIndexOffset={600}
            eventHandlers={
              onTrailClick
                ? {
                    click: () => onTrailClick(trail),
                  }
                : undefined
            }
          />
        );
      })}
    </>
  );
}
