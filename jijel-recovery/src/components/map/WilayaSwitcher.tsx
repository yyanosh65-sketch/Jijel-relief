"use client";

import { usePathname, useRouter } from "next/navigation";

import { useWilaya } from "@/components/map/WilayaProvider";
import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import { buildNeedSearchParams } from "@/lib/need-search";
import { WILAYA_CODES, WILAYA_DEFINITIONS } from "@/lib/wilaya";
import { cn } from "@/lib/utils";

type WilayaSwitcherProps = {
  className?: string;
};

/** Compact [18 جيجل | 06 بجاية | 21 سكيكدة | 19 سطيف] regional toggle. */
export default function WilayaSwitcher({ className }: WilayaSwitcherProps) {
  const { wilaya, setWilaya } = useWilaya();
  const filters = useNeedSearchFilters();
  const router = useRouter();
  const pathname = usePathname();

  function selectWilaya(code: typeof wilaya) {
    setWilaya(code);
    if (filters.commune) {
      const params = buildNeedSearchParams({ ...filters, commune: "" });
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  }

  return (
    <div
      dir="rtl"
      role="group"
      aria-label="اختيار الولاية"
      className={cn(
        "flex w-full flex-nowrap items-center gap-0.5 overflow-x-auto px-1.5 py-1",
        "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {WILAYA_CODES.map((code) => {
        const def = WILAYA_DEFINITIONS[code];
        const active = wilaya === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => selectWilaya(code)}
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold transition",
              active
                ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-50 shadow-[0_0_12px_rgba(16,185,129,0.35)]"
                : "border-white/10 bg-slate-950/50 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-100",
            )}
          >
            {def.labelPillAr}
          </button>
        );
      })}
    </div>
  );
}
