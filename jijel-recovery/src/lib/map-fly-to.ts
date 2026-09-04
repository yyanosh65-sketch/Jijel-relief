export const MAP_FLY_TO_BOUNDS_EVENT = "ighata:fly-to-bounds";

export type FlyToBoundsDetail = {
  points: Array<{ lat: number; lng: number }>;
  padding?: [number, number];
  maxZoom?: number;
};

export function dispatchFlyToBounds(detail: FlyToBoundsDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(MAP_FLY_TO_BOUNDS_EVENT, { detail }),
  );
}
