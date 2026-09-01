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

import { createPledge } from "@/actions/pledges";
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
  onPledgeSuccess?: () => void;
};

type PledgeFormState = {
  contributorName: string;
  contributorContact: string;
  quantity: string;
};

function ProgressBar({
  fulfilled,
  needed,
}: {
  fulfilled: number;
  needed: number;
}) {
  const percentage = needed > 0 ? Math.min((fulfilled / needed) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-600">
        <span>
          {fulfilled} / {needed} fulfilled
        </span>
        <span>{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function NeedPopupContent({
  need,
  onPledgeSuccess,
}: {
  need: MapNeed;
  onPledgeSuccess?: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<PledgeFormState>({
    contributorName: "",
    contributorContact: "",
    quantity: "1",
  });

  const remaining = need.quantityNeeded - need.quantityFulfilled;

  async function handlePledge(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createPledge({
      needId: need.id,
      contributorName: form.contributorName,
      contributorContact: form.contributorContact || undefined,
      quantity: Number(form.quantity),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Unable to submit pledge.");
      return;
    }

    setSuccess(true);
    onPledgeSuccess?.();
  }

  if (success) {
    return (
      <div className="space-y-2 p-1">
        <p className="text-sm font-medium text-emerald-700">
          Thank you for your pledge!
        </p>
        <p className="text-xs text-zinc-600">
          A coordinator will follow up to confirm delivery details.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-[240px] space-y-3 p-1">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{need.title}</h3>
        <p className="mt-1 text-xs text-zinc-600">
          {need.location.name}
          {need.location.daira ? ` · ${need.location.daira}` : ""}
        </p>
      </div>

      <ProgressBar
        fulfilled={need.quantityFulfilled}
        needed={need.quantityNeeded}
      />

      {remaining > 0 ? (
        <form className="space-y-2" onSubmit={handlePledge}>
          <input
            required
            type="text"
            placeholder="Your name"
            value={form.contributorName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contributorName: event.target.value,
              }))
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-600"
          />
          <input
            type="text"
            placeholder="Phone or email (optional)"
            value={form.contributorContact}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contributorContact: event.target.value,
              }))
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-600"
          />
          <input
            required
            type="number"
            min={1}
            max={remaining}
            value={form.quantity}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                quantity: event.target.value,
              }))
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-600"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Adopt / Pledge"}
          </button>
        </form>
      ) : (
        <p className="text-xs font-medium text-emerald-700">
          This need is fully pledged.
        </p>
      )}
    </div>
  );
}

export default function ReconstructionMap({
  needs,
  onPledgeSuccess,
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

          return (
            <Marker
              key={need.id}
              position={[need.lat, need.lng]}
              icon={markerIcons[color]}
            >
              <Popup>
                <NeedPopupContent
                  need={need}
                  onPledgeSuccess={onPledgeSuccess}
                />
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
