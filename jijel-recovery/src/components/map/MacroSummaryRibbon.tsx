"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type MacroStats = {
  settlementsUnderIntervention: number;
  fourByFourVehicles: number;
  blockedRoads: number;
};

type MacroSummaryRibbonProps = {
  className?: string;
};

/** Ultra-compact one-line ticker (~26px) for the top HUD. */
export default function MacroSummaryRibbon({
  className,
}: MacroSummaryRibbonProps) {
  const [stats, setStats] = useState<MacroStats>({
    settlementsUnderIntervention: 0,
    fourByFourVehicles: 0,
    blockedRoads: 0,
  });

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch("/api/map-macro-stats")
        .then((r) => r.json())
        .then((json: { success?: boolean; data?: MacroStats }) => {
          if (!cancelled && json.success && json.data) {
            setStats(json.data);
          }
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      dir="rtl"
      role="status"
      aria-label="ملخص ميداني"
      className={cn(
        "map-macro-ticker max-h-[26px] w-full overflow-x-auto whitespace-nowrap border-t border-white/5 bg-slate-950/50 text-[11px] font-semibold leading-[26px] text-slate-300",
        "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "px-2 py-0",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <span>
          📍 مشاتي:{" "}
          <span className="tabular-nums text-emerald-300">
            {stats.settlementsUnderIntervention}
          </span>
        </span>
        <span className="text-slate-600" aria-hidden>
          •
        </span>
        <span>
          🚙 4x4:{" "}
          <span className="tabular-nums text-sky-300">
            {stats.fourByFourVehicles}
          </span>
        </span>
        <span className="text-slate-600" aria-hidden>
          •
        </span>
        <span>
          🚧 مسالك:{" "}
          <span className="tabular-nums text-amber-300">
            {stats.blockedRoads}
          </span>
        </span>
      </span>
    </div>
  );
}
