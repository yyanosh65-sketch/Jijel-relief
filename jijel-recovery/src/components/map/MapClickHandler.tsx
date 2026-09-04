"use client";

import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

import { clampJijelLandCoordinates } from "@/lib/geo";

/** Fired when the user taps empty map canvas (not a marker/popup). */
export const MAP_BACKGROUND_CLICK_EVENT = "ighata:map-background-click";

export function dispatchMapBackgroundClick() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MAP_BACKGROUND_CLICK_EVENT));
}

function isInteractiveOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      [
        ".leaflet-marker-icon",
        ".leaflet-marker-shadow",
        ".leaflet-popup",
        ".leaflet-control",
        ".map-cluster-icon",
        ".marker-cluster",
        ".need-marker-icon",
        ".trail-clearance-pin",
      ].join(","),
    ),
  );
}

type MapClickHandlerProps = {
  /** When true, map clicks drop a report pin */
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
  /** When true (default), empty-canvas taps collapse sheets / close popups */
  collapseOnBackgroundClick?: boolean;
};

export function MapClickHandler({
  enabled,
  onMapClick,
  collapseOnBackgroundClick = true,
}: MapClickHandlerProps) {
  const map = useMap();

  useMapEvents({
    click(event) {
      if (isInteractiveOverlayTarget(event.originalEvent?.target ?? null)) {
        return;
      }

      // Always close floating Leaflet popups on empty canvas
      map.closePopup();

      if (enabled) {
        const { lat, lng } = clampJijelLandCoordinates(
          event.latlng.lat,
          event.latlng.lng,
        );
        onMapClick(lat, lng);
        return;
      }

      if (collapseOnBackgroundClick) {
        dispatchMapBackgroundClick();
      }
    },
  });

  useEffect(() => {
    if (!map) return;
    const container = map.getContainer();
    if (enabled) {
      container.style.cursor = "crosshair";
    } else {
      container.style.cursor = "";
    }
  }, [enabled, map]);

  return null;
}
