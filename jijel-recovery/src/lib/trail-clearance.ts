import type { TrailClearanceLevel } from "@/db/schema";

export const TRAIL_CLEARANCE_LEVELS = [
  "sedan_passable",
  "high_clearance_only",
  "strict_4x4_required",
  "completely_blocked",
] as const satisfies readonly TrailClearanceLevel[];

export const TRAIL_CLEARANCE_META: Record<
  TrailClearanceLevel,
  {
    emoji: string;
    labelAr: string;
    shortAr: string;
    badgeClass: string;
    pinColor: string;
    pulse: boolean;
  }
> = {
  sedan_passable: {
    emoji: "🟢",
    labelAr: "صالحة لجميع المركبات",
    shortAr: "سيارة عادية",
    badgeClass: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
    pinColor: "#22c55e",
    pulse: false,
  },
  high_clearance_only: {
    emoji: "🟡",
    labelAr: "مركبة مرتفعة / بيك آب",
    shortAr: "مرتفعة / بيك آب",
    badgeClass: "border-amber-500/40 bg-amber-500/15 text-amber-100",
    pinColor: "#f59e0b",
    pulse: false,
  },
  strict_4x4_required: {
    emoji: "🔴",
    labelAr: "مركبات 4x4 فقط",
    shortAr: "4x4 فقط",
    badgeClass: "border-orange-500/45 bg-orange-600/20 text-orange-100",
    pinColor: "#ea580c",
    pulse: false,
  },
  completely_blocked: {
    emoji: "⛔",
    labelAr: "مسلك مقطوع تماماً",
    shortAr: "مقطوع",
    badgeClass: "border-rose-500/50 bg-rose-600/25 text-rose-100",
    pinColor: "#e11d48",
    pulse: true,
  },
};

export type SerializedMountainTrail = {
  id: number;
  roadCode: string;
  settlementId: number | null;
  clearanceLevel: TrailClearanceLevel;
  audioVoiceNoteUrl: string | null;
  notes: string | null;
  reportedByPhone: string | null;
  lat: string;
  lng: string;
  updatedAt: string;
};

export function serializeMountainTrail(row: {
  id: number;
  roadCode: string;
  settlementId: number | null;
  clearanceLevel: TrailClearanceLevel;
  audioVoiceNoteUrl: string | null;
  notes: string | null;
  reportedByPhone: string | null;
  lat: string;
  lng: string;
  updatedAt: Date | string;
}): SerializedMountainTrail {
  return {
    id: row.id,
    roadCode: row.roadCode,
    settlementId: row.settlementId,
    clearanceLevel: row.clearanceLevel,
    audioVoiceNoteUrl: row.audioVoiceNoteUrl,
    notes: row.notes,
    reportedByPhone: row.reportedByPhone,
    lat: row.lat,
    lng: row.lng,
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  };
}

export function createTrailMarkerIconHtml(
  level: TrailClearanceLevel,
): string {
  const meta = TRAIL_CLEARANCE_META[level];
  const pulseClass = meta.pulse ? " trail-blocked-pulse" : "";
  return `<span class="trail-clearance-pin${pulseClass}" style="--trail-pin:${meta.pinColor}" title="${meta.labelAr}">${meta.emoji}</span>`;
}
