"use client";

import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";

import { clampJijelLandCoordinates } from "@/lib/geo";

type MapClickHandlerProps = {
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
};

export function MapClickHandler({ enabled, onMapClick }: MapClickHandlerProps) {
  const map = useMapEvents({
    click(event) {
      if (!enabled) return;
      const { lat, lng } = clampJijelLandCoordinates(
        event.latlng.lat,
        event.latlng.lng,
      );
      onMapClick(lat, lng);
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
