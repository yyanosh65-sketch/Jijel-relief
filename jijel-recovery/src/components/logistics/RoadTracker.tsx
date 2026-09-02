"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Route } from "lucide-react";

import {
  JIJEL_ENTRY_CORRIDORS,
  ROAD_STATUS_LABELS,
  ROAD_STATUS_STYLES,
} from "@/lib/road-corridors";
import { cn } from "@/lib/utils";

type RoadTrackerProps = {
  className?: string;
  forceCollapsed?: boolean;
};

export default function RoadTracker({
  className,
  forceCollapsed = false,
}: RoadTrackerProps) {
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (forceCollapsed) {
      setExpanded(false);
    }
  }, [forceCollapsed]);

  const isOpen = forceCollapsed ? false : expanded;

  return (
    <div
      dir="rtl"
      className={cn(
        "pointer-events-auto rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-xl backdrop-blur-md",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-right"
      >
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-extrabold text-white">
            حالة محاور دخول جيجل
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {isOpen ? (
        <div className="space-y-2 border-t border-slate-800/80 px-3 pb-3 pt-2">
          {JIJEL_ENTRY_CORRIDORS.map((corridor) => {
            const styles = ROAD_STATUS_STYLES[corridor.status];
            return (
              <div
                key={corridor.id}
                className="rounded-xl border border-slate-800/60 bg-slate-950/60 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-extrabold text-slate-100">
                      {corridor.route} — {corridor.labelAr}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {corridor.axisAr}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                      styles.badge,
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", styles.dot)}
                    />
                    {ROAD_STATUS_LABELS[corridor.status]}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                  {corridor.noteAr}
                </p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
