"use client";

import SiteNav from "@/components/SiteNav";
import FeedImporterButton from "@/components/admin/FeedImporterButton";
import AgentCopilot from "@/components/admin/AgentCopilot";
import SosAlertButton from "@/components/emergency/SosAlertButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import CharityInventoryNavButton from "@/components/charity/CharityInventoryNavButton";
import EmergencyAlertBanner from "@/components/layout/EmergencyAlertBanner";
import SpiritualHeaderTicker from "@/components/layout/SpiritualHeaderTicker";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header
        dir="rtl"
        className="sticky top-0 z-[2900] border-b border-slate-800/40 bg-slate-950/85 text-slate-100 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <SiteNav />
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-2 sm:border-t-0 sm:pt-0">
            <FeedImporterButton variant="navbar" />
            <RegisterConvoyButton variant="navbar" />
            <CharityInventoryNavButton />
            <RegisterHelperButton variant="navbar" />
          </div>
        </div>
      </header>
      <SpiritualHeaderTicker />
      <EmergencyAlertBanner />
      <main className="flex-1">{children}</main>
      <AgentCopilot />
      <SosAlertButton />
    </div>
  );
}
