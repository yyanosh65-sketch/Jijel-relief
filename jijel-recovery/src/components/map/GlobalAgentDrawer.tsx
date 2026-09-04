"use client";

import { Bot } from "lucide-react";

import MapInspectionShell from "@/components/map/MapInspectionShell";
import SmartDispatchAgent from "@/components/map/SmartDispatchAgent";

type GlobalAgentDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export default function GlobalAgentDrawer({
  open,
  onClose,
}: GlobalAgentDrawerProps) {
  return (
    <MapInspectionShell
      open={open}
      onClose={onClose}
      titleId="global-agent-title"
    >
      <header className="mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
            <Bot className="h-4 w-4" />
          </span>
          <div>
            <h2
              id="global-agent-title"
              className="text-base font-bold text-white"
            >
              مساعد الإغاثة
            </h2>
            <p className="text-xs text-slate-400">
              غرفة التوجيه الذكي — ملخص ولائي شامل بدون نقطة محددة
            </p>
          </div>
        </div>
      </header>

      <SmartDispatchAgent scope="wilaya" />
    </MapInspectionShell>
  );
}
