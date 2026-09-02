"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import type { RoadPassability } from "@/lib/intelligence";
import { getCommunesByDaira, getDairas } from "@/lib/locations";
import {
  buildNeedSearchParams,
  formatRadiusLabel,
  isGpsOutsideJijel,
  MAX_RADIUS_KM,
  ROAD_ACCESS_OPTIONS,
  SEARCH_CATEGORY_OPTIONS,
  SHOW_ALL_WILAYA_RADIUS,
  SORT_OPTIONS,
  URGENCY_FILTER_OPTIONS,
  type NeedSearchCategoryId,
  type NeedSearchFilters,
  type NeedSortOption,
  type UrgencyFilterGroup,
} from "@/lib/need-search";
import { Z_MAP_FLOATING } from "@/lib/z-index";
import { cn } from "@/lib/utils";

function toggleListValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

type AdvancedNeedSearchProps = {
  variant?: "floating" | "panel";
  className?: string;
};

export default function AdvancedNeedSearch({
  variant = "floating",
  className,
}: AdvancedNeedSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const filters = useNeedSearchFilters();

  const [isExpanded, setIsExpanded] = useState(false);
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  const communeOptions = useMemo(
    () =>
      getDairas().flatMap((daira) =>
        getCommunesByDaira(daira.name).map((commune) => ({
          value: commune.name,
          label: commune.name_ar,
        })),
      ),
    [],
  );

  useEffect(() => {
    setQueryDraft(filters.query);
  }, [filters.query]);

  const replaceFilters = useCallback(
    (next: NeedSearchFilters) => {
      const params = buildNeedSearchParams(next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const patchFilters = useCallback(
    (patch: Partial<NeedSearchFilters>) => {
      replaceFilters({ ...filters, ...patch });
    },
    [filters, replaceFilters],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (queryDraft === filters.query) {
        return;
      }

      patchFilters({ query: queryDraft });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filters.query, patchFilters, queryDraft]);

  const captureGps = useCallback(() => {
    setIsCapturingGps(true);
    setGpsMessage(null);

    if (!navigator.geolocation) {
      setGpsMessage("المتصفح لا يدعم تحديد الموقع.");
      setIsCapturingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const outsideJijel = isGpsOutsideJijel(userLat, userLng);

        patchFilters({
          userLat,
          userLng,
          radiusKm: outsideJijel ? SHOW_ALL_WILAYA_RADIUS : filters.radiusKm,
        });
        setGpsMessage(
          outsideJijel
            ? "موقعك خارج ولاية جيجل — تم ضبط العرض على كامل الولاية."
            : "تم تحديد موقعك — يمكنك ضبط نطاق البحث بالمسافة.",
        );
        setIsCapturingGps(false);
      },
      () => {
        setGpsMessage("تعذر الوصول إلى GPS — جرّب السماح بالموقع.");
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [patchFilters, filters.radiusKm]);

  const hasRequestedGps = useRef(false);

  useEffect(() => {
    if (hasRequestedGps.current) {
      return;
    }

    if (filters.userLat !== null && filters.userLng !== null) {
      return;
    }

    hasRequestedGps.current = true;
    captureGps();
  }, [captureGps, filters.userLat, filters.userLng]);

  const hasGps =
    filters.userLat !== null &&
    filters.userLng !== null &&
    !Number.isNaN(filters.userLat) &&
    !Number.isNaN(filters.userLng);

  const outsideJijel =
    hasGps && isGpsOutsideJijel(filters.userLat!, filters.userLng!);

  const pillClass =
    "rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-white shadow-2xl backdrop-blur-md";

  const expandedPanel = isExpanded ? (
    <div className="mt-2 space-y-4 rounded-2xl border border-slate-800/80 bg-slate-950/95 p-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-300">نوع الاحتياج</p>
        <div className="flex flex-wrap gap-2">
          {SEARCH_CATEGORY_OPTIONS.map((option) => {
            const isActive = filters.categories.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  patchFilters({
                    categories: toggleListValue(
                      filters.categories,
                      option.id,
                    ) as NeedSearchCategoryId[],
                  })
                }
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "border-emerald-500 bg-emerald-600/20 text-emerald-100"
                    : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600",
                )}
              >
                {option.labelAr}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">إمكانية الوصول</p>
          <div className="flex flex-wrap gap-2">
            {ROAD_ACCESS_OPTIONS.map((option) => {
              const isActive = filters.roadAccess.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    patchFilters({
                      roadAccess: toggleListValue(
                        filters.roadAccess,
                        option.id,
                      ) as RoadPassability[],
                    })
                  }
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    isActive
                      ? "border-amber-500 bg-amber-500/15 text-amber-100"
                      : "border-slate-700 bg-slate-900 text-slate-400",
                  )}
                >
                  {option.labelAr}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300">ترتيب النتائج</p>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => {
              const isActive = filters.sort === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    patchFilters({ sort: option.id as NeedSortOption })
                  }
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-medium transition",
                    isActive
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-400",
                  )}
                >
                  {option.labelAr}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-100">البحث حسب المسافة</p>
          <button
            type="button"
            onClick={captureGps}
            disabled={isCapturingGps}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-60"
          >
            {isCapturingGps ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <LocateFixed className="h-3.5 w-3.5" />
            )}
            تحديث موقعي
          </button>
        </div>

        <div className="mt-3">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>نطاق البحث</span>
            <span className="font-semibold text-emerald-300">
              {formatRadiusLabel(filters.radiusKm)}
            </span>
          </div>
          <input
            type="range"
            min={SHOW_ALL_WILAYA_RADIUS}
            max={MAX_RADIUS_KM}
            step={1}
            value={filters.radiusKm}
            onChange={(event) =>
              patchFilters({ radiusKm: Number(event.target.value) })
            }
            className="h-2 w-full cursor-pointer accent-emerald-500"
            disabled={!hasGps}
          />
        </div>

        {gpsMessage ? (
          <p className="mt-2 text-xs text-slate-400">{gpsMessage}</p>
        ) : null}
      </div>
    </div>
  ) : null;

  if (variant === "panel") {
    return (
      <section
        dir="rtl"
        className={cn(
          "border-b border-slate-800/80 bg-slate-950/90 px-4 py-3",
          className,
        )}
        aria-label="بحث متقدم عن الاحتياجات"
      >
        <div className={pillClass}>{renderToolbar()}</div>
        {expandedPanel}
      </section>
    );
  }

  function renderToolbar() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="ابحث بالقرية أو البلدية..."
            className="min-h-9 w-full rounded-xl border border-slate-700 bg-slate-950/80 py-1.5 pl-3 pr-9 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>

        <select
          value={filters.commune}
          onChange={(event) => patchFilters({ commune: event.target.value })}
          className="min-h-9 max-w-[160px] rounded-xl border border-slate-700 bg-slate-950/80 px-2 text-xs font-semibold text-slate-100 focus:border-emerald-500/50 focus:outline-none"
        >
          <option value="">كل البلديات</option>
          {communeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="flex flex-wrap gap-1.5">
          {URGENCY_FILTER_OPTIONS.map((option) => {
            const isActive = filters.urgencyGroups.includes(option.id);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  patchFilters({
                    urgencyGroups: toggleListValue(
                      filters.urgencyGroups,
                      option.id,
                    ) as UrgencyFilterGroup[],
                  })
                }
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                  isActive
                    ? option.id === "critical"
                      ? "bg-rose-600/90 text-white"
                      : "bg-emerald-600/90 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                )}
              >
                {option.id === "critical"
                  ? "عاجل جداً"
                  : option.id === "medium"
                    ? "متوسط"
                    : "عادي"}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isExpanded ? "إخفاء" : "المزيد"}
        </button>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-3 px-3 sm:top-4 sm:px-4",
        Z_MAP_FLOATING,
        className,
      )}
      aria-label="بحث وتصفية الاحتياجات"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-5xl">
        <div className={pillClass}>{renderToolbar()}</div>
        {expandedPanel}
        {outsideJijel ? (
          <p className="mt-1 text-center text-[10px] text-amber-300/90">
            موقعك خارج جيجل — العرض على كامل الولاية
          </p>
        ) : null}
      </div>
    </div>
  );
}
