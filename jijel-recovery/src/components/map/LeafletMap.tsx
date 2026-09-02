"use client";

import type { ReactNode } from "react";
import { MapContainer, TileLayer } from "react-leaflet";

import { MapClickHandler } from "@/components/map/MapClickHandler";
import { DEFAULT_MAP_ZOOM, JIJEL_CENTER } from "@/lib/map-utils";

import "leaflet/dist/leaflet.css";

type LeafletMapProps = {
  children?: ReactNode;
  className?: string;
  pinDropMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
};

export default function LeafletMap({
  children,
  className = "h-full w-full",
  pinDropMode = false,
  onMapClick,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={[JIJEL_CENTER.lat, JIJEL_CENTER.lng]}
      zoom={DEFAULT_MAP_ZOOM}
      className={className}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {onMapClick ? (
        <MapClickHandler enabled={pinDropMode} onMapClick={onMapClick} />
      ) : null}
      {children}
    </MapContainer>
  );
}
