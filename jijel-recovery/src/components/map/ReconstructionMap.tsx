"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import { MapPin } from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import type { MapNeed } from "@/actions/needs";
import {
  DEFAULT_MAP_ZOOM,
  getMarkerColor,
  JIJEL_CENTER,
  MAP_CATEGORIES,
  matchesMapCategories,
  type MapCategoryId,
  type MarkerColor,
} from "@/lib/map-utils";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";

const MARKER_COLORS: Record<MarkerColor, string> = {
  red: "#dc2626",
  orange: "#ea580c",
  green: "#16a34a",
};

function createMarkerIcon(color: MarkerColor): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:${MARKER_COLORS[color]};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

type ReconstructionMapProps = {
  needs: MapNeed[];
  selectedNeedId?: number | null;
  onPledgeClick: (need: MapNeed) => void;
};

function NeedPopupContent({
  need,
  onPledgeClick,
}: {
  need: MapNeed;
  onPledgeClick: (need: MapNeed) => void;
}) {
  const remaining = need.quantityNeeded - need.quantityFulfilled;
  const progress =
    need.quantityNeeded > 0
      ? Math.min((need.quantityFulfilled / need.quantityNeeded) * 100, 100)
      : 0;

  return (
    <div className="min-w-[220px] space-y-3 p-1">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{need.title}</h3>
        <p className="mt-1 text-xs text-zinc-600">
          {need.location.name}
          {need.location.daira ? ` · ${need.location.daira}` : ""}
        </p>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-zinc-600">
          <span>
            {need.quantityFulfilled} / {need.quantityNeeded} fulfilled
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-emerald-600"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPledgeClick(need)}
        disabled={remaining <= 0}
        className="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Adopt / Pledge
      </button>
    </div>
  );
}

export default function ReconstructionMap({
  needs,
  selectedNeedId,
  onPledgeClick,
}: ReconstructionMapProps) {
  const [activeCategories, setActiveCategories] = useState<Set<MapCategoryId>>(
    () => new Set(MAP_CATEGORIES.map((category) => category.id)),
  );

  const markerIcons = useMemo(
    () => ({
      red: createMarkerIcon("red"),
      orange: createMarkerIcon("orange"),
      green: createMarkerIcon("green"),
    }),
    [],
  );

  const visibleNeeds = useMemo(
    () => needs.filter((need) => matchesMapCategories(need, activeCategories)),
    [needs, activeCategories],
  );

  function toggleCategory(categoryId: MapCategoryId) {
    setActiveCategories((current) => {
      const next = new Set(current);

      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }

      return next;
    });
  }

  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex justify-center p-4">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/95 p-2 shadow-lg backdrop-blur">
          {MAP_CATEGORIES.map((category) => {
            const isActive = activeCategories.has(category.id);

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-emerald-700 text-white"
                    : "bg-zinc-100 text-zinc-500",
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] rounded-xl border border-white/70 bg-white/95 p-3 text-xs shadow-lg backdrop-blur">
        <p className="mb-2 font-semibold text-zinc-800">Legend</p>
        <ul className="space-y-1 text-zinc-600">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            Critical urgency
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-600" />
            Moderate urgency
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-600" />
            In progress / pledged
          </li>
        </ul>
      </div>

      <MapContainer
        center={[JIJEL_CENTER.lat, JIJEL_CENTER.lng]}
        zoom={DEFAULT_MAP_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {visibleNeeds.map((need) => {
          const color = getMarkerColor(need);
          const isSelected = selectedNeedId === need.id;

          return (
            <Marker
              key={need.id}
              position={[need.lat, need.lng]}
              icon={markerIcons[color]}
              opacity={isSelected ? 1 : 0.92}
            >
              <Popup>
                <NeedPopupContent need={need} onPledgeClick={onPledgeClick} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {visibleNeeds.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-[1000] flex justify-center px-4">
          <div className="flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm text-zinc-600 shadow-lg">
            <MapPin className="h-4 w-4" />
            No verified needs match the selected filters.
          </div>
        </div>
      ) : null}
    </div>
  );
}
