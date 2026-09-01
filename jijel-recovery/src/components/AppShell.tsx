"use client";

import SiteNav from "@/components/SiteNav";
import FeedImporterButton from "@/components/admin/FeedImporterButton";
import SosAlertButton from "@/components/emergency/SosAlertButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        dir="rtl"
        className="sticky top-0 z-[2900] border-b border-slate-200/80 bg-white/90 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SiteNav />
          <div className="flex flex-wrap items-center gap-2">
            <FeedImporterButton variant="navbar" />
            <RegisterConvoyButton variant="navbar" />
            <RegisterHelperButton variant="navbar" />
          </div>
        </div>
      </header>
      {children}
      <SosAlertButton />
    </>
  );
}
