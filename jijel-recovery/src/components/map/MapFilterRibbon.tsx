"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import {
  buildNeedSearchParams,
  SEARCH_CATEGORY_OPTIONS,
  URGENCY_FILTER_OPTIONS,
  type NeedSearchCategoryId,
  type NeedSearchFilters,
  type UrgencyFilterGroup,
} from "@/lib/need-search";
import { cn } from "@/lib/utils";

function toggleListValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

const URGENCY_GLOW: Record<
  UrgencyFilterGroup,
  { active: string; idle: string }
> = {
  critical: {
    active:
      "border-rose-400/60 bg-rose-500/25 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.45)]",
    idle: "border-white/10 bg-slate-950/60 text-slate-400 hover:border-rose-500/30 hover:text-rose-200",
  },
  medium: {
    active:
      "border-amber-400/60 bg-amber-500/20 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.4)]",
    idle: "border-white/10 bg-slate-950/60 text-slate-400 hover:border-amber-500/30 hover:text-amber-200",
  },
  low: {
    active:
      "border-emerald-400/60 bg-emerald-500/20 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.4)]",
    idle: "border-white/10 bg-slate-950/60 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-200",
  },
};

const CATEGORY_ACTIVE =
  "border-sky-400/50 bg-sky-500/20 text-sky-100 shadow-[0_0_14px_rgba(56,189,248,0.35)]";
const CATEGORY_IDLE =
  "border-white/10 bg-slate-950/60 text-slate-400 hover:border-sky-500/30 hover:text-sky-200";

type MapFilterRibbonProps = {
  className?: string;
  /** When true, renders inline (no fixed positioning) for MapTopHud stack */
  embedded?: boolean;
};

export default function MapFilterRibbon({
  className,
  embedded = false,
}: MapFilterRibbonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const filters = useNeedSearchFilters();

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

  const rail = (
    <div
      className={cn(
        "map-filter-rail flex w-full flex-nowrap items-center justify-start gap-1.5 overflow-x-auto py-1 md:justify-center",
        "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        embedded && "px-2",
      )}
      aria-label="تصفية سريعة"
    >
      {URGENCY_FILTER_OPTIONS.map((option) => {
        const isActive = filters.urgencyGroups.includes(option.id);
        const glow = URGENCY_GLOW[option.id];
        const shortLabel =
          option.id === "critical"
            ? "عاجل جداً"
            : option.id === "medium"
              ? "متوسط"
              : "عادي";

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
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide transition duration-200",
              isActive ? glow.active : glow.idle,
            )}
          >
            {shortLabel}
          </button>
        );
      })}

      <span
        aria-hidden
        className="mx-0.5 h-4 w-px shrink-0 self-center bg-white/10"
      />

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
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition duration-200",
              isActive ? CATEGORY_ACTIVE : CATEGORY_IDLE,
            )}
          >
            {option.labelAr}
          </button>
        );
      })}
    </div>
  );

  if (embedded) {
    return <div className={cn("w-full", className)}>{rail}</div>;
  }

  return (
    <div
      dir="rtl"
      className={cn("pointer-events-none fixed top-[4.75rem] inset-x-0 z-30", className)}
    >
      <div className="pointer-events-auto mx-auto max-w-2xl px-3">{rail}</div>
    </div>
  );
}
