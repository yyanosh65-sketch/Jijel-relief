"use client";

import { useCallback, type ReactNode } from "react";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

type MapMarkerClusterProps = {
  children: ReactNode;
  /** Optional accent for severity-tinted clusters */
  accent?: "emerald" | "rose" | "sky" | "amber";
  maxClusterRadius?: number;
};

const ACCENT_TEXT: Record<
  NonNullable<MapMarkerClusterProps["accent"]>,
  string
> = {
  emerald: "text-emerald-400 border-emerald-500/40",
  rose: "text-rose-400 border-rose-500/40",
  sky: "text-sky-400 border-sky-500/40",
  amber: "text-amber-400 border-amber-500/40",
};

function createClusterIcon(
  cluster: { getChildCount: () => number },
  accent: NonNullable<MapMarkerClusterProps["accent"]>,
): L.DivIcon {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  const accentClasses = ACCENT_TEXT[accent];

  return L.divIcon({
    html: `<div class="map-cluster-bubble bg-slate-900/90 border rounded-full shadow-lg font-bold flex items-center justify-center ${accentClasses}" style="width:${size}px;height:${size}px">${count}</div>`,
    className: "map-cluster-icon marker-cluster",
    iconSize: L.point(size, size, true),
  });
}

/**
 * Dark glassmorphic marker cluster group for dense point layers.
 * Zooming into a cluster expands bounds; spiderfy at max zoom.
 */
export default function MapMarkerCluster({
  children,
  accent = "emerald",
  maxClusterRadius = 45,
}: MapMarkerClusterProps) {
  const iconCreateFunction = useCallback(
    (cluster: { getChildCount: () => number }) =>
      createClusterIcon(cluster, accent),
    [accent],
  );

  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      spiderfyOnMaxZoom
      zoomToBoundsOnClick
      maxClusterRadius={maxClusterRadius}
      animate
      removeOutsideVisibleBounds
      iconCreateFunction={iconCreateFunction}
    >
      {children}
    </MarkerClusterGroup>
  );
}
