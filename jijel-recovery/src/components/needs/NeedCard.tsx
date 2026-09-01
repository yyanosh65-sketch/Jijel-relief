"use client";

import type { MapNeed } from "@/actions/needs";
import { getMarkerColor } from "@/lib/map-utils";
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
  const progress =
    need.quantityNeeded > 0
      ? Math.min((need.quantityFulfilled / need.quantityNeeded) * 100, 100)
      : 0;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-sm transition",
        isSelected
          ? "border-emerald-600 ring-2 ring-emerald-100"
          : "border-zinc-200",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", MARKER_DOT[color])}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-zinc-900">
            {need.title}
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            {need.location.name} · {need.location.daira}
          </p>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>
                {need.quantityFulfilled}/{need.quantityNeeded}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-emerald-600"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onPledge(need)}
        disabled={remaining <= 0}
        className="mt-4 w-full rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Adopt / Pledge
      </button>
    </article>
  );
}
