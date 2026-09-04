"use client";

import { MapPin } from "lucide-react";

import { buildGoogleMapsDirectionsUrl } from "@/lib/map-location-display";
import { cn } from "@/lib/utils";

type NavigateInMapsButtonProps = {
  lat: number;
  lng: number;
  className?: string;
  label?: string;
};

/**
 * One-tap Google Maps directions deep-link (opens app / new tab).
 */
export default function NavigateInMapsButton({
  lat,
  lng,
  className,
  label = "فتح المسار في Google Maps 🗺️",
}: NavigateInMapsButtonProps) {
  const href = buildGoogleMapsDirectionsUrl(lat, lng);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500",
        className,
      )}
    >
      <MapPin className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </a>
  );
}
