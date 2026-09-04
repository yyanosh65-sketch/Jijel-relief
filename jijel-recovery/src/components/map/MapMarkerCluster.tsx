"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  type ReactElement,
  type ReactNode,
} from "react";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

import { sanitizeClusterPosition } from "@/lib/wilaya";

type ClusterAccent = "rose" | "amber" | "sky" | "emerald";

type MapMarkerClusterProps = {
  children: ReactNode;
  /**
   * Layer accent:
   * - rose: needs & emergency
   * - amber: emergency/community facilities
   * - sky: settlements & villages
   */
  accent?: ClusterAccent;
  maxClusterRadius?: number;
};

/** CSS modifier classes defined in globals.css (Tailwind not applied inside DivIcon HTML). */
const ACCENT_MODIFIER: Record<ClusterAccent, string> = {
  rose: "map-cluster-bubble--rose",
  amber: "map-cluster-bubble--amber",
  sky: "map-cluster-bubble--sky",
  emerald: "map-cluster-bubble--sky",
};

function createClusterIcon(
  cluster: { getChildCount: () => number },
  accent: ClusterAccent,
): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  const modifier = ACCENT_MODIFIER[accent];

  return L.divIcon({
    html: `<div class="map-cluster-bubble ${modifier}" style="width:${size}px;height:${size}px">${count}</div>`,
    className: "map-cluster-icon marker-cluster",
    iconSize: L.point(size, size, true),
  });
}

function readMarkerLatLng(
  child: ReactElement,
): { lat: number; lng: number } | null {
  const position = (child.props as { position?: unknown }).position;
  if (Array.isArray(position) && typeof position[0] === "number") {
    const lat = position[0];
    const lng = typeof position[1] === "number" ? position[1] : NaN;
    return { lat, lng };
  }
  if (
    position &&
    typeof position === "object" &&
    "lat" in position &&
    "lng" in position &&
    typeof (position as { lat: unknown }).lat === "number" &&
    typeof (position as { lng: unknown }).lng === "number"
  ) {
    return {
      lat: (position as { lat: number }).lat,
      lng: (position as { lng: number }).lng,
    };
  }
  return null;
}

/**
 * Drop oceanic / inverted / out-of-belt pins so clusters never anchor mid-sea.
 * Also rewrites swapped lat/lng onto the Marker when needed.
 */
function sanitizeClusterChildren(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];

  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) {
      out.push(child);
      continue;
    }

    const coords = readMarkerLatLng(child);
    if (coords == null) {
      out.push(child);
      continue;
    }

    const safe = sanitizeClusterPosition(coords.lat, coords.lng);
    if (!safe) continue;

    if (safe.lat === coords.lat && safe.lng === coords.lng) {
      out.push(child);
      continue;
    }

    const prev = (child.props as { position?: unknown }).position;
    const nextPosition = Array.isArray(prev)
      ? ([safe.lat, safe.lng] as [number, number])
      : { lat: safe.lat, lng: safe.lng };

    out.push(
      cloneElement(child as ReactElement<{ position?: unknown }>, {
        position: nextPosition,
      }),
    );
  }

  return out;
}

/**
 * Dark glassmorphic marker cluster group for dense point layers.
 * Zooming into a cluster expands bounds; spiderfy at max zoom.
 */
export default function MapMarkerCluster({
  children,
  accent = "sky",
  maxClusterRadius = 45,
}: MapMarkerClusterProps) {
  const iconCreateFunction = useCallback(
    (cluster: { getChildCount: () => number }) =>
      createClusterIcon(cluster, accent),
    [accent],
  );

  const safeChildren = sanitizeClusterChildren(children);

  return (
    <MarkerClusterGroup
      chunkedLoading={true}
      showCoverageOnHover={false}
      spiderfyOnMaxZoom={true}
      zoomToBoundsOnClick
      maxClusterRadius={maxClusterRadius}
      animate
      animateAddingMarkers={false}
      removeOutsideVisibleBounds
      iconCreateFunction={iconCreateFunction}
    >
      {safeChildren}
    </MarkerClusterGroup>
  );
}
