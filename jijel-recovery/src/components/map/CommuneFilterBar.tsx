"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { MapNeed } from "@/actions/needs";
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
import { cn } from "@/lib/utils";

/** Priority relief-belt communes shown in the horizontal filter strip */
const PRIORITY_COMMUNE_NAMES = [
  "Texenna",
  "El Ancer",
  "Taher",
  "El Milia",
  "Djimla",
  "Ouled Rabah",
  "Settara",
  "Sidi Maarouf",
  "Chekfa",
  "Ziama Mansouriah",
] as const;

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

  const communes = useMemo(() => {
    const all = getAllCommunes();
    const byName = new Map(all.map((c) => [c.name, c]));
    return PRIORITY_COMMUNE_NAMES.map((name) => {
      const found = byName.get(name);
      return {
        name,
        nameAr: found?.name_ar ?? name,
        lat: found?.lat,
        lng: found?.lng,
      };
    }).filter((c) => c.lat != null && c.lng != null);
  }, []);

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

    const villages = getVillagesByCommune(communeName);
    const center = getCommuneCoordinates(communeName);
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
