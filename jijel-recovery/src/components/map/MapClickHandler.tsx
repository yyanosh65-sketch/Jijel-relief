"use client";

import { useEffect } from "react";
import { useMapEvents } from "react-leaflet";

type MapClickHandlerProps = {
  enabled: boolean;
  onMapClick: (lat: number, lng: number) => void;
};

export function MapClickHandler({ enabled, onMapClick }: MapClickHandlerProps) {
  const map = useMapEvents({
    click(event) {
      if (!enabled) return;
      onMapClick(event.latlng.lat, event.latlng.lng);
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
