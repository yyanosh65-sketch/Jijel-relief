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
import { cn } from "@/lib/utils";

type MapPopupShellProps = {
  pointTypeLabel: string;
  title: string;
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
  showFieldReportButton?: boolean;
  onFieldReportClick?: () => void;
  className?: string;
  children?: React.ReactNode;
};

export default function MapPopupShell({
  pointTypeLabel,
  title,
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
    <div dir="rtl" className={cn("map-popup-content text-right text-slate-900", className)}>
      <div className="sticky top-0 z-10 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 p-3 text-base font-bold text-slate-900">
          {title}
        </div>
        {hierarchyTag ? (
          <p className="border-b border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-950">
            {hierarchyTag}
          </p>
        ) : null}
      </div>

      <div className="space-y-3 p-3">
        <p className="text-xs font-bold text-emerald-800">🏷️ {pointTypeLabel}</p>

        <div className="space-y-1.5 text-xs leading-relaxed">
          {showExactAddress ? (
            <p className="font-bold text-slate-700">{exactAddressAr}</p>
          ) : null}
          {resolvedRoadLabel ? (
            <p className="font-bold text-slate-700">
              <span className="text-slate-900">🛣️ حالة المسلك:</span>{" "}
              {resolvedRoadLabel}
            </p>
          ) : null}
          <p className="font-mono text-xs font-bold text-slate-700" dir="ltr">
            {lat}, {lng}
          </p>
        </div>

        {children}

        <div className="space-y-2 pt-1">
          {showFieldReportButton && onFieldReportClick ? (
            <button
              type="button"
              onClick={onFieldReportClick}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
            >
              📝 إضافة تقرير ميداني / صور توثيقية
            </button>
          ) : null}

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
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
    </div>
  );
}
