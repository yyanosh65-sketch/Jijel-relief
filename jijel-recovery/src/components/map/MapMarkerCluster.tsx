"use client";

import { useCallback, type ReactNode } from "react";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

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
