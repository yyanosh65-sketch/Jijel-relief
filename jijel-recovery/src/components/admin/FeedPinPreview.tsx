"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

import type { FeedFlowCategory } from "@/lib/feed-flow-classifier";
import { MAP_TILE_LAYER } from "@/lib/map-utils";

import "leaflet/dist/leaflet.css";

const FLOW_PIN_COLORS: Record<FeedFlowCategory, string> = {
  sos_medical: "#dc2626",
  accommodation: "#d97706",
  incoming_convoy: "#0284c7",
};

type FeedPinPreviewProps = {
  lat: number;
  lng: number;
  flowCategory: FeedFlowCategory;
  label?: string;
  className?: string;
};

export default function FeedPinPreview({
  lat,
  lng,
  flowCategory,
  label,
  className,
}: FeedPinPreviewProps) {
  const pinColor = FLOW_PIN_COLORS[flowCategory];

  return (
    <div
      className={className}
      dir="rtl"
      aria-label={label ?? "معاينة موقع المنشور على الخريطة"}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={12}
        className="h-40 w-full rounded-xl border border-slate-200"
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution={MAP_TILE_LAYER.attribution}
          url={MAP_TILE_LAYER.url}
          subdomains={MAP_TILE_LAYER.subdomains}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: pinColor,
            fillOpacity: 1,
          }}
        />
      </MapContainer>
      {label ? (
        <p className="mt-1.5 text-center text-[11px] font-medium text-slate-600">
          📍 {label}
        </p>
      ) : null}
    </div>
  );
}
