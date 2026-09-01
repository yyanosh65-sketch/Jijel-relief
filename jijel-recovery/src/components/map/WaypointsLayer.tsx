"use client";

import { Marker, Popup } from "react-leaflet";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import { WAYPOINT_TYPE_LABELS } from "@/lib/convoys";
import type { ConvoyWaypoint } from "@/lib/convoy-waypoints";
import { createWaypointMarkerIcon } from "@/lib/map-layer-icons";
import { buildWhatsAppUrl } from "@/lib/phone";

type WaypointsLayerProps = {
  waypoints: ConvoyWaypoint[];
  visible: boolean;
};

function WaypointPopupContent({ waypoint }: { waypoint: ConvoyWaypoint }) {
  const typeMeta = WAYPOINT_TYPE_LABELS[waypoint.type];
  const whatsappPhone = waypoint.whatsapp ?? waypoint.phone;
  const whatsappUrl = buildWhatsAppUrl(
    whatsappPhone,
    `السلام عليكم، نحتاج معلومات عن ${waypoint.name_ar}`,
  );

  return (
    <div dir="rtl" className="min-w-[220px] text-right text-sm">
      <p className="font-bold text-slate-900">
        {typeMeta.icon} {waypoint.name_ar}
      </p>
      <p className="mt-1 text-xs text-slate-500">{typeMeta.labelAr}</p>
      <p className="mt-2 text-xs text-slate-700">
        <span className="font-medium">الساعات:</span> {waypoint.opening_hours}
      </p>
      <p className="mt-1 text-xs text-slate-700">
        <span className="font-medium">السعة:</span> {waypoint.capacity}
      </p>
      {waypoint.notes ? (
        <p className="mt-1 text-xs text-slate-600">{waypoint.notes}</p>
      ) : null}
      <ContactActionButtons
        phone={waypoint.phone}
        whatsappUrl={whatsappUrl}
        className="mt-3"
        compact
      />
    </div>
  );
}

export default function WaypointsLayer({
  waypoints,
  visible,
}: WaypointsLayerProps) {
  if (!visible) {
    return null;
  }

  return (
    <>
      {waypoints.map((waypoint) => (
        <Marker
          key={waypoint.id}
          position={[waypoint.lat, waypoint.lng]}
          icon={createWaypointMarkerIcon(waypoint.type)}
          zIndexOffset={500}
        >
          <Popup>
            <WaypointPopupContent waypoint={waypoint} />
          </Popup>
        </Marker>
      ))}
    </>
  );
}
