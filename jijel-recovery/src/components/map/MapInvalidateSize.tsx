"use client";

import { useMap } from "react-leaflet";
import { useEffect } from "react";

/** Forces Leaflet to recalculate size when overlays open/close or layout shifts. */
export default function MapInvalidateSize({ trigger }: { trigger: unknown }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 50);

    return () => window.clearTimeout(id);
  }, [map, trigger]);

  return null;
}
