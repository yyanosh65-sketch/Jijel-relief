"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import { Loader2, MapPin, MessageCircle } from "lucide-react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import { createPledge } from "@/actions/pledges";
import type { MapIntelligenceData, SosMapAlert } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import { formatLocationHeader } from "@/lib/locations";
import {
  createFacilityMarkerIcon,
  createRoadMarkerIcon,
  createSosMarkerIcon,
  createVillageMarkerIcon,
} from "@/lib/map-layer-icons";
import {
  DEFAULT_MAP_ZOOM,
  getMarkerColor,
  JIJEL_CENTER,
  MAP_CATEGORIES,
  matchesMapCategories,
  type MapCategoryId,
  type MarkerColor,
} from "@/lib/map-utils";
import { SOS_EMERGENCY_OPTIONS } from "@/lib/intelligence";
import {
  glassPanelClass,
  MAP_LAYER_LABELS,
  MAP_LEGEND_LABELS,
  NeedProgressBar,
} from "@/lib/ui-labels";
import { buildWhatsAppUrl } from "@/lib/phone";
import WaypointsLayer from "@/components/map/WaypointsLayer";
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
  intelligence: MapIntelligenceData;
  selectedNeedId?: number | null;
  onPledgeClick: (need: MapNeed) => void;
  onPledgeSuccess?: () => void;
  onVillageClick: (dossierId: string) => void;
};

type MapLayerKey = keyof typeof MAP_LAYER_LABELS;

const LAYER_TOGGLES: Array<{ key: MapLayerKey; labelAr: string }> = [
  { key: "needs", labelAr: MAP_LAYER_LABELS.needs },
  { key: "sos", labelAr: MAP_LAYER_LABELS.sos },
  { key: "roads", labelAr: MAP_LAYER_LABELS.roads },
  { key: "facilities", labelAr: MAP_LAYER_LABELS.facilities },
  { key: "villages", labelAr: MAP_LAYER_LABELS.villages },
  { key: "waypoints", labelAr: MAP_LAYER_LABELS.waypoints },
];

function getSosLabel(type: SosMapAlert["emergencyType"]): string {
  return (
    SOS_EMERGENCY_OPTIONS.find((option) => option.value === type)?.labelAr ??
    type
  );
}

type PopupFormState = {
  contributorName: string;
  contributorContact: string;
  quantity: string;
};

function buildCoordinatorWhatsAppMessage(need: MapNeed): string {
  return [
    "السلام عليكم،",
    `حاب نتكفّل بالاحتياج: ${need.title}`,
    `البلدية: ${need.location.address ?? need.location.name}`,
    `القرية: ${need.location.name}`,
    "نقدر نتواصل مع المنسق المحلي؟",
  ].join("\n");
}

function NeedPopupContent({
  need,
  onPledgeClick,
  onPledgeSuccess,
}: {
  need: MapNeed;
  onPledgeClick: (need: MapNeed) => void;
  onPledgeSuccess?: () => void;
}) {
  const [form, setForm] = useState<PopupFormState>({
    contributorName: "",
    contributorContact: "",
    quantity: "1",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const remaining = need.quantityNeeded - need.quantityFulfilled;

  const locationHeader = formatLocationHeader(
    need.location.address,
    need.location.name,
    need.location.daira,
  );

  const whatsappUrl = need.contactPhone
    ? buildWhatsAppUrl(
        need.contactPhone,
        buildCoordinatorWhatsAppMessage(need),
      )
    : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await createPledge({
      needId: need.id,
      contributorName: form.contributorName.trim(),
      contributorContact: form.contributorContact.trim() || undefined,
      quantity: Number(form.quantity),
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر إرسال التعهد.");
      return;
    }

    setIsSuccess(true);
    onPledgeSuccess?.();
  }

  if (isSuccess) {
    return (
      <div dir="rtl" className="min-w-[240px] space-y-2 p-1 text-right">
        <p className="text-sm font-medium text-emerald-700">
          شكراً! تسجّل تعاونك بنجاح.
        </p>
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-3 text-xs font-semibold text-white hover:bg-[#1ebe5d]"
          >
            <MessageCircle className="h-4 w-4" />
            تواصل واتساب مع المنسق
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-w-[250px] space-y-3 p-1 text-right">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{need.title}</h3>
        <p className="mt-1 text-xs text-slate-600">{locationHeader}</p>
      </div>

      <NeedProgressBar
        fulfilled={need.quantityFulfilled}
        needed={need.quantityNeeded}
      />

      {remaining > 0 ? (
        <form className="space-y-2" onSubmit={handleSubmit}>
          <input
            required
            type="text"
            placeholder="الاسم الكامل"
            value={form.contributorName}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contributorName: event.target.value,
              }))
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <input
            required
            type="tel"
            inputMode="tel"
            placeholder="رقم الهاتف"
            value={form.contributorContact}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                contributorContact: event.target.value,
              }))
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none focus:border-emerald-600"
          />
          <input
            required
            type="number"
            min={1}
            max={remaining}
            placeholder="الكمية المتبرع بها"
            value={form.quantity}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                quantity: event.target.value,
              }))
            }
            className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm outline-none focus:border-emerald-600"
          />

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-10 flex-1 items-center justify-center gap-1 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "نعاون في هاد الخير"
              )}
            </button>

            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-10 items-center justify-center rounded-md bg-[#25D366] px-3 text-white hover:bg-[#1ebe5d]"
                title="واتساب المنسق"
                aria-label="واتساب المنسق"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onPledgeClick(need)}
            className="w-full text-center text-[11px] text-zinc-500 underline-offset-2 hover:text-emerald-700 hover:underline"
          >
            فتح نموذج التعاون الكامل
          </button>
        </form>
      ) : (
        <p className="text-xs font-medium text-emerald-700">
          تم تلبية هذا الاحتياج بالكامل.
        </p>
      )}
    </div>
  );
}

