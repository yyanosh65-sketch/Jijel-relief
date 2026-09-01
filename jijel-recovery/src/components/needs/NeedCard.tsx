"use client";

import type { MapNeed } from "@/actions/needs";
import { getMarkerColor } from "@/lib/map-utils";
import { NeedProgressBar, glassPanelClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type NeedCardProps = {
  need: MapNeed;
  onPledge: (need: MapNeed) => void;
  isSelected?: boolean;
};

const MARKER_DOT: Record<ReturnType<typeof getMarkerColor>, string> = {
  red: "bg-red-600",
  orange: "bg-orange-600",
  green: "bg-green-600",
};

export default function NeedCard({ need, onPledge, isSelected }: NeedCardProps) {
  const color = getMarkerColor(need);
  const remaining = need.quantityNeeded - need.quantityFulfilled;

  return (
    <article
      dir="rtl"
      className={cn(
        glassPanelClass,
        "p-4 transition hover:shadow-xl",
        isSelected
          ? "border-emerald-500/80 ring-2 ring-emerald-100"
          : "border-slate-200/80",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", MARKER_DOT[color])}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {need.title}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            {need.location.name} — {need.location.daira}
          </p>
          <NeedProgressBar
            className="mt-3"
            fulfilled={need.quantityFulfilled}
            needed={need.quantityNeeded}
            size="sm"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPledge(need)}
        disabled={remaining <= 0}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        نعاون في هاد الخير
      </button>
    </article>
  );
}
