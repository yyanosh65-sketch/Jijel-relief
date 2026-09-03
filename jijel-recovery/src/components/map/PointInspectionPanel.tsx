"use client";

import MapInspectionShell from "@/components/map/MapInspectionShell";
import MapPopupShell from "@/components/map/MapPopupShell";
import type { StatusBadgeTone } from "@/lib/ui-labels";
import type { RoadAccessibility } from "@/lib/map-location-display";

export type PointInspectionData = {
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
  children?: React.ReactNode;
};

type PointInspectionPanelProps = {
  point: PointInspectionData | null;
  open: boolean;
  onClose: () => void;
};

/** Settlement / road / facility inspection — bottom sheet on mobile, card on desktop. */
export default function PointInspectionPanel({
  point,
  open,
  onClose,
}: PointInspectionPanelProps) {
  if (!open || !point) {
    return null;
  }

  return (
    <MapInspectionShell
      open={open}
      onClose={onClose}
      titleId="point-inspection-title"
    >
      <MapPopupShell
        {...point}
        className="!w-full max-w-none rounded-none border-0 bg-transparent shadow-none"
      />
      {/* Visually hidden title anchor for a11y */}
      <span id="point-inspection-title" className="sr-only">
        {point.title}
      </span>
    </MapInspectionShell>
  );
}
