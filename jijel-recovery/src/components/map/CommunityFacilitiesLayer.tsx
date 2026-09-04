"use client";

import { useEffect, useMemo, useState } from "react";
import type { DivIcon } from "leaflet";
import { Marker } from "react-leaflet";

import MapMarkerCluster from "@/components/map/MapMarkerCluster";
import { createCommunityFacilityMarkerIcon } from "@/lib/map-layer-icons";
import { clampJijelLandCoordinates } from "@/lib/geo";
import type { CommunityFacility } from "@/db/schema";

type CommunityFacilitiesLayerProps = {
  /** Which sub-layers are active */
  showMosques: boolean;
  showSprings: boolean;
  refreshKey?: number;
  onFacilityClick?: (facility: CommunityFacility) => void;
};

const MOSQUE_TYPES = new Set([
  "mosque_operational",
  "mosque_damaged",
  "zawiya_sanctuary",
]);

const SPRING_TYPES = new Set([
  "water_spring",
  "oxygen_generator",
  "cold_chain_pharma",
]);

export default function CommunityFacilitiesLayer({
  showMosques,
  showSprings,
  refreshKey = 0,
  onFacilityClick,
}: CommunityFacilitiesLayerProps) {
  const [facilities, setFacilities] = useState<CommunityFacility[]>([]);

  useEffect(() => {
    if (!showMosques && !showSprings) return;

    let cancelled = false;

    void fetch("/api/community-facilities")
      .then((r) => r.json())
      .then(
        (json: { success?: boolean; data?: CommunityFacility[] }) => {
          if (!cancelled && json.success && Array.isArray(json.data)) {
            setFacilities(json.data);
          }
        },
      )
      .catch(() => {
        // silently ignore
      });

    return () => {
      cancelled = true;
    };
  }, [showMosques, showSprings, refreshKey]);

  const visible = useMemo(() => {
    return facilities.filter((f) => {
      if (showMosques && MOSQUE_TYPES.has(f.facilityType)) return true;
      if (showSprings && SPRING_TYPES.has(f.facilityType)) return true;
      return false;
    });
  }, [facilities, showMosques, showSprings]);

  const iconCache = useMemo(() => {
    const cache = new Map<string, DivIcon>();
    for (const type of [
      "mosque_operational",
      "mosque_damaged",
      "zawiya_sanctuary",
      "water_spring",
      "oxygen_generator",
      "cold_chain_pharma",
    ]) {
      cache.set(type, createCommunityFacilityMarkerIcon(type));
    }
    return cache;
  }, []);

  return (
    <>
      {visible.length === 0 ? null : (
        <MapMarkerCluster accent="amber">
          {visible.map((facility) => {
            const { lat, lng } = clampJijelLandCoordinates(
              Number(facility.lat),
              Number(facility.lng),
            );
            const icon =
              iconCache.get(facility.facilityType) ??
              createCommunityFacilityMarkerIcon(facility.facilityType);

            return (
              <Marker
                key={`cf-${facility.id}`}
                position={[lat, lng]}
                icon={icon}
                eventHandlers={
                  onFacilityClick
                    ? { click: () => onFacilityClick(facility) }
                    : undefined
                }
              />
            );
          })}
        </MapMarkerCluster>
      )}
    </>
  );
}
