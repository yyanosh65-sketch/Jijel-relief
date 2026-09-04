"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

import {
  MAP_FLY_TO_BOUNDS_EVENT,
  MAP_FLY_TO_POINT_EVENT,
  type FlyToBoundsDetail,
  type FlyToPointDetail,
} from "@/lib/map-fly-to";
import { useWilayaOptional } from "@/components/map/WilayaProvider";
import { getWilayaDefinition } from "@/lib/wilaya";

/** Listens for commune / wilaya focus events and fits the Leaflet map. */
export default function MapFlyToController() {
  const map = useMap();
  const wilayaCtx = useWilayaOptional();

  useEffect(() => {
    function onFlyBounds(event: Event) {
      const custom = event as CustomEvent<FlyToBoundsDetail>;
      const points = custom.detail?.points;
      if (!points || points.length === 0) return;

      if (points.length === 1) {
        map.flyTo([points[0].lat, points[0].lng], 13, { duration: 0.85 });
        return;
      }

      const bounds = L.latLngBounds(
        points.map((p) => L.latLng(p.lat, p.lng)),
      );
      map.flyToBounds(bounds, {
        padding: custom.detail.padding ?? [60, 60],
        maxZoom: custom.detail.maxZoom ?? 14,
        duration: 0.9,
      });
    }

    function onFlyPoint(event: Event) {
      const custom = event as CustomEvent<FlyToPointDetail>;
      const detail = custom.detail;
      if (!detail || !Number.isFinite(detail.lat) || !Number.isFinite(detail.lng)) {
        return;
      }
      map.flyTo([detail.lat, detail.lng], detail.zoom ?? 11, {
        duration: detail.duration ?? 0.9,
      });
    }

    window.addEventListener(MAP_FLY_TO_BOUNDS_EVENT, onFlyBounds);
    window.addEventListener(MAP_FLY_TO_POINT_EVENT, onFlyPoint);
    return () => {
      window.removeEventListener(MAP_FLY_TO_BOUNDS_EVENT, onFlyBounds);
      window.removeEventListener(MAP_FLY_TO_POINT_EVENT, onFlyPoint);
    };
  }, [map]);

  // Soft-lock viewport to the active wilaya envelope (still covers Babor / Collo)
  useEffect(() => {
    if (!wilayaCtx) return;
    const def = getWilayaDefinition(wilayaCtx.wilaya);
    const bounds = L.latLngBounds(
      L.latLng(def.maxBounds[0][0], def.maxBounds[0][1]),
      L.latLng(def.maxBounds[1][0], def.maxBounds[1][1]),
    );
    map.setMaxBounds(bounds);
  }, [map, wilayaCtx?.wilaya]);

  return null;
}
