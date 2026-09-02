"use client";

import { Popup, type PopupProps } from "react-leaflet";

/** Keeps popups below the filter bar (z-400) but above map controls. */
export const MAP_POPUP_PROPS = {
  offset: [0, -25] as [number, number],
  autoPan: true,
  autoPanPaddingTopLeft: [30, 90] as [number, number],
  autoPanPaddingBottomRight: [30, 80] as [number, number],
  className: "custom-jijel-popup",
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