export default function ReconstructionMap({
  needs,
  intelligence,
  selectedNeedId,
  onPledgeClick,
  onPledgeSuccess,
  onVillageClick,
}: ReconstructionMapProps) {
  const [activeCategories, setActiveCategories] = useState<Set<MapCategoryId>>(
    () => new Set(MAP_CATEGORIES.map((category) => category.id)),
  );
  const [layers, setLayers] = useState<Record<MapLayerKey, boolean>>({
    needs: true,
    sos: true,
    roads: true,
    facilities: true,
    villages: true,
    waypoints: true,
  });

  const markerIcons = useMemo(
    () => ({
      red: createMarkerIcon("red"),
      orange: createMarkerIcon("orange"),
      green: createMarkerIcon("green"),
      sos: createSosMarkerIcon(),
    }),
    [],
  );

  const villageIcons = useMemo(
    () => ({
      commune: createVillageMarkerIcon(false),
      daira: createVillageMarkerIcon(true),
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

  function toggleLayer(layer: MapLayerKey) {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  return (
    <div dir="rtl" className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col items-center gap-2 p-4">
        <div
          className={cn(
            glassPanelClass,
            "pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 p-2",
          )}
        >
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
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "bg-slate-100/90 text-slate-600 hover:bg-slate-200",
                )}
              >
                {category.labelAr}
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            glassPanelClass,
            "pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 p-2",
          )}
        >
          {LAYER_TOGGLES.map((layer) => {
            const isActive = layers[layer.key];

            return (
              <button
                key={layer.key}
                type="button"
                onClick={() => toggleLayer(layer.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "bg-slate-800 text-white shadow-sm"
                    : "bg-slate-100/90 text-slate-600 hover:bg-slate-200",
                )}
              >
                {layer.labelAr}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          glassPanelClass,
          "pointer-events-none absolute bottom-4 right-4 z-[1000] p-3 text-xs",
        )}
      >
        <p className="mb-2 font-semibold text-slate-800">دليل الألوان</p>
        <ul className="space-y-1 text-slate-600">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-600" />
            {MAP_LEGEND_LABELS.red}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-orange-600" />
            {MAP_LEGEND_LABELS.orange}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-green-600" />
            {MAP_LEGEND_LABELS.green}
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

        {layers.villages
          ? intelligence.villagePins.map((pin) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={
                  pin.type === "daira" ? villageIcons.daira : villageIcons.commune
                }
                eventHandlers={{
                  click: () => onVillageClick(pin.id),
                }}
              >
                <Popup>
                  <div dir="rtl" className="text-right text-sm">
                    <p className="font-semibold">{pin.name_ar}</p>
                    <p className="text-xs text-zinc-500">{pin.name}</p>
                    <button
                      type="button"
                      onClick={() => onVillageClick(pin.id)}
                      className="mt-2 w-full rounded-md bg-blue-700 px-2 py-1.5 text-xs text-white"
                    >
                      فتح ملف القرية
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {layers.roads
          ? intelligence.roads.map((road) => (
              <Marker
                key={road.id}
                position={[road.lat, road.lng]}
                icon={createRoadMarkerIcon(road.passability)}
              >
                <Popup>
                  <div dir="rtl" className="text-right text-sm">
                    <p className="font-semibold">{road.name_ar}</p>
                    <p className="text-xs text-zinc-500">{road.notes}</p>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {layers.facilities
          ? intelligence.facilities.map((facility) => (
              <Marker
                key={facility.id}
                position={[facility.lat, facility.lng]}
                icon={createFacilityMarkerIcon(facility.type)}
              >
                <Popup>
                  <div dir="rtl" className="text-right text-sm">
                    <p className="font-semibold">{facility.name_ar}</p>
                    <a
                      href={`tel:${facility.phone}`}
                      className="mt-1 inline-block text-xs font-bold text-red-700"
                    >
                      📞 {facility.phone}
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        {layers.sos
          ? intelligence.sosAlerts.map((alert) => (
              <Marker
                key={`sos-${alert.id}`}
                position={[alert.lat, alert.lng]}
                icon={markerIcons.sos}
                zIndexOffset={1000}
              >
                <Popup>
                  <div dir="rtl" className="min-w-[200px] text-right text-sm">
                    <p className="font-bold text-red-700">
                      🚨 {getSosLabel(alert.emergencyType)}
                    </p>
                    <p className="mt-1">{alert.description}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {alert.commune} — {alert.daira}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))
          : null}

        <WaypointsLayer
          waypoints={intelligence.waypoints}
          visible={layers.waypoints}
        />

        {layers.needs
          ? visibleNeeds.map((need) => {
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
                    <NeedPopupContent
                      need={need}
                      onPledgeClick={onPledgeClick}
                      onPledgeSuccess={onPledgeSuccess}
                    />
                  </Popup>
                </Marker>
              );
            })
          : null}
      </MapContainer>

      {layers.needs && visibleNeeds.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 z-[1000] flex justify-center px-4">
          <div
            className={cn(
              glassPanelClass,
              "flex items-center gap-2 px-4 py-2 text-sm text-slate-600",
            )}
          >
            <MapPin className="h-4 w-4" />
            ما كاينش احتياجات مطابقة للفلاتر المختارة.
          </div>
        </div>
      ) : null}
    </div>
  );
}
