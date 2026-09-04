"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { MapNeed } from "@/actions/needs";
import { useWilayaOptional } from "@/components/map/WilayaProvider";
import { dispatchFlyToBounds } from "@/lib/map-fly-to";
import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import {
  getAllCommunes,
  getCommuneCoordinates,
  getVillagesByCommune,
} from "@/lib/locations";
import {
  buildNeedSearchParams,
  type NeedSearchFilters,
} from "@/lib/need-search";
import { DEFAULT_WILAYA, getWilayaDefinition } from "@/lib/wilaya";
import { cn } from "@/lib/utils";

type CommuneFilterBarProps = {
  needs: MapNeed[];
  className?: string;
  /** Merge chips into a parent flex scroll rail */
  stripOnly?: boolean;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function countOpenNeedsForCommune(
  needs: MapNeed[],
  communeName: string,
  communeAr: string,
): number {
  const keys = new Set([
    normalizeKey(communeName),
    normalizeKey(communeAr),
  ]);

  return needs.filter((need) => {
    if (need.status !== "open" && need.status !== "partial") return false;
    const locName = normalizeKey(need.location?.name ?? "");
    return keys.has(locName) || locName.includes(normalizeKey(communeName));
  }).length;
}

export default function CommuneFilterBar({
  needs,
  className,
  stripOnly = false,
}: CommuneFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const filters = useNeedSearchFilters();
  const wilayaCtx = useWilayaOptional();
  const wilaya = wilayaCtx?.wilaya ?? DEFAULT_WILAYA;

  const communes = useMemo(() => {
    const def = getWilayaDefinition(wilaya);
    if (wilaya !== "18_jijel") {
      return def.communes;
    }

    // Prefer live Jijel JSON coords when available
    const all = getAllCommunes();
    const byName = new Map(all.map((c) => [c.name, c]));
    return def.communes.map((entry) => {
      const found = byName.get(entry.name);
      return {
        name: entry.name,
        nameAr: found?.name_ar ?? entry.nameAr,
        lat: found?.lat ?? entry.lat,
        lng: found?.lng ?? entry.lng,
      };
    });
  }, [wilaya]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const commune of communes) {
      map.set(
        commune.name,
        countOpenNeedsForCommune(needs, commune.name, commune.nameAr),
      );
    }
    return map;
  }, [communes, needs]);

  function selectCommune(communeName: string) {
    const next: NeedSearchFilters = {
      ...filters,
      commune: filters.commune === communeName ? "" : communeName,
    };
    const params = buildNeedSearchParams(next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });

    const villages =
      wilaya === "18_jijel" ? getVillagesByCommune(communeName) : [];
    const center =
      wilaya === "18_jijel"
        ? getCommuneCoordinates(communeName)
        : communes.find((c) => c.name === communeName);

    const points =
      villages.length > 0
        ? villages.map((v) => ({ lat: v.lat, lng: v.lng }))
        : center
          ? [{ lat: center.lat, lng: center.lng }]
          : [];

    if (points.length > 0) {
      dispatchFlyToBounds({ points, maxZoom: 13 });
    }
  }

  return (
    <div
      className={cn(
        stripOnly
          ? "contents"
          : "map-filter-rail flex w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto py-0.5 md:justify-center scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="تصفية حسب البلدية"
      dir="rtl"
    >
      {communes.map((commune) => {
        const count = counts.get(commune.name) ?? 0;
        const active = filters.commune === commune.name;

        return (
          <button
            key={commune.name}
            type="button"
            onClick={() => selectCommune(commune.name)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold transition",
              active
                ? "border-sky-400/60 bg-sky-500/25 text-sky-50 shadow-[0_0_14px_rgba(56,189,248,0.35)]"
                : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-sky-500/30 hover:text-sky-100",
            )}
          >
            <span>{commune.nameAr}</span>
            <span
              className={cn(
                "rounded-full border px-1 py-px text-[9px] font-bold tabular-nums",
                count > 0
                  ? "border-rose-500/30 bg-rose-500/20 text-rose-300"
                  : "border-slate-600/50 bg-slate-800 text-slate-400",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
