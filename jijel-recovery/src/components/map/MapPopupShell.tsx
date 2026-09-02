"use client";

import { MessageCircle, Navigation } from "lucide-react";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import {
  buildGoogleMapsDirectionsUrl,
  isRedundantExactAddress,
  type RoadAccessibility,
  ROAD_ACCESSIBILITY_LABELS,
} from "@/lib/map-location-display";
import { cn } from "@/lib/utils";

type MapPopupShellProps = {
  pointTypeLabel: string;
  title: string;
  addressHierarchy: string;
  exactAddressAr?: string;
  roadAccessibility?: RoadAccessibility | string;
  roadLabel?: string;
  lat: number;
  lng: number;
  phone?: string | null;
  whatsappUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
};

export default function MapPopupShell({
  pointTypeLabel,
  title,
  addressHierarchy,
  exactAddressAr,
  roadAccessibility,
  roadLabel,
  lat,
  lng,
  phone,
  whatsappUrl,
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

  const mapsUrl = buildGoogleMapsDirectionsUrl(lat, lng);
  const showExactAddress =
    exactAddressAr &&
    !isRedundantExactAddress(exactAddressAr, addressHierarchy);

  return (
    <div
      dir="rtl"
      className={cn(
        "map-popup-content max-h-[380px] min-w-[280px] space-y-3 overflow-y-auto p-3 text-right text-slate-900",
        className,
      )}
    >
      <div className="space-y-1.5">
        <p className="text-xs font-bold text-emerald-800">🏷️ {pointTypeLabel}</p>
        <h3 className="text-base font-extrabold leading-snug text-slate-900">
          {title}
        </h3>
        <p className="text-xs font-semibold text-emerald-800 rounded-md border border-emerald-200 bg-emerald-50 p-1.5 leading-relaxed">
          📍 {addressHierarchy}
        </p>
      </div>

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
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      </div>

      {children}

      <div className="space-y-2 pt-1">
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
  );
}
