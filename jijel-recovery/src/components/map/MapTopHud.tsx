"use client";

import Link from "next/link";
import { Menu, Search, Sparkles, X } from "lucide-react";
import { Suspense, useState } from "react";

import type { MapNeed } from "@/actions/needs";
import AdvancedNeedSearch from "@/components/search/AdvancedNeedSearch";
import HeaderBrand from "@/components/layout/HeaderBrand";
import CommuneFilterBar from "@/components/map/CommuneFilterBar";
import MacroSummaryRibbon from "@/components/map/MacroSummaryRibbon";
import MapFilterRibbon from "@/components/map/MapFilterRibbon";
import WilayaSwitcher from "@/components/map/WilayaSwitcher";
import PushSubscriptionBtn from "@/components/notifications/PushSubscriptionBtn";
import SiteNav from "@/components/SiteNav";
import FeedImporterButton from "@/components/admin/FeedImporterButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import CharityInventoryNavButton from "@/components/charity/CharityInventoryNavButton";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";

type MapTopHudProps = {
  showSearch?: boolean;
  needs?: MapNeed[];
  onOpenGlobalAgent?: () => void;
  onOpenAgroOlive?: () => void;
  onOpenAgroLivestock?: () => void;
  onOpenVolunteerRegister?: () => void;
};

/**
 * Compact top HUD: header + ticker + one swipeable filter rail.
 * Keeps the floating stack short so ~75–80% of mobile viewport stays map.
 */
export default function MapTopHud({
  showSearch = true,
  needs = [],
  onOpenGlobalAgent,
  onOpenAgroOlive,
  onOpenAgroLivestock,
  onOpenVolunteerRegister,
}: MapTopHudProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <div
      dir="rtl"
      className="pointer-events-none fixed top-2 inset-x-0 z-[45] flex max-h-[22dvh] flex-col items-center gap-1 overflow-visible px-2 sm:max-h-none sm:top-3 sm:gap-1.5 sm:px-3"
    >
      {!isOnline ? (
        <div className="pointer-events-none w-full max-w-xl mx-auto shrink-0">
          <div
            role="status"
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-500/35 bg-slate-900/95 px-2.5 py-0.5 text-[10px] font-semibold text-amber-200 shadow-lg backdrop-blur-xl"
          >
            <span aria-hidden>🟠</span>
            <span className="truncate">وضع بدون إنترنت</span>
          </div>
        </div>
      ) : null}

      {/* Header + macro ticker (single card) */}
      <div className="pointer-events-auto w-full max-w-xl mx-auto shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl">
        <header className="flex h-12 max-h-14 items-center justify-between gap-1.5 px-1.5 py-1 my-0 md:h-12">
          <div className="min-w-0 flex-1 [&_img]:h-7 [&_img]:w-7 md:[&_img]:h-9 md:[&_img]:w-9">
            <div className="origin-right scale-[0.85] md:scale-95 [&_p.text-base]:text-sm [&_p.mt-0\.5]:hidden">
              <HeaderBrand />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {showSearch ? (
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-100 transition hover:bg-slate-800 md:hidden"
                aria-label={mobileSearchOpen ? "إخفاء البحث" : "فتح البحث"}
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen((open) => !open)}
              >
                {mobileSearchOpen ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </button>
            ) : null}
            <div className="hidden sm:block">
              <PushSubscriptionBtn />
            </div>
            {onOpenGlobalAgent ? (
              <button
                type="button"
                onClick={onOpenGlobalAgent}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-600/25 text-emerald-100 transition hover:bg-emerald-600/35 sm:w-auto sm:gap-1 sm:px-2"
                aria-label="غرفة التوجيه الذكي"
                title="غرفة التوجيه الذكي"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline text-[10px] font-bold">AI</span>
              </button>
            ) : null}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-100 transition hover:bg-slate-800"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </header>

        <WilayaSwitcher className="border-t border-white/5" />

        <MacroSummaryRibbon />

        {menuOpen ? (
          <div className="max-h-[40dvh] space-y-2 overflow-y-auto border-t border-white/5 p-2.5 sm:max-h-none">
            <SiteNav />
            <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
              {onOpenGlobalAgent ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenGlobalAgent();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-1.5 text-xs font-semibold text-violet-100 hover:bg-violet-600/30"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  غرفة التوجيه الذكي
                </button>
              ) : null}
              <FeedImporterButton variant="navbar" />
              <RegisterConvoyButton variant="navbar" />
              <CharityInventoryNavButton />
              <RegisterHelperButton variant="navbar" />
              {onOpenVolunteerRegister ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenVolunteerRegister();
                  }}
                  className="rounded-full border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/50"
                >
                  🚙 تسجيل أسطول / متطوعين
                </button>
              ) : null}
              <Link
                href="/guide"
                className="rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                دليل القوافل
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {showSearch ? (
        <div
          className={cn(
            "pointer-events-auto w-full max-w-md mx-auto shrink-0 shadow-xl",
            mobileSearchOpen ? "block" : "hidden md:block",
          )}
        >
          <Suspense fallback={null}>
            <AdvancedNeedSearch variant="embedded" />
          </Suspense>
        </div>
      ) : null}

      {/* Unified commune + urgency/tag swipe rail */}
      <div className="pointer-events-auto w-full max-w-2xl shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 shadow-lg backdrop-blur-xl">
        <div
          className={cn(
            "flex max-h-9 flex-nowrap items-center gap-1 overflow-x-auto px-1.5 py-0.5",
            "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          <Suspense fallback={null}>
            <CommuneFilterBar needs={needs} stripOnly />
          </Suspense>
          <span
            aria-hidden
            className="mx-0.5 h-3.5 w-px shrink-0 self-center bg-white/15"
          />
          <Suspense fallback={null}>
            <MapFilterRibbon
              embedded
              stripOnly
              onOpenAgroOlive={onOpenAgroOlive}
              onOpenAgroLivestock={onOpenAgroLivestock}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
