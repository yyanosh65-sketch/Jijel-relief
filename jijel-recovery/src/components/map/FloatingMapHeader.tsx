"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

import HeaderBrand from "@/components/layout/HeaderBrand";
import PushSubscriptionBtn from "@/components/notifications/PushSubscriptionBtn";
import SiteNav from "@/components/SiteNav";
import FeedImporterButton from "@/components/admin/FeedImporterButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import CharityInventoryNavButton from "@/components/charity/CharityInventoryNavButton";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";
import { Z_MAP_FLOATING } from "@/lib/z-index";
import { cn } from "@/lib/utils";

export default function FloatingMapHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      dir="rtl"
      className={cn(
        "pointer-events-none fixed top-3 inset-x-3 z-30 mx-auto max-w-lg",
        Z_MAP_FLOATING,
      )}
    >
      <header className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-2 shadow-2xl backdrop-blur-xl">
        <div className="min-w-0 flex-1 scale-90 origin-right sm:scale-100">
          <HeaderBrand />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <PushSubscriptionBtn />
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/80 text-slate-100 transition hover:bg-slate-800"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="pointer-events-auto mt-2 space-y-3 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-xl">
          <SiteNav />
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
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
  );
}
