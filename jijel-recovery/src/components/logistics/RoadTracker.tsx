"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Route } from "lucide-react";

import {
  JIJEL_ENTRY_CORRIDORS,
  ROAD_STATUS_LABELS,
  ROAD_STATUS_STYLES,
  type RoadCorridorStatus,
} from "@/lib/road-corridors";
import { cn } from "@/lib/utils";

type RoadTrackerProps = {
  className?: string;
  forceCollapsed?: boolean;
};

function getStatusBadgeLabel(status: RoadCorridorStatus): string {
  return ROAD_STATUS_LABELS[status];
}

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
        "pointer-events-auto w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/90 shadow-xl backdrop-blur-md",
        isOpen &&
          "max-h-[calc(100vh-12rem)] overflow-y-auto modal-body-scroll",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-right"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Route className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className="text-sm font-extrabold text-white">
            حالة محاور دخول جيجل
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {isOpen ? (
        <div className="space-y-2 border-t border-slate-800/80 px-3 pb-3 pt-2">
          {JIJEL_ENTRY_CORRIDORS.map((corridor) => {
            const styles = ROAD_STATUS_STYLES[corridor.status];
            const isDifficult = corridor.status === "difficult_4x4";

            return (
              <div
                key={corridor.id}
                className="overflow-hidden rounded-xl border border-slate-800/60 bg-slate-950/60 px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold leading-snug text-slate-100">
                      {corridor.route} — {corridor.labelAr}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {corridor.axisAr}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold whitespace-normal break-words",
                      isDifficult && "text-[11px] leading-tight",
                      styles.badge,
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        styles.dot,
                      )}
                    />
                    {getStatusBadgeLabel(corridor.status)}
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
