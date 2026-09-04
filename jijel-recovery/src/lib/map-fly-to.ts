export const MAP_FLY_TO_BOUNDS_EVENT = "ighata:fly-to-bounds";
export const MAP_FLY_TO_POINT_EVENT = "ighata:fly-to-point";

export type FlyToBoundsDetail = {
  points: Array<{ lat: number; lng: number }>;
  padding?: [number, number];
  maxZoom?: number;
};

export type FlyToPointDetail = {
  lat: number;
  lng: number;
  zoom?: number;
  duration?: number;
};

export function dispatchFlyToBounds(detail: FlyToBoundsDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MAP_FLY_TO_BOUNDS_EVENT, { detail }),
  );
}

export function dispatchFlyToPoint(detail: FlyToPointDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MAP_FLY_TO_POINT_EVENT, { detail }));
}
