import L from "leaflet";

import type { RoadPassability } from "@/lib/intelligence";

const ROAD_COLORS: Record<RoadPassability, string> = {
  open: "#16a34a",
  rough_4x4: "#ea580c",
  closed: "#dc2626",
};

export function createSosMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span class="sos-marker-pulse" style="display:block;width:22px;height:22px;border-radius:9999px;background:#dc2626;border:3px solid #fff;box-shadow:0 0 0 0 rgba(220,38,38,0.7)"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function createVillageMarkerIcon(isDaira: boolean): L.DivIcon {
  const color = isDaira ? "#1d4ed8" : "#3b82f6";
  const size = isDaira ? 16 : 12;

  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:4px;background:${color};border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3);transform:rotate(45deg)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function createRoadMarkerIcon(passability: RoadPassability): L.DivIcon {
  const color = ROAD_COLORS[passability];

  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:4px;background:${color};color:#fff;font-size:10px;font-weight:bold;border:2px solid #fff">⛨</span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function createFacilityMarkerIcon(type: "veterinary" | "civil_protection"): L.DivIcon {
  const color = type === "veterinary" ? "#7c3aed" : "#c2410c";
  const symbol = type === "veterinary" ? "✚" : "🛡";

  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:${color};color:#fff;font-size:11px;border:2px solid #fff">${symbol}</span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}
