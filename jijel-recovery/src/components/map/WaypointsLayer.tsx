"use client";

import { Marker } from "react-leaflet";

import MapPopup from "@/components/map/MapPopup";
import MapPopupShell from "@/components/map/MapPopupShell";
import { WAYPOINT_TYPE_LABELS } from "@/lib/convoys";
import type { ConvoyWaypoint } from "@/lib/convoy-waypoints";
import { clampJijelLandPosition } from "@/lib/geo";
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

function WaypointPopupContent({
  waypoint,
  lat,
  lng,
}: {
  waypoint: ConvoyWaypoint;
  lat: number;
  lng: number;
}) {
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
      lat={lat}
      lng={lng}
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
      {waypoints.map((waypoint) => {
        const [waypointLat, waypointLng] = clampJijelLandPosition(
          waypoint.lat,
          waypoint.lng,
        );

        return (
        <Marker
          key={waypoint.id}
          position={[waypointLat, waypointLng]}
          icon={createWaypointMarkerIcon(waypoint.type)}
          zIndexOffset={500}
        >
          <MapPopup>
            <WaypointPopupContent
              waypoint={waypoint}
              lat={waypointLat}
              lng={waypointLng}
            />
          </MapPopup>
        </Marker>
        );
      })}
    </>
  );
}
