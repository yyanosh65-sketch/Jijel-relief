"use client";

import { Marker, Popup } from "react-leaflet";

import MapPopupShell from "@/components/map/MapPopupShell";
import { WAYPOINT_TYPE_LABELS } from "@/lib/convoys";
import type { ConvoyWaypoint } from "@/lib/convoy-waypoints";
import { createWaypointMarkerIcon } from "@/lib/map-layer-icons";
import {
  getWaypointPointTypeLabel,
  getWaypointTypeIcon,
} from "@/lib/map-location-display";
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
    <MapPopupShell
      pointTypeLabel={getWaypointPointTypeLabel(waypoint.type)}
      title={`${getWaypointTypeIcon(waypoint.type)} ${waypoint.name_ar}`}
      addressHierarchy={`ولاية جيجل > ${typeMeta.labelAr} > ${waypoint.name_ar}`}
      exactAddressAr={waypoint.notes || undefined}
      roadAccessibility="paved_heavy_truck"
      lat={waypoint.lat}
      lng={waypoint.lng}
      phone={waypoint.phone}
      whatsappUrl={whatsappUrl}
    >
      <div className="space-y-1 text-xs text-slate-800">
        <p>
          <span className="font-bold">الساعات:</span> {waypoint.opening_hours}
        </p>
        <p>
          <span className="font-bold">السعة:</span> {waypoint.capacity}
        </p>
      </div>
    </MapPopupShell>
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
