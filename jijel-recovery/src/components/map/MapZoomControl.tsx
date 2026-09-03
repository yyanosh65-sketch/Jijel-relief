"use client";

import { ZoomControl } from "react-leaflet";

/** Zoom controls anchored bottom-right, clear of HUD / dock via CSS. */
export default function MapZoomControl() {
  return <ZoomControl position="bottomright" />;
}
