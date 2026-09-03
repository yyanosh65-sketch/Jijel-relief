"use client";

import { useEffect, useMemo, useState } from "react";
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
import ReportModal from "@/components/intake/ReportModal";
import RoadTracker from "@/components/logistics/RoadTracker";
import { translateNeedTitle } from "@/lib/need-display";
import { findVillageByName } from "@/lib/locations";
import type { VillageFieldReportTarget } from "@/lib/field-reports";
import { clampJijelLandCoordinates, clampJijelLandPosition } from "@/lib/geo";
import {
  createFacilityMarkerIcon,
  createNeedMarkerIcon,
  createRoadMarkerIcon,
  createSosMarkerIcon,
  createVillageMarkerIcon,
  resolveNeedMarkerVariant,
} from "@/lib/map-layer-icons";
import {
  MAP_POINT_TYPE_LABELS,
  resolveCommuneMapDetails,
  resolveLocationMapDetails,
  roadPassabilityToAccessibility,
  getRoadPassabilityLabel,
  ROAD_ACCESSIBILITY_LABELS,
} from "@/lib/map-location-display";
import { SOS_EMERGENCY_OPTIONS } from "@/lib/intelligence";
import { getMarkerColor } from "@/lib/map-utils";
import {
  MAP_LAYER_LABELS,
  MAP_LEGEND_LABELS,
  NeedProgressBar,
} from "@/lib/ui-labels";
import { Z_MAP_CTA, Z_MAP_FLOATING, Z_MAP_LEGEND } from "@/lib/z-index";
import { buildWhatsAppDispatchUrl, buildWhatsAppUrl } from "@/lib/phone";
import {
  buildMapPinWhatsAppDispatchMessage,
  buildNeedWhatsAppDispatchMessage,
} from "@/lib/incident-share";
import WaypointsLayer from "@/components/map/WaypointsLayer";
import { cn } from "@/lib/utils";

import "leaflet/dist/leaflet.css";


