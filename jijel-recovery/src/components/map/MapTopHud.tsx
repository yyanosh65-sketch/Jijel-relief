"use client";

import Link from "next/link";
import { Menu, Search, Sparkles, X } from "lucide-react";
import { Suspense, useState } from "react";

import AdvancedNeedSearch from "@/components/search/AdvancedNeedSearch";
import HeaderBrand from "@/components/layout/HeaderBrand";
import MapFilterRibbon from "@/components/map/MapFilterRibbon";
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
  onOpenGlobalAgent?: () => void;
  onOpenAgroOlive?: () => void;
  onOpenAgroLivestock?: () => void;
};

export default function MapTopHud({
  showSearch = true,
  onOpenGlobalAgent,
  onOpenAgroOlive,
  onOpenAgroLivestock,
}: MapTopHudProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <div
      dir="rtl"
      className="pointer-events-none fixed top-3 inset-x-0 z-30 flex flex-col items-center gap-2 px-3"
    >
      {!isOnline ? (
        <div className="pointer-events-none w-full max-w-xl mx-auto">
          <div
            role="status"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/35 bg-slate-900/95 px-3 py-1 text-[11px] font-semibold text-amber-200 shadow-lg backdrop-blur-xl"
          >
            <span aria-hidden>🟠</span>
            <span className="truncate">
              وضع بدون إنترنت (بيانات مخزنة محلياً)
            </span>
          </div>
        </div>
      ) : null}

      {/* 1. Brand header */}
      <div className="pointer-events-auto w-full max-w-xl mx-auto">
        <header
          className={cn(
            "flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-1.5 shadow-2xl backdrop-blur-xl md:p-2",
            "h-11 md:h-auto",
          )}
        >
          <div className="min-w-0 flex-1 [&_img]:h-8 [&_img]:w-8 md:[&_img]:h-12 md:[&_img]:w-12">
            <div className="scale-90 origin-right md:scale-100 [&_p.text-base]:text-sm md:[&_p.text-base]:text-base">
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
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-100 transition hover:bg-slate-800 md:h-9 md:w-9"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {menuOpen ? (
          <div className="mt-2 space-y-3 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
            <SiteNav />
            <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
              {onOpenGlobalAgent ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenGlobalAgent();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-violet-500/40 bg-violet-600/20 px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-600/30"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  غرفة التوجيه الذكي (AI Copilot)
                </button>
              ) : null}
              <FeedImporterButton variant="navbar" />
              <RegisterConvoyButton variant="navbar" />
              <CharityInventoryNavButton />
              <RegisterHelperButton variant="navbar" />
              <Link
                href="/guide"
                className="rounded-full border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                دليل القوافل
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* 2. Search — always visible on md+, collapsible pill on mobile */}
      {showSearch ? (
        <div
          className={cn(
            "pointer-events-auto w-full max-w-md mx-auto shadow-xl",
            mobileSearchOpen ? "block" : "hidden md:block",
          )}
        >
          <Suspense fallback={null}>
            <AdvancedNeedSearch variant="embedded" />
          </Suspense>
        </div>
      ) : null}

      {/* 3. Filter ribbon */}
      <div className="pointer-events-auto w-full max-w-2xl mx-auto">
        <Suspense fallback={null}>
          <MapFilterRibbon
            embedded
            onOpenAgroOlive={onOpenAgroOlive}
            onOpenAgroLivestock={onOpenAgroLivestock}
          />
        </Suspense>
      </div>
    </div>
  );
}
