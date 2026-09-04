"use client";

import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

import {
  MAP_FLY_TO_BOUNDS_EVENT,
  type FlyToBoundsDetail,
} from "@/lib/map-fly-to";

/** Listens for commune focus events and fits the Leaflet map. */
export default function MapFlyToController() {
  const map = useMap();

  useEffect(() => {
    function onFly(event: Event) {
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

    window.addEventListener(MAP_FLY_TO_BOUNDS_EVENT, onFly);
    return () => window.removeEventListener(MAP_FLY_TO_BOUNDS_EVENT, onFly);
  }, [map]);

  return null;
}
