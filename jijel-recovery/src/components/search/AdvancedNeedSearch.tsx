"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LocateFixed, Search, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { RoadPassability } from "@/lib/intelligence";
import {
  buildNeedSearchParams,
  formatRadiusLabel,
  isGpsOutsideJijel,
  MAX_RADIUS_KM,
  parseNeedSearchParams,
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
import { cn } from "@/lib/utils";
import { glassPanelClass } from "@/lib/ui-labels";

function toggleListValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export default function AdvancedNeedSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseNeedSearchParams(searchParams),
    [searchParams],
  );

  const [isExpanded, setIsExpanded] = useState(true);
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

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

  return (
    <section
      dir="rtl"
      className={cn(
        glassPanelClass,
        "border-x-0 border-t-0 rounded-none shadow-md",
      )}
      aria-label="بحث متقدم عن الاحتياجات"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            بحث وتصفية الاحتياجات
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {isExpanded ? "إخفاء" : "إظهار"}
        </button>
      </div>

      {isExpanded ? (
        <div className="space-y-4 px-4 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="ابحث بالقرية، البلدية، الدائرة، أو عنوان الاحتياج..."
              className="min-h-11 w-full rounded-xl border border-zinc-300 bg-zinc-50 py-2 pl-3 pr-10 text-sm outline-none ring-red-200 focus:border-red-400 focus:ring-2"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-700">نوع الاحتياج</p>
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
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
              <p className="text-xs font-semibold text-zinc-700">درجة الإلحاح</p>
              <div className="flex flex-wrap gap-2">
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
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        isActive
                          ? "border-red-600 bg-red-50 text-red-800"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                      )}
                    >
                      {option.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-700">
                إمكانية الوصول بالطريق
              </p>
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
                          ? "border-amber-600 bg-amber-50 text-amber-900"
                          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                      )}
                    >
                      {option.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">
                البحث حسب المسافة
              </p>
              <button
                type="button"
                onClick={captureGps}
                disabled={isCapturingGps}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
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
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-600">
                <span>نطاق البحث</span>
                <span className="font-semibold text-emerald-700">
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
                className="h-2 w-full cursor-pointer accent-emerald-600"
                disabled={!hasGps}
              />
              <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
                <span>عرض كامل الولاية</span>
                <span>{MAX_RADIUS_KM} كم</span>
              </div>
              {hasGps ? (
                <button
                  type="button"
                  onClick={() =>
                    patchFilters({ radiusKm: SHOW_ALL_WILAYA_RADIUS })
                  }
                  className={cn(
                    "mt-2 w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    filters.radiusKm === SHOW_ALL_WILAYA_RADIUS
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                  )}
                >
                  عرض كامل الولاية
                </button>
              ) : null}
            </div>

            {gpsMessage ? (
              <p className="mt-2 text-xs text-zinc-600">{gpsMessage}</p>
            ) : null}

            {hasGps ? (
              <p className="mt-2 text-xs text-emerald-700">
                الموقع الحالي: {filters.userLat!.toFixed(4)},{" "}
                {filters.userLng!.toFixed(4)}
                {outsideJijel ? " — خارج جيجل" : ""}
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-700">
                فعّل GPS لاستخدام البحث بالمسافة والترتيب حسب الأقرب.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-700">ترتيب النتائج</p>
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
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300",
                    )}
                  >
                    {option.labelAr}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
