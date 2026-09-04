"use client";

import { Popup, type PopupProps } from "react-leaflet";

/** Keeps popups below floating filters but above map tiles. */
export const MAP_POPUP_PROPS = {
  offset: [0, -28] as [number, number],
  autoPan: true,
  autoPanPaddingTopLeft: [28, 200] as [number, number],
  autoPanPaddingBottomRight: [28, 130] as [number, number],
  className: "custom-jijel-popup facility-safe-popup",
  maxWidth: 340,
  minWidth: 280,
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
