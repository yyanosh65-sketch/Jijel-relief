import L from "leaflet";

import type { NeedCategory, NeedUrgency } from "@/db/schema";
import type { RoadPassability } from "@/lib/intelligence";

export type NeedMarkerVariant = "sos" | "logistics" | "hub" | "default";

const ROAD_COLORS: Record<RoadPassability, string> = {
  open: "#16a34a",
  rough_4x4: "#ea580c",
  closed: "#dc2626",
};

export function createSosMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span class="sos-marker-pulse" style="display:block;width:24px;height:24px;border-radius:9999px;background:#e11d48;border:3px solid #fff;box-shadow:0 0 0 0 rgba(225,29,72,0.75)"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

export function resolveNeedMarkerVariant(input: {
  category?: NeedCategory | string;
  urgency?: NeedUrgency | string;
  title?: string;
}): NeedMarkerVariant {
  const category = input.category ?? "";
  const urgency = input.urgency ?? "";
  const title = (input.title ?? "").toLowerCase();

  if (
    urgency === "critical" ||
    category === "medical" ||
    category === "sos_orphan_family" ||
    /استغاثة|sos|طوارئ|تراجيد/.test(title)
  ) {
    return "sos";
  }

  if (
    category === "food" ||
    category === "water" ||
    /غذاء|ماء|food|water|أغذية/.test(title)
  ) {
    return "logistics";
  }

  if (/مستودع|warehouse|hub|مركز إغاثة/.test(title)) {
    return "hub";
  }

  return "default";
}

export function createNeedMarkerIcon(variant: NeedMarkerVariant): L.DivIcon {
  if (variant === "sos") {
    return createSosMarkerIcon();
  }

  if (variant === "logistics") {
    return L.divIcon({
      className: "",
      html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:#f59e0b;border:3px solid #fff;box-shadow:0 2px 8px rgba(245,158,11,0.55)"></span>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });
  }

  if (variant === "hub") {
    return L.divIcon({
      className: "",
      html: `<span style="display:block;width:22px;height:22px;border-radius:6px;background:#10b981;border:3px solid #fff;box-shadow:0 2px 8px rgba(16,185,129,0.45)"></span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -11],
    });
  }

  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#64748b;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
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

const WAYPOINT_COLORS: Record<string, string> = {
  lodging: "#2563eb",
  kitchen: "#ea580c",
  fuel: "#ca8a04",
  warehouse: "#10b981",
  reception: "#059669",
};

const WAYPOINT_ICONS: Record<string, string> = {
  lodging: "🛏️",
  kitchen: "🍲",
  fuel: "⛽",
  warehouse: "📦",
  reception: "🚩",
};

export function createWaypointMarkerIcon(type: string): L.DivIcon {
  const color = WAYPOINT_COLORS[type] ?? "#475569";
  const symbol = WAYPOINT_ICONS[type] ?? "📍";

  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${color};color:#fff;font-size:12px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.25)">${symbol}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}
