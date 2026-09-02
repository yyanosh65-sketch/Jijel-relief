"use client";

import { useMemo, useState } from "react";
import L from "leaflet";
import { Loader2, MapPin } from "lucide-react";
import {
  Marker,
} from "react-leaflet";

import { createPledge } from "@/actions/pledges";
import type { MapIntelligenceData, SosMapAlert } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import LeafletMap from "@/components/map/LeafletMap";
import MapClickReportModal from "@/components/map/MapClickReportModal";
import MapPopup from "@/components/map/MapPopup";
import MapPopupShell from "@/components/map/MapPopupShell";
import MarkServedControls from "@/components/needs/MarkServedControls";
import { translateNeedTitle } from "@/lib/need-display";
import { findVillageByName } from "@/lib/locations";
import { clampJijelLandCoordinates, clampJijelLandPosition } from "@/lib/geo";
import {
  createFacilityMarkerIcon,
  createRoadMarkerIcon,
  createSosMarkerIcon,
  createVillageMarkerIcon,
} from "@/lib/map-layer-icons";
import {
  MAP_POINT_TYPE_LABELS,
  resolveCommuneMapDetails,
  resolveLocationMapDetails,
  roadPassabilityToAccessibility,
  getRoadPassabilityLabel,
} from "@/lib/map-location-display";
import {
  getMarkerColor,
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

  const villageRecord = findVillageByName(need.location.name);
  const communeKey = villageRecord
    ? villageRecord.commune
    : (need.location.address ?? need.location.name);
  const mapDetails = resolveLocationMapDetails(
    communeKey,
    villageRecord?.daira ?? need.location.daira ?? "",
    villageRecord?.name_ar,
  );
  const { lat, lng } = clampJijelLandCoordinates(need.lat, need.lng);

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
      <MapPopupShell
        pointTypeLabel={MAP_POINT_TYPE_LABELS.need}
        title={translateNeedTitle(need.title)}
        dairaAr={mapDetails.dairaAr}
        communeAr={mapDetails.communeAr}
        villageAr={villageRecord?.name_ar}
        roadAccessibility={mapDetails.roadAccessibility}
        lat={lat}
        lng={lng}
        phone={need.contactPhone}
        whatsappUrl={whatsappUrl}
      >
        <p className="text-sm font-medium text-emerald-700">
          شكراً! تسجّل تعاونك بنجاح.
        </p>
      </MapPopupShell>
    );
  }

  return (
    <MapPopupShell
      pointTypeLabel={MAP_POINT_TYPE_LABELS.need}
      title={translateNeedTitle(need.title)}
      dairaAr={mapDetails.dairaAr}
      communeAr={mapDetails.communeAr}
      villageAr={villageRecord?.name_ar}
      roadAccessibility={mapDetails.roadAccessibility}
      lat={lat}
      lng={lng}
      phone={need.contactPhone}
      whatsappUrl={whatsappUrl}
    >
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
            className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
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
            className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
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
            className="w-full rounded-md border border-zinc-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
          />

          {error ? <p className="text-xs text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex min-h-10 w-full items-center justify-center gap-1 rounded-md bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "نعاون في هاد الخير"
            )}
          </button>

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

      <MarkServedControls
        needId={need.id}
        quantityNeeded={need.quantityNeeded}
        quantityFulfilled={need.quantityFulfilled}
        onSuccess={onPledgeSuccess}
        compact
      />
    </MapPopupShell>
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
  const [pinDropMode, setPinDropMode] = useState(false);
  const [clickPin, setClickPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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
    () =>
      needs.filter(
        (need) =>
          need.status !== "closed" &&
          matchesMapCategories(need, activeCategories),
      ),
    [needs, activeCategories],
  );

  const tempPinIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<span style="display:block;width:22px;height:22px;border-radius:9999px;background:#059669;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.4)"></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    [],
  );

  function handleMapPinClick(lat: number, lng: number) {
    const clamped = clampJijelLandCoordinates(lat, lng);
    setClickPin({ lat: clamped.lat, lng: clamped.lng });
    setIsReportModalOpen(true);
    setPinDropMode(false);
  }

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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] p-3 sm:p-4">
        <div
          className={cn(
            glassPanelClass,
            "relative pointer-events-auto mx-auto max-w-5xl overflow-hidden p-2 sm:p-3",
          )}
        >
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-slate-200/70 pb-2">
              <span className="w-full shrink-0 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:w-auto sm:text-xs">
                نوع الاحتياج
              </span>
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

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <span className="w-full shrink-0 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:w-auto sm:text-xs">
                طبقات الخريطة
              </span>
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
        </div>
      </div>

      <div
        className={cn(
          glassPanelClass,
          "pointer-events-none absolute bottom-6 left-4 z-[500] hidden max-w-[200px] p-3 text-xs sm:block",
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

      <div className="pointer-events-none absolute bottom-24 right-4 z-[500] sm:bottom-8">
        <button
          type="button"
          onClick={() => setPinDropMode((current) => !current)}
          className={cn(
            "pointer-events-auto max-w-[220px] rounded-2xl border px-3 py-2.5 text-right text-xs font-bold shadow-lg transition",
            pinDropMode
              ? "border-emerald-600 bg-emerald-700 text-white"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
          )}
        >
          📍 انقر على الخريطة لتسجيل ضرر في هذا الموقع
        </button>
      </div>

      <LeafletMap
        pinDropMode={pinDropMode}
        onMapClick={handleMapPinClick}
      >
        {layers.villages
          ? intelligence.villagePins.map((pin) => {
              const isDouarPin = pin.id.startsWith("village-");
              const mapDetails = resolveLocationMapDetails(
                pin.name,
                pin.daira,
                isDouarPin ? pin.name_ar : undefined,
              );
              const [pinLat, pinLng] = clampJijelLandPosition(pin.lat, pin.lng);

              return (
              <Marker
                key={pin.id}
                position={[pinLat, pinLng]}
                icon={
                  pin.type === "daira" ? villageIcons.daira : villageIcons.commune
                }
                eventHandlers={{
                  click: () => onVillageClick(pin.id),
                }}
              >
                <MapPopup>
                  <MapPopupShell
                    pointTypeLabel={
                      pin.type === "daira"
                        ? MAP_POINT_TYPE_LABELS.daira
                        : MAP_POINT_TYPE_LABELS.village
                    }
                    title={pin.name_ar}
                    dairaAr={mapDetails.dairaAr}
                    communeAr={mapDetails.communeAr}
                    villageAr={isDouarPin ? pin.name_ar : undefined}
                    roadAccessibility={
                      roadPassabilityToAccessibility(pin.roadPassability)
                    }
                    lat={pinLat}
                    lng={pinLng}
                    phone={pin.coordinator.phone}
                    whatsappUrl={buildWhatsAppUrl(
                      pin.coordinator.phone,
                      `السلام عليكم، نحتاج معلومات عن ${pin.name_ar}`,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onVillageClick(pin.id)}
                      className="w-full rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white hover:bg-blue-800"
                    >
                      فتح ملف القرية
                    </button>
                  </MapPopupShell>
                </MapPopup>
              </Marker>
            );
            })
          : null}

        {layers.roads
          ? intelligence.roads.map((road) => {
              const [roadLat, roadLng] = clampJijelLandPosition(road.lat, road.lng);

              return (
              <Marker
                key={road.id}
                position={[roadLat, roadLng]}
                icon={createRoadMarkerIcon(road.passability)}
              >
                <MapPopup>
                  <MapPopupShell
                    pointTypeLabel={MAP_POINT_TYPE_LABELS.road}
                    title={road.name_ar}
                    addressHierarchy={`ولاية جيجل > ${road.name_ar}`}
                    exactAddressAr={road.notes}
                    roadAccessibility={roadPassabilityToAccessibility(
                      road.passability,
                    )}
                    roadLabel={getRoadPassabilityLabel(road.passability)}
                    lat={roadLat}
                    lng={roadLng}
                  />
                </MapPopup>
              </Marker>
            );
            })
          : null}

        {layers.facilities
          ? intelligence.facilities.map((facility) => {
              const [facilityLat, facilityLng] = clampJijelLandPosition(
                facility.lat,
                facility.lng,
              );
              const facilityDetails = resolveCommuneMapDetails(
                facility.commune,
                facility.daira,
              );

              return (
              <Marker
                key={facility.id}
                position={[facilityLat, facilityLng]}
                icon={createFacilityMarkerIcon(facility.type)}
              >
                <MapPopup>
                  <MapPopupShell
                    pointTypeLabel={MAP_POINT_TYPE_LABELS.facility}
                    title={facility.name_ar}
                    dairaAr={facilityDetails.dairaAr}
                    communeAr={facilityDetails.communeAr}
                    roadAccessibility={facilityDetails.roadAccessibility}
                    lat={facilityLat}
                    lng={facilityLng}
                    phone={facility.phone}
                    whatsappUrl={buildWhatsAppUrl(
                      facility.phone,
                      `السلام عليكم، نحتاج مساعدة من ${facility.name_ar}`,
                    )}
                  />
                </MapPopup>
              </Marker>
            );
            })
          : null}

        {layers.sos
          ? intelligence.sosAlerts.map((alert) => {
              const [alertLat, alertLng] = clampJijelLandPosition(alert.lat, alert.lng);
              const alertDetails = resolveLocationMapDetails(
                alert.commune,
                alert.daira,
                alert.village ?? undefined,
              );

              return (
              <Marker
                key={`sos-${alert.id}`}
                position={[alertLat, alertLng]}
                icon={markerIcons.sos}
                zIndexOffset={1000}
              >
                <MapPopup>
                  <MapPopupShell
                    pointTypeLabel={MAP_POINT_TYPE_LABELS.sos}
                    title={`🚨 ${getSosLabel(alert.emergencyType)}`}
                    dairaAr={alertDetails.dairaAr}
                    communeAr={alertDetails.communeAr}
                    villageAr={alert.village ?? undefined}
                    exactAddressAr={alert.description}
                    roadAccessibility={alertDetails.roadAccessibility}
                    lat={alertLat}
                    lng={alertLng}
                  />
                </MapPopup>
              </Marker>
            );
            })
          : null}

        <WaypointsLayer
          waypoints={intelligence.waypoints}
          visible={layers.waypoints}
        />

        {clickPin ? (
          <Marker position={[clickPin.lat, clickPin.lng]} icon={tempPinIcon} />
        ) : null}

        {layers.needs
          ? visibleNeeds.map((need) => {
              const color = getMarkerColor(need);
              const isSelected = selectedNeedId === need.id;
              const [needLat, needLng] = clampJijelLandPosition(need.lat, need.lng);

              return (
                <Marker
                  key={need.id}
                  position={[needLat, needLng]}
                  icon={markerIcons[color]}
                  opacity={isSelected ? 1 : 0.92}
                >
                  <MapPopup>
                    <NeedPopupContent
                      need={need}
                      onPledgeClick={onPledgeClick}
                      onPledgeSuccess={onPledgeSuccess}
                    />
                  </MapPopup>
                </Marker>
              );
            })
          : null}
      </LeafletMap>

      <MapClickReportModal
        open={isReportModalOpen}
        lat={clickPin?.lat ?? 0}
        lng={clickPin?.lng ?? 0}
        onClose={() => setIsReportModalOpen(false)}
        onSuccess={onPledgeSuccess}
      />

      {layers.needs && visibleNeeds.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-28 z-[500] flex justify-center px-4 sm:bottom-8">
          <div
            className={cn(
              glassPanelClass,
              "flex max-w-md items-center gap-2 px-4 py-2.5 text-sm text-slate-600",
            )}
          >
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {needs.length === 0
                ? "ما كاينش احتياجات مطابقة للفلاتر المختارة."
                : "ما كاينش احتياجات في هاد التصنيف — جرّب توسيع الفلاتر."}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
