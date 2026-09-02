"use client";

import { Navigation } from "lucide-react";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import {
  buildGoogleMapsDirectionsUrl,
  formatPopupHierarchyTag,
  isRedundantExactAddress,
  type RoadAccessibility,
  ROAD_ACCESSIBILITY_LABELS,
} from "@/lib/map-location-display";
import {
  mapActionPrimaryClass,
  mapActionSecondaryClass,
  statusBadgeClass,
  type StatusBadgeTone,
} from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type MapPopupShellProps = {
  pointTypeLabel: string;
  title: string;
  badgeTone?: StatusBadgeTone;
  addressHierarchy?: string;
  dairaAr?: string;
  communeAr?: string;
  villageAr?: string;
  exactAddressAr?: string;
  roadAccessibility?: RoadAccessibility | string;
  roadLabel?: string;
  lat: number;
  lng: number;
  phone?: string | null;
  whatsappUrl?: string | null;
  facebookUrl?: string | null;
  showFieldReportButton?: boolean;
  onFieldReportClick?: () => void;
  className?: string;
  children?: React.ReactNode;
};

export default function MapPopupShell({
  pointTypeLabel,
  title,
  badgeTone = "slate",
  addressHierarchy,
  dairaAr,
  communeAr,
  villageAr,
  exactAddressAr,
  roadAccessibility,
  roadLabel,
  lat,
  lng,
  phone,
  whatsappUrl,
  facebookUrl,
  showFieldReportButton = false,
  onFieldReportClick,
  className,
  children,
}: MapPopupShellProps) {
  const resolvedRoadLabel =
    roadLabel ??
    (roadAccessibility && roadAccessibility in ROAD_ACCESSIBILITY_LABELS
      ? ROAD_ACCESSIBILITY_LABELS[roadAccessibility as RoadAccessibility]
      : typeof roadAccessibility === "string"
        ? roadAccessibility
        : null);

  const hierarchyTag =
    dairaAr && communeAr
      ? formatPopupHierarchyTag({ dairaAr, communeAr, villageAr })
      : addressHierarchy;

  const mapsUrl = buildGoogleMapsDirectionsUrl(lat, lng);
  const showExactAddress =
    exactAddressAr &&
    hierarchyTag &&
    !isRedundantExactAddress(exactAddressAr, hierarchyTag);

  return (
    <div
      dir="rtl"
      className={cn(
        "map-popup-content w-[320px] overflow-hidden text-right font-sans text-slate-900",
        className,
      )}
    >
      <div className="border-b border-slate-100 bg-white">
        <div className="bg-slate-50/90 p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="flex-1 text-sm font-extrabold leading-snug tracking-tight text-slate-900">
              {title}
            </h3>
            <span className={statusBadgeClass[badgeTone]}>{pointTypeLabel}</span>
          </div>
          {hierarchyTag ? (
            <p className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold leading-relaxed text-emerald-950">
              {hierarchyTag}
            </p>
          ) : null}
        </div>
      </div>

      <div className="map-popup-scroll">
        <div className="space-y-3 p-3">
          <div className="space-y-1.5 text-xs leading-relaxed tracking-normal">
            {showExactAddress ? (
              <p className="font-bold text-slate-700">{exactAddressAr}</p>
            ) : null}
            {resolvedRoadLabel ? (
              <p className="font-bold text-slate-700">
                <span className="text-slate-900">🛣️ حالة المسلك:</span>{" "}
                {resolvedRoadLabel}
              </p>
            ) : null}
            <p className="font-mono text-[11px] font-bold text-slate-500" dir="ltr">
              {lat}, {lng}
            </p>
          </div>

          {children}
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 bg-white p-3 pb-3">
        {facebookUrl ? (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              mapActionPrimaryClass,
              "h-auto py-2 text-xs hover:bg-blue-700",
            )}
          >
            فتح المنشور على فيسبوك ↗
          </a>
        ) : null}

        {showFieldReportButton && onFieldReportClick ? (
          <button
            type="button"
            onClick={onFieldReportClick}
            className={mapActionSecondaryClass}
          >
            📝 إضافة تقرير ميداني / صور توثيقية
          </button>
        ) : null}

        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={mapActionPrimaryClass}
        >
          <Navigation className="h-4 w-4 shrink-0" aria-hidden />
          فتح في Google Maps للملاحة
        </a>

        {phone ? (
          <ContactActionButtons
            phone={phone}
            whatsappUrl={whatsappUrl}
            variant="map"
            className="w-full flex-col"
          />
        ) : null}
      </div>
    </div>
  );
}
