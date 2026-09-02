"use client";

import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import { MapClickHandler } from "@/components/map/MapClickHandler";
import {
  DEFAULT_MAP_ZOOM,
  JIJEL_CENTER,
  JIJEL_MAX_BOUNDS,
  JIJEL_MAX_ZOOM,
  JIJEL_MIN_ZOOM,
  MAP_TILE_LAYER,
} from "@/lib/map-utils";

import "leaflet/dist/leaflet.css";

type LeafletMapProps = {
  children?: ReactNode;
  className?: string;
  pinDropMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
};

export default function LeafletMap({
  children,
  className = "relative z-10 h-full w-full",
  pinDropMode = false,
  onMapClick,
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
    >
      <TileLayer
        attribution={MAP_TILE_LAYER.attribution}
        url={MAP_TILE_LAYER.url}
        maxZoom={JIJEL_MAX_ZOOM}
      />
      {onMapClick ? (
        <MapClickHandler enabled={pinDropMode} onMapClick={onMapClick} />
      ) : null}
      {children}
    </MapContainer>
  );
}
