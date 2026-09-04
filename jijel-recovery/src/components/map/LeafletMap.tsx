"use client";

import type { ReactNode } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import { MapClickHandler } from "@/components/map/MapClickHandler";
import MapFlyToController from "@/components/map/MapFlyToController";
import MapInvalidateSize from "@/components/map/MapInvalidateSize";
import MapZoomControl from "@/components/map/MapZoomControl";
import {
  DEFAULT_MAP_ZOOM,
  JIJEL_CENTER,
  JIJEL_MAX_BOUNDS,
  JIJEL_MAX_ZOOM,
  JIJEL_MIN_ZOOM,
  MAP_TILE_LAYER,
} from "@/lib/map-utils";

import "leaflet/dist/leaflet.css";

/**
 * Patches the Leaflet Popup prototype so every popup that auto-pans
 * clears the top HUD + commune filter ribbon (≈ 168 px).
 */
function AutoPanPaddingConfig() {
  useMap(); // must be called inside MapContainer
  (L.Popup.prototype.options as Record<string, unknown>).autoPanPaddingTopLeft =
    L.point(24, 168);
  (
    L.Popup.prototype.options as Record<string, unknown>
  ).autoPanPaddingBottomRight = L.point(24, 100);
  return null;
}

type LeafletMapProps = {
  children?: ReactNode;
  className?: string;
  pinDropMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  /** Changes trigger map.invalidateSize() */
  layoutEpoch?: unknown;
};

export default function LeafletMap({
  children,
  className = "relative z-10 h-full w-full touch-pan-x touch-pan-y",
  pinDropMode = false,
  onMapClick,
  layoutEpoch,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={[JIJEL_CENTER.lat, JIJEL_CENTER.lng]}
      zoom={DEFAULT_MAP_ZOOM}
      minZoom={JIJEL_MIN_ZOOM}
      maxZoom={JIJEL_MAX_ZOOM}
      maxBounds={JIJEL_MAX_BOUNDS}
      maxBoundsViscosity={1.0}
      className={className}
      scrollWheelZoom
      zoomControl={false}
      style={{ touchAction: "pan-x pan-y" }}
    >
      <TileLayer
        attribution={MAP_TILE_LAYER.attribution}
        url={MAP_TILE_LAYER.url}
        maxZoom={JIJEL_MAX_ZOOM}
      />
      <AutoPanPaddingConfig />
      <MapFlyToController />
      <MapZoomControl />
      <MapInvalidateSize trigger={layoutEpoch} />
      <MapClickHandler
        enabled={Boolean(pinDropMode && onMapClick)}
        onMapClick={onMapClick ?? (() => undefined)}
        collapseOnBackgroundClick
      />
      {children}
    </MapContainer>
  );
}
