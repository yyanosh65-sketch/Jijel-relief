"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export const INCIDENT_URGENCY_OPTIONS = [
  {
    value: "critical" as const,
    label: "حرجة جداً",
    emoji: "🔴",
  },
  {
    value: "high" as const,
    label: "متوسطة",
    emoji: "🟡",
  },
  {
    value: "medium" as const,
    label: "عادية",
    emoji: "🟢",
  },
] as const;

export type IncidentUrgency = (typeof INCIDENT_URGENCY_OPTIONS)[number]["value"];

export const INCIDENT_AID_TAGS = [
  { id: "water", label: "💧 ماء صالح للشرب" },
  { id: "bedding", label: "🛏️ أفرشة وأغطية" },
  { id: "infant", label: "🍼 حليب ومستلزمات رضع" },
  { id: "medical", label: "💊 أدوية وأكسجين" },
  { id: "fodder", label: "🌾 علف مواشي" },
  { id: "saplings", label: "🌱 شتلات وأشجار" },
  { id: "rebuild", label: "🧱 مواد بناء وترميم" },
] as const;

export type IncidentAidTagId = (typeof INCIDENT_AID_TAGS)[number]["id"];

/** Map primary aid tag → damage-report intake category */
export function aidTagToIntakeCategory(
  tags: IncidentAidTagId[],
): "olive" | "livestock" | "roof" | "water" {
  if (tags.includes("water")) return "water";
  if (tags.includes("fodder") || tags.includes("saplings")) return "livestock";
  if (tags.includes("rebuild") || tags.includes("bedding")) return "roof";
  if (tags.includes("infant") || tags.includes("medical")) return "livestock";
  return "water";
}

export function formatAidTagsForDescription(tags: IncidentAidTagId[]): string {
  if (tags.length === 0) return "";
  const labels = INCIDENT_AID_TAGS.filter((t) => tags.includes(t.id)).map(
    (t) => t.label,
  );
  return `المساعدات المطلوبة: ${labels.join(" · ")}`;
}

type IncidentReportFieldsProps = {
  affectedFamilies: number;
  onAffectedFamiliesChange: (n: number) => void;
  urgency: IncidentUrgency;
  onUrgencyChange: (u: IncidentUrgency) => void;
  aidTags: IncidentAidTagId[];
  onAidTagsChange: (tags: IncidentAidTagId[]) => void;
  className?: string;
};

export function IncidentReportFields({
  affectedFamilies,
  onAffectedFamiliesChange,
  urgency,
  onUrgencyChange,
  aidTags,
  onAidTagsChange,
  className,
}: IncidentReportFieldsProps) {
  function bumpFamilies(delta: number) {
    onAffectedFamiliesChange(Math.max(1, affectedFamilies + delta));
  }

  function toggleTag(id: IncidentAidTagId) {
    if (aidTags.includes(id)) {
      onAidTagsChange(aidTags.filter((t) => t !== id));
    } else {
      onAidTagsChange([...aidTags, id]);
    }
  }

  return (
    <div className={cn("space-y-4", className)} dir="rtl">
      {/* Group 1 — affected families stepper */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300">
          عدد العائلات المتضررة
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="إنقاص"
            onClick={() => bumpFamilies(-1)}
            disabled={affectedFamilies <= 1}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-white transition hover:bg-slate-700 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            type="number"
            min={1}
            value={affectedFamilies}
            onChange={(e) =>
              onAffectedFamiliesChange(Math.max(1, Number(e.target.value) || 1))
            }
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 text-center text-base font-bold text-white outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            aria-label="زيادة"
            onClick={() => bumpFamilies(1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-white transition hover:bg-slate-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group 2 — urgency pills */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300">درجة الاستعجال</p>
        <div className="flex flex-wrap gap-2">
          {INCIDENT_URGENCY_OPTIONS.map((option) => {
            const active = urgency === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onUrgencyChange(option.value)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-bold transition",
                  active &&
                    option.value === "critical" &&
                    "border-rose-400 bg-rose-600/30 text-rose-100",
                  active &&
                    option.value === "high" &&
                    "border-amber-400 bg-amber-600/30 text-amber-100",
                  active &&
                    option.value === "medium" &&
                    "border-emerald-400 bg-emerald-600/30 text-emerald-100",
                  !active &&
                    "border-slate-600 bg-slate-800/80 text-slate-300 hover:border-slate-500",
                )}
              >
                {option.emoji} {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group 3 — aid category multi-select */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300">
          نوع المساعدات المطلوبة
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INCIDENT_AID_TAGS.map((tag) => {
            const active = aidTags.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition",
                  active
                    ? "border-sky-400/60 bg-sky-600/25 text-sky-100"
                    : "border-slate-600 bg-slate-800/70 text-slate-300 hover:border-slate-500",
                )}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type CoordinatesBannerProps = {
  lat?: number | null;
  lng?: number | null;
  className?: string;
};

/** Pinned chip above submit — or amber hint when coords missing */
export function IncidentCoordinatesBanner({
  lat,
  lng,
  className,
}: CoordinatesBannerProps) {
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  if (!hasCoords) {
    return (
      <p
        className={cn(
          "rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2.5 text-center text-xs font-semibold text-amber-200",
          className,
        )}
      >
        يرجى النقر على الخريطة لتثبيت مكان الحادث أولاً
      </p>
    );
  }

  return (
    <p
      className={cn(
        "inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-950/50 px-3 py-2 text-[11px] font-semibold text-emerald-200",
        className,
      )}
    >
      <span aria-hidden>📍</span>
      <span dir="ltr">
        الإحداثيات المحددة: {lat!.toFixed(4)}, {lng!.toFixed(4)}
      </span>
    </p>
  );
}
