"use client";

import type { MapNeed } from "@/actions/needs";
import {
  formatNeedLocationArabic,
  translateNeedTitle,
} from "@/lib/need-display";
import { getMarkerColor } from "@/lib/map-utils";
import { NeedProgressBar, premiumCardClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type NeedCardProps = {
  need: MapNeed;
  onPledge: (need: MapNeed) => void;
  onOpenDossier?: (need: MapNeed) => void;
  isSelected?: boolean;
};

const MARKER_DOT: Record<ReturnType<typeof getMarkerColor>, string> = {
  red: "bg-red-600",
  orange: "bg-orange-600",
  green: "bg-green-600",
};

export default function NeedCard({
  need,
  onPledge,
  onOpenDossier,
  isSelected,
}: NeedCardProps) {
  const color = getMarkerColor(need);
  const remaining = need.quantityNeeded - need.quantityFulfilled;
  const titleAr = translateNeedTitle(need.title);
  const locationAr = formatNeedLocationArabic(need);

  return (
    <article
      dir="rtl"
      className={cn(
        premiumCardClass,
        "p-4",
        isSelected
          ? "border-emerald-500/80 ring-2 ring-emerald-100"
          : "border-slate-200/80",
      )}
    >
      <button
        type="button"
        onClick={() => onOpenDossier?.(need)}
        className="flex w-full items-start gap-3 text-right transition-opacity hover:opacity-90"
      >
        <span
          className={cn("mt-1.5 h-3 w-3 shrink-0 rounded-full", MARKER_DOT[color])}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-slate-900">
            {titleAr}
          </h3>
          <p className="mt-1 text-xs text-slate-600">{locationAr}</p>
          <NeedProgressBar
            className="mt-3"
            fulfilled={need.quantityFulfilled}
            needed={need.quantityNeeded}
            size="sm"
          />
        </div>
      </button>

      <div className="mt-4 flex gap-2">
        {onOpenDossier ? (
          <button
            type="button"
            onClick={() => onOpenDossier(need)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-100"
          >
            ملف القرية
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onPledge(need)}
          disabled={remaining <= 0}
          className="flex-1 rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          نعاون في هاد الخير
        </button>
      </div>
    </article>
  );
}
