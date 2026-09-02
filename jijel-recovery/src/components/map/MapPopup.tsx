"use client";

import { Popup, type PopupProps } from "react-leaflet";

/** Keeps popups below the filter bar (z-400) but above map controls. */
export const MAP_POPUP_PROPS = {
  autoPan: true,
  autoPanPaddingTopLeft: [20, 110] as [number, number],
  className: "map-marker-popup",
} as const;

export default function MapPopup({
  children,
  ...props
}: PopupProps) {
  return (
    <Popup {...MAP_POPUP_PROPS} {...props}>
      {children}
    </Popup>
  );
}
