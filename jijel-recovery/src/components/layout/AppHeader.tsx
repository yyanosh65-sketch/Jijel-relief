"use client";

import HeaderBrand from "@/components/layout/HeaderBrand";
import SiteNav from "@/components/SiteNav";
import FeedImporterButton from "@/components/admin/FeedImporterButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import CharityInventoryNavButton from "@/components/charity/CharityInventoryNavButton";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";

export default function AppHeader() {
  return (
    <header
      dir="rtl"
      className="sticky top-0 z-[2900] border-b border-slate-800/40 bg-slate-950/85 text-slate-100 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <HeaderBrand />
          <div className="flex flex-wrap items-center gap-2">
            <FeedImporterButton variant="navbar" />
            <RegisterConvoyButton variant="navbar" />
            <CharityInventoryNavButton />
            <RegisterHelperButton variant="navbar" />
          </div>
        </div>
        <SiteNav />
      </div>
    </header>
  );
}
