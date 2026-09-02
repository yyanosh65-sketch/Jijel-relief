"use client";

import { Navigation, Phone } from "lucide-react";

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
  shareWhatsAppUrl?: string | null;
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
  shareWhatsAppUrl,
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
        "map-popup-content w-[320px] overflow-hidden rounded-xl text-right font-sans text-slate-100",
        className,
      )}
    >
      <div className="border-b border-slate-800/80 bg-slate-900/95">
        <div className="p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="flex-1 text-sm font-extrabold leading-snug tracking-tight text-white">
              {title}
            </h3>
            <span className={statusBadgeClass[badgeTone]}>{pointTypeLabel}</span>
          </div>
          {(communeAr || villageAr) && (
            <div className="flex flex-wrap gap-1.5">
              {communeAr ? (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  {communeAr}
                </span>
              ) : null}
              {villageAr ? (
                <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-200">
                  {villageAr}
                </span>
              ) : null}
            </div>
          )}
          {hierarchyTag && !communeAr ? (
            <p className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold leading-relaxed text-emerald-100">
              {hierarchyTag}
            </p>
          ) : null}
        </div>
      </div>

      <div className="map-popup-scroll bg-slate-950/90">
        <div className="space-y-3 p-3">
          <div className="space-y-1.5 text-xs leading-relaxed tracking-normal">
            {showExactAddress ? (
              <p className="font-bold text-slate-200">{exactAddressAr}</p>
            ) : null}
            {resolvedRoadLabel ? (
              <p className="font-bold text-slate-300">
                <span className="text-slate-100">🛣️ حالة المسلك:</span>{" "}
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

      <div className="space-y-2 border-t border-slate-800/80 bg-slate-900/95 p-3 pb-3">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className={cn(
              mapActionPrimaryClass,
              "h-auto bg-emerald-600 py-2 text-xs hover:bg-emerald-700",
            )}
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden />
            اتصال مباشر
          </a>
        ) : null}

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
            فتح المنشور الأصلي على فيسبوك ↗
          </a>
        ) : null}

        {showFieldReportButton && onFieldReportClick ? (
          <button
            type="button"
            onClick={onFieldReportClick}
            className={cn(
              mapActionSecondaryClass,
              "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700",
            )}
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

        {shareWhatsAppUrl ? (
          <a
            href={shareWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              mapActionPrimaryClass,
              "h-auto bg-[#25D366] py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#20bd5a]",
            )}
          >
            📢 توجيه النداء عبر واتساب
          </a>
        ) : null}

        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              mapActionPrimaryClass,
              "h-auto bg-[#25D366] py-2 text-xs hover:bg-[#20bd5a]",
            )}
          >
            واتساب
          </a>
        ) : null}
      </div>
    </div>
  );
}
