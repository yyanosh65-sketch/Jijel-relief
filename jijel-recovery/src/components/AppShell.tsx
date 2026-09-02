"use client";

import AgentCopilot from "@/components/admin/AgentCopilot";
import SosAlertButton from "@/components/emergency/SosAlertButton";
import AppHeader from "@/components/layout/AppHeader";
import EmergencyAlertBanner from "@/components/layout/EmergencyAlertBanner";
import SpiritualHeaderTicker from "@/components/layout/SpiritualHeaderTicker";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader />
      <SpiritualHeaderTicker />
      <EmergencyAlertBanner />
      <main className="flex-1">{children}</main>
      <AgentCopilot />
      <SosAlertButton />
    </div>
  );
}
