"use client";

import { Navigation } from "lucide-react";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import {
  buildGoogleMapsDirectionsUrl,
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

  return (
    <div
      dir="rtl"
      className={cn(
        "map-popup-content min-w-[280px] space-y-3 p-3 text-right text-slate-900",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-bold text-emerald-800">🏷️ {pointTypeLabel}</p>
        <h3 className="text-sm font-bold leading-snug text-slate-900">{title}</h3>
      </div>

      <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-xs leading-relaxed text-slate-900">
        <p>
          <span className="font-bold text-slate-800">📍 العنوان الدقيق:</span>{" "}
          {addressHierarchy}
        </p>
        {exactAddressAr ? (
          <p className="text-slate-800">{exactAddressAr}</p>
        ) : null}
        {resolvedRoadLabel ? (
          <p>
            <span className="font-bold text-slate-800">🛣️ حالة المسلك:</span>{" "}
            {resolvedRoadLabel}
          </p>
        ) : null}
        <p className="font-mono text-[10px] text-slate-600" dir="ltr">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      </div>

      {children}

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
      >
        <Navigation className="h-4 w-4 shrink-0 text-blue-700" />
        🗺️ فتح في Google Maps للملاحة
      </a>

      {phone ? (
        <ContactActionButtons
          phone={phone}
          whatsappUrl={whatsappUrl}
          variant="map"
        />
      ) : null}
    </div>
  );
}
