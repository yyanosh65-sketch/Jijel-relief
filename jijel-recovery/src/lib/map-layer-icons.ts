import L from "leaflet";

import type { NeedCategory, NeedUrgency } from "@/db/schema";
import type { RoadPassability } from "@/lib/intelligence";
import {
  formatResponderBadgeHtml,
  type ResponderBadgeCounts,
} from "@/lib/responders";

export type NeedMarkerVariant = "sos" | "logistics" | "hub" | "default";

const ROAD_COLORS: Record<RoadPassability, string> = {
  open: "#16a34a",
  rough_4x4: "#ea580c",
  closed: "#dc2626",
};

function pinCoreHtml(color: string, size: number, radius = "9999px"): string {
  return `<span class="need-marker-core" style="display:block;width:${size}px;height:${size}px;border-radius:${radius};background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></span>`;
}

function wrapNeedMarkerHtml(options: {
  coreHtml: string;
  urgency?: NeedUrgency | string;
  badges?: ResponderBadgeCounts | null;
  size: number;
}): string {
  const pulse =
    options.urgency === "critical" || options.urgency === "high"
      ? `<span class="radar-pulse" aria-hidden="true"></span><span class="radar-pulse radar-pulse-delay" aria-hidden="true"></span>`
      : "";

  const badgeText = options.badges
    ? formatResponderBadgeHtml(options.badges)
    : "";
  const badge =
    badgeText.length > 0
      ? `<span class="need-responder-badge">${badgeText}</span>`
      : "";

  return `<div class="need-marker-anchor" style="width:${options.size}px;height:${options.size}px">${pulse}${badge}${options.coreHtml}</div>`;
}

export function createSosMarkerIcon(): L.DivIcon {
  return L.divIcon({
    className: "need-marker-icon",
    html: wrapNeedMarkerHtml({
      coreHtml: `<span class="sos-marker-pulse need-marker-core" style="display:block;width:24px;height:24px;border-radius:9999px;background:#e11d48;border:3px solid #fff"></span>`,
      urgency: "critical",
      size: 24,
    }),
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

export function createNeedMarkerIcon(
  variant: NeedMarkerVariant,
  options?: {
    urgency?: NeedUrgency | string;
    badges?: ResponderBadgeCounts | null;
  },
): L.DivIcon {
  const urgency = options?.urgency;
  const badges = options?.badges ?? null;

  if (variant === "sos") {
    return L.divIcon({
      className: "need-marker-icon",
      html: wrapNeedMarkerHtml({
        coreHtml: pinCoreHtml("#e11d48", 24),
        urgency: urgency ?? "critical",
        badges,
        size: 24,
      }),
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  }

  if (variant === "logistics") {
    return L.divIcon({
      className: "need-marker-icon",
      html: wrapNeedMarkerHtml({
        coreHtml: pinCoreHtml("#f59e0b", 20),
        urgency,
        badges,
        size: 20,
      }),
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10],
    });
  }

  if (variant === "hub") {
    return L.divIcon({
      className: "need-marker-icon",
      html: wrapNeedMarkerHtml({
        coreHtml: pinCoreHtml("#10b981", 22, "6px"),
        urgency,
        badges,
        size: 22,
      }),
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -11],
    });
  }

  return L.divIcon({
    className: "need-marker-icon",
    html: wrapNeedMarkerHtml({
      coreHtml: pinCoreHtml("#64748b", 18),
      urgency,
      badges,
      size: 18,
    }),
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

export function createFacilityMarkerIcon(
  type: "veterinary" | "civil_protection",
): L.DivIcon {
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

// ── Community facility icons ────────────────────────────────────────────────

const COMMUNITY_FACILITY_COLORS: Record<string, string> = {
  mosque_operational: "#16a34a",
  mosque_damaged: "#dc2626",
  zawiya_sanctuary: "#7c3aed",
  water_spring: "#0ea5e9",
  oxygen_generator: "#f59e0b",
  cold_chain_pharma: "#06b6d4",
};

const COMMUNITY_FACILITY_SYMBOLS: Record<string, string> = {
  mosque_operational: "🕌",
  mosque_damaged: "🕌",
  zawiya_sanctuary: "🏛",
  water_spring: "💧",
  oxygen_generator: "⚡",
  cold_chain_pharma: "❄️",
};

export function createCommunityFacilityMarkerIcon(
  facilityType: string,
): L.DivIcon {
  const color = COMMUNITY_FACILITY_COLORS[facilityType] ?? "#475569";
  const symbol = COMMUNITY_FACILITY_SYMBOLS[facilityType] ?? "📍";

  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${color};color:#fff;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35)">${symbol}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

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
