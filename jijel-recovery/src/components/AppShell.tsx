"use client";

import { usePathname } from "next/navigation";

import AgentCopilot from "@/components/admin/AgentCopilot";
import SosAlertButton from "@/components/emergency/SosAlertButton";
import AppHeader from "@/components/layout/AppHeader";
import EmergencyAlertBanner from "@/components/layout/EmergencyAlertBanner";
import SpiritualHeaderTicker from "@/components/layout/SpiritualHeaderTicker";
import { cn } from "@/lib/utils";

function isMapExperiencePath(pathname: string) {
  return pathname === "/" || pathname === "/map";
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mapExperience = isMapExperiencePath(pathname);

  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col",
        mapExperience && "relative overflow-hidden",
      )}
    >
      {mapExperience ? null : (
        <>
          <AppHeader />
          <SpiritualHeaderTicker />
        </>
      )}
      <EmergencyAlertBanner floating={mapExperience} />
      <main className={cn("flex-1", mapExperience && "relative min-h-0")}>
        {children}
      </main>
      {mapExperience ? null : (
        <>
          <AgentCopilot />
          <SosAlertButton />
        </>
      )}
    </div>
  );
}
