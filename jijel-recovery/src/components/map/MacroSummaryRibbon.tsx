"use client";

import useSWR from "swr";

import { useWilayaOptional } from "@/components/map/WilayaProvider";
import { DEFAULT_WILAYA } from "@/lib/wilaya";
import { cn } from "@/lib/utils";

type MacroStats = {
  inIntervention: number;
  registered4x4: number;
  blockedTrails: number;
};

type MacroSummaryRibbonProps = {
  className?: string;
};

async function fetchMacroStats(url: string): Promise<MacroStats> {
  const res = await fetch(url);
  const json = (await res.json()) as {
    success?: boolean;
    data?: Partial<MacroStats> & {
      settlementsUnderIntervention?: number;
      fourByFourVehicles?: number;
      blockedRoads?: number;
    };
  };

  const data = json.data ?? {};
  return {
    inIntervention:
      data.inIntervention ?? data.settlementsUnderIntervention ?? 0,
    registered4x4: data.registered4x4 ?? data.fourByFourVehicles ?? 0,
    blockedTrails: data.blockedTrails ?? data.blockedRoads ?? 0,
  };
}

/** Ultra-compact one-line ticker (~26px) for the top HUD — live-polled per wilaya. */
export default function MacroSummaryRibbon({
  className,
}: MacroSummaryRibbonProps) {
  const wilayaCtx = useWilayaOptional();
  const wilaya = wilayaCtx?.wilaya ?? DEFAULT_WILAYA;

  const { data: stats } = useSWR(
    `/api/map-macro-stats?wilaya=${wilaya}`,
    fetchMacroStats,
    {
      revalidateOnFocus: true,
      refreshInterval: 30_000,
      fallbackData: {
        inIntervention: 0,
        registered4x4: 0,
        blockedTrails: 0,
      },
    },
  );

  return (
    <div
      dir="rtl"
      role="status"
      aria-label="ملخص ميداني"
      className={cn(
        "map-macro-ticker max-h-[26px] w-full overflow-x-auto whitespace-nowrap border-t border-white/5 bg-slate-950/50 py-1 px-2 text-[11px] font-semibold leading-[18px] text-slate-300",
        "no-scrollbar scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <span>
          📍 مشاتي:{" "}
          <span className="tabular-nums text-emerald-300">
            {stats.inIntervention}
          </span>
        </span>
        <span className="text-slate-600" aria-hidden>
          •
        </span>
        <span>
          🚙 4x4:{" "}
          <span className="tabular-nums text-sky-300">
            {stats.registered4x4}
          </span>
        </span>
        <span className="text-slate-600" aria-hidden>
          •
        </span>
        <span>
          🚧 مسالك:{" "}
          <span className="tabular-nums text-amber-300">
            {stats.blockedTrails}
          </span>
        </span>
      </span>
    </div>
  );
}