type ReconstructionMapProps = {
  needs: MapNeed[];
  intelligence: MapIntelligenceData;
  selectedNeedId?: number | null;
  onPledgeClick: (need: MapNeed) => void;
  onPledgeSuccess?: () => void;
  onVillageClick: (dossierId: string) => void;
  onOpenFieldReport?: (target: VillageFieldReportTarget) => void;
  forceRoadTrackerCollapsed?: boolean;
  onModalOpenChange?: (open: boolean) => void;
  immersiveChrome?: boolean;
  communityReportSignal?: number;
  pinDropActive?: boolean;
  onPinDropActiveChange?: (active: boolean) => void;
  layersPanelOpen?: boolean;
  onLayersPanelOpenChange?: (open: boolean) => void;
  onNeedInspect?: (need: MapNeed) => void;
  onPointInspect?: (point: import("@/components/map/PointInspectionPanel").PointInspectionData) => void;
  layoutEpoch?: unknown;
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
  onOpenFieldReport,
}: {
  need: MapNeed;
  onPledgeClick: (need: MapNeed) => void;
  onPledgeSuccess?: () => void;
  onOpenFieldReport?: (target: VillageFieldReportTarget) => void;
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
  const shareWhatsAppUrl = buildWhatsAppDispatchUrl(
    buildNeedWhatsAppDispatchMessage(need),
  );
  const facebookUrl = need.facebookUrl ?? null;

  const fieldReportTarget: VillageFieldReportTarget = {
    villageAr: villageRecord?.name_ar ?? need.location.name,
    commune: villageRecord?.commune ?? communeKey,
    communeAr: mapDetails.communeAr,
    daira: villageRecord?.daira ?? need.location.daira ?? "",
    dairaAr: mapDetails.dairaAr,
    lat,
    lng,
    roadAccessibilityLabel:
      mapDetails.roadLabel ??
      (mapDetails.roadAccessibility
        ? ROAD_ACCESSIBILITY_LABELS[mapDetails.roadAccessibility]
        : undefined),
  };

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
        badgeTone={need.urgency === "critical" ? "rose" : "amber"}
        title={translateNeedTitle(need.title)}
        dairaAr={mapDetails.dairaAr}
        communeAr={mapDetails.communeAr}
        villageAr={villageRecord?.name_ar}
        roadAccessibility={mapDetails.roadAccessibility}
        lat={lat}
        lng={lng}
        phone={need.contactPhone}
        whatsappUrl={whatsappUrl}
        shareWhatsAppUrl={shareWhatsAppUrl}
        facebookUrl={facebookUrl}
        showFieldReportButton={Boolean(onOpenFieldReport)}
        onFieldReportClick={() => onOpenFieldReport?.(fieldReportTarget)}
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
      badgeTone={need.urgency === "critical" ? "rose" : "amber"}
      title={translateNeedTitle(need.title)}
      dairaAr={mapDetails.dairaAr}
      communeAr={mapDetails.communeAr}
      villageAr={villageRecord?.name_ar}
      roadAccessibility={mapDetails.roadAccessibility}
      lat={lat}
      lng={lng}
      phone={need.contactPhone}
      whatsappUrl={whatsappUrl}
      shareWhatsAppUrl={shareWhatsAppUrl}
      facebookUrl={facebookUrl}
      showFieldReportButton={Boolean(onOpenFieldReport)}
      onFieldReportClick={() => onOpenFieldReport?.(fieldReportTarget)}
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
  onOpenFieldReport,
  forceRoadTrackerCollapsed = false,
  onModalOpenChange,
  immersiveChrome = false,
  communityReportSignal = 0,
  pinDropActive,
  onPinDropActiveChange,
  layersPanelOpen,
  onNeedInspect,
  onPointInspect,
  layoutEpoch,
}: ReconstructionMapProps) {
  const [layers, setLayers] = useState<Record<MapLayerKey, boolean>>({
    needs: true,
    sos: true,
    roads: true,
    facilities: true,
    villages: true,
    waypoints: true,
  });
  const [internalPinDropMode, setInternalPinDropMode] = useState(false);
  const [clickPin, setClickPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCommunityReportOpen, setIsCommunityReportOpen] = useState(false);

  const pinDropMode = pinDropActive ?? internalPinDropMode;
  const setPinDropMode = (value: boolean | ((current: boolean) => boolean)) => {
    const next =
      typeof value === "function" ? value(pinDropMode) : value;
    if (onPinDropActiveChange) {
      onPinDropActiveChange(next);
    } else {
      setInternalPinDropMode(next);
    }
  };

  const showLayersPanel = immersiveChrome
    ? Boolean(layersPanelOpen)
    : true;

  const mapModalOpen =
    isReportModalOpen || isCommunityReportOpen;

  useEffect(() => {
    onModalOpenChange?.(mapModalOpen);
  }, [mapModalOpen, onModalOpenChange]);

  useEffect(() => {
    if (communityReportSignal > 0) {
      setIsCommunityReportOpen(true);
    }
  }, [communityReportSignal]);

  // Keep controlled pin-drop in sync when parent clears it after modal close
  useEffect(() => {
    if (pinDropActive === false) {
      setInternalPinDropMode(false);
    }
  }, [pinDropActive]);

  const sosMarkerIcon = useMemo(() => createSosMarkerIcon(), []);

  const villageIcons = useMemo(
    () => ({
      commune: createVillageMarkerIcon(false),
      daira: createVillageMarkerIcon(true),
    }),
    [],
  );

  const visibleNeeds = useMemo(
    () => needs.filter((need) => need.status !== "closed"),
    [needs],
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

  function toggleLayer(layer: MapLayerKey) {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }));
  }

  const collapseRoadTracker = forceRoadTrackerCollapsed || mapModalOpen;

  return (
    <div dir="rtl" className="relative z-10 h-full w-full">
      <div
        className={cn(
          "pointer-events-none absolute z-[25] hidden max-w-[200px] rounded-2xl border border-slate-800/80 bg-slate-900/90 p-3 text-xs shadow-xl backdrop-blur-md sm:block",
          immersiveChrome ? "bottom-28 left-6" : "bottom-6 left-6",
          Z_MAP_LEGEND,
        )}
      >
        <p className="mb-2 font-semibold text-slate-100">دليل الألوان</p>
        <ul className="space-y-1 text-slate-300">
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            {MAP_LEGEND_LABELS.red}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            {MAP_LEGEND_LABELS.orange}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            {MAP_LEGEND_LABELS.green}
          </li>
        </ul>
      </div>

      {(!immersiveChrome || showLayersPanel) && (
        <div
          className={cn(
            "pointer-events-none absolute",
            immersiveChrome
              ? "bottom-24 left-1/2 w-[min(92vw,28rem)] -translate-x-1/2 sm:left-auto sm:right-4 sm:w-auto sm:translate-x-0"
              : "top-4 right-4 hidden sm:block",
            Z_MAP_FLOATING,
          )}
        >
          <div className="pointer-events-auto flex max-w-xs flex-wrap gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 md:max-w-md">
            {LAYER_TOGGLES.map((layer) => {
              const isActive = layers[layer.key];

              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => toggleLayer(layer.key)}
                  className={cn(
                    "rounded-full px-2 py-1 text-[10px] font-semibold transition",
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                  )}
                >
                  {layer.labelAr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <RoadTracker
        forceCollapsed={collapseRoadTracker}
        className={cn(
          "pointer-events-auto absolute z-30 hidden sm:block",
          immersiveChrome
            ? "bottom-28 right-6 mb-2 max-w-[min(20rem,calc(100vw-3rem))]"
            : "bottom-6 right-4",
          Z_MAP_FLOATING,
        )}
      />

      {!immersiveChrome ? (
        <>
          <div
            className={cn(
              "pointer-events-none absolute bottom-6 left-1/2 z-[35] -translate-x-1/2",
              Z_MAP_CTA,
            )}
          >
            <button
              type="button"
              onClick={() => setIsCommunityReportOpen(true)}
              className="pointer-events-auto rounded-2xl border border-emerald-500/40 bg-emerald-600 px-4 py-2.5 text-right text-xs font-extrabold text-white shadow-2xl shadow-emerald-900/30 transition-transform hover:-translate-y-0.5 hover:bg-emerald-500"
            >
              + تسجيل نداء أو استغاثة
            </button>
          </div>

          <div
            className={cn(
              "pointer-events-none absolute bottom-[5.5rem] left-1/2 z-30 -translate-x-1/2",
            )}
          >
            <button
              type="button"
              onClick={() => setPinDropMode((current) => !current)}
              className={cn(
                "pointer-events-auto max-w-[min(90vw,320px)] rounded-2xl border px-3 py-2.5 text-center text-xs font-bold shadow-lg transition",
                pinDropMode
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-700 bg-slate-900/90 text-slate-100 hover:bg-slate-800",
              )}
            >
              📍 انقر على الخريطة لتسجيل ضرر في هذا الموقع
            </button>
          </div>
        </>
      ) : pinDropMode ? (
        <div
          className={cn(
            "pointer-events-none absolute bottom-24 left-1/2 z-30 -translate-x-1/2",
          )}
        >
          <p className="pointer-events-auto max-w-[min(90vw,320px)] rounded-2xl border border-emerald-500/50 bg-emerald-950/90 px-3 py-2 text-center text-xs font-bold text-emerald-100 shadow-lg backdrop-blur-md">
            انقر على الخريطة لتسجيل ضرر في هذا الموقع
          </p>
        </div>
      ) : null}

      <LeafletMap
        pinDropMode={pinDropMode}
        onMapClick={handleMapPinClick}
        layoutEpoch={layoutEpoch}
        className="relative z-10 h-full w-full touch-pan-x touch-pan-y"
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
              const fieldReportTarget: VillageFieldReportTarget = {
                villageAr: pin.name_ar,
                commune: pin.name,
                communeAr: mapDetails.communeAr,
                daira: pin.daira,
                dairaAr: mapDetails.dairaAr,
                lat: pinLat,
                lng: pinLng,
                population: pin.population || undefined,
                totalFamilies: pin.totalFamilies || undefined,
                affectedFamilies: pin.affectedFamilies || undefined,
                roadAccessibilityLabel: getRoadPassabilityLabel(pin.roadPassability),
              };

              return (
              <Marker
                key={pin.id}
                position={[pinLat, pinLng]}
                icon={
                  pin.type === "daira" ? villageIcons.daira : villageIcons.commune
                }
                eventHandlers={{
                  click: () => {
                    onVillageClick(pin.id);
                    if (immersiveChrome && onPointInspect) {
                      // Dossier drawer is primary; skip Leaflet popup path
                      return;
                    }
                  },
                }}
              >
                {immersiveChrome ? null : (
                <MapPopup>
                  <MapPopupShell
                    badgeTone="slate"
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
                    shareWhatsAppUrl={buildWhatsAppDispatchUrl(
                      buildMapPinWhatsAppDispatchMessage({
                        title: pin.name_ar,
                        communeAr: mapDetails.communeAr,
                        villageAr: isDouarPin ? pin.name_ar : undefined,
                        details: `${pin.name_ar} — ${getRoadPassabilityLabel(pin.roadPassability)}`,
                        phone: pin.coordinator.phone,
                        lat: pinLat,
                        lng: pinLng,
                      }),
                    )}
                    showFieldReportButton={Boolean(onOpenFieldReport)}
                    onFieldReportClick={() =>
                      onOpenFieldReport?.(fieldReportTarget)
                    }
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
                )}
              </Marker>
            );
            })
          : null}

        {layers.roads
          ? intelligence.roads.map((road) => {
              const [roadLat, roadLng] = clampJijelLandPosition(road.lat, road.lng);
              const roadPoint = {
                badgeTone: "amber" as const,
                pointTypeLabel: MAP_POINT_TYPE_LABELS.road,
                title: road.name_ar,
                addressHierarchy: `ولاية جيجل > ${road.name_ar}`,
                exactAddressAr: road.notes,
                roadAccessibility: roadPassabilityToAccessibility(
                  road.passability,
                ),
                roadLabel: getRoadPassabilityLabel(road.passability),
                lat: roadLat,
                lng: roadLng,
                shareWhatsAppUrl: buildWhatsAppDispatchUrl(
                  buildMapPinWhatsAppDispatchMessage({
                    title: road.name_ar,
                    communeAr: "جيجل",
                    details: `${road.name_ar} — ${road.notes}`,
                    lat: roadLat,
                    lng: roadLng,
                  }),
                ),
              };

              return (
              <Marker
                key={road.id}
                position={[roadLat, roadLng]}
                icon={createRoadMarkerIcon(road.passability)}
                eventHandlers={
                  immersiveChrome && onPointInspect
                    ? { click: () => onPointInspect(roadPoint) }
                    : undefined
                }
              >
                {immersiveChrome && onPointInspect ? null : (
                <MapPopup>
                  <MapPopupShell
                    badgeTone="amber"
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
                    shareWhatsAppUrl={roadPoint.shareWhatsAppUrl}
                  />
                </MapPopup>
                )}
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
                    badgeTone="emerald"
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
              const sosFieldTarget: VillageFieldReportTarget = {
                villageAr: alert.village ?? alert.commune,
                commune: alert.commune,
                communeAr: alertDetails.communeAr,
                daira: alert.daira,
                dairaAr: alertDetails.dairaAr,
                lat: alertLat,
                lng: alertLng,
                roadAccessibilityLabel: alertDetails.roadLabel,
              };

              return (
              <Marker
                key={`sos-${alert.id}`}
                position={[alertLat, alertLng]}
                icon={sosMarkerIcon}
                zIndexOffset={1000}
              >
                <MapPopup>
                  <MapPopupShell
                    badgeTone="rose"
                    pointTypeLabel={MAP_POINT_TYPE_LABELS.sos}
                    title={`🚨 ${getSosLabel(alert.emergencyType)}`}
                    dairaAr={alertDetails.dairaAr}
                    communeAr={alertDetails.communeAr}
                    villageAr={alert.village ?? undefined}
                    exactAddressAr={alert.description}
                    roadAccessibility={alertDetails.roadAccessibility}
                    lat={alertLat}
                    lng={alertLng}
                    phone={alert.reporterPhone}
                    facebookUrl={alert.facebookUrl}
                    shareWhatsAppUrl={buildWhatsAppDispatchUrl(
                      buildMapPinWhatsAppDispatchMessage({
                        title: getSosLabel(alert.emergencyType),
                        communeAr: alertDetails.communeAr,
                        villageAr: alert.village ?? undefined,
                        details: alert.description,
                        phone: alert.reporterPhone,
                        lat: alertLat,
                        lng: alertLng,
                      }),
                    )}
                    showFieldReportButton={Boolean(onOpenFieldReport)}
                    onFieldReportClick={() =>
                      onOpenFieldReport?.(sosFieldTarget)
                    }
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
              const markerVariant = resolveNeedMarkerVariant({
                category: need.category,
                urgency: need.urgency,
                title: need.title,
              });
              const needIcon =
                color === "green"
                  ? createNeedMarkerIcon("hub")
                  : createNeedMarkerIcon(markerVariant);

              return (
                <Marker
                  key={need.id}
                  position={[needLat, needLng]}
                  icon={needIcon}
                  opacity={isSelected ? 1 : 0.92}
                  eventHandlers={
                    immersiveChrome && onNeedInspect
                      ? {
                          click: () => onNeedInspect(need),
                        }
                      : undefined
                  }
                >
                  {immersiveChrome && onNeedInspect ? null : (
                    <MapPopup>
                      <NeedPopupContent
                        need={need}
                        onPledgeClick={onPledgeClick}
                        onPledgeSuccess={onPledgeSuccess}
                        onOpenFieldReport={onOpenFieldReport}
                      />
                    </MapPopup>
                  )}
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

      <ReportModal
        open={isCommunityReportOpen}
        onClose={() => setIsCommunityReportOpen(false)}
        onSuccess={onPledgeSuccess}
        initialLat={clickPin?.lat}
        initialLng={clickPin?.lng}
      />

      {layers.needs && visibleNeeds.length === 0 ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 flex justify-center px-4",
            immersiveChrome ? "bottom-28" : "bottom-28 sm:bottom-8",
            Z_MAP_LEGEND,
          )}
        >
          <div className="flex max-w-md items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-900/90 px-4 py-2.5 text-sm text-slate-300 shadow-xl backdrop-blur-md">
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
