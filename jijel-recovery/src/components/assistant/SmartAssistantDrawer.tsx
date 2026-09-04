"use client";

import MapInspectionShell from "@/components/map/MapInspectionShell";
import AmiRabahPanel from "@/components/assistant/AmiRabahPanel";
import { AMI_RABAH } from "@/lib/agent/ami-rabah-persona";

type SmartAssistantDrawerProps = {
  open: boolean;
  onClose: () => void;
  needId?: number | null;
  settlementId?: number | null;
  scope?: "field" | "wilaya";
};

/**
 * عمي رابح — branded smart assistant drawer (portaled via MapInspectionShell).
 */
export default function SmartAssistantDrawer({
  open,
  onClose,
  needId,
  settlementId,
  scope = "wilaya",
}: SmartAssistantDrawerProps) {
  return (
    <MapInspectionShell
      open={open}
      onClose={onClose}
      titleId="ami-rabah-title"
      initialSnap="expanded"
      peekOnMapClick
    >
      <header className="mb-4">
        <div className="flex items-start gap-3">
          <span
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-950/80 to-slate-900 text-2xl shadow-lg shadow-amber-950/40"
            aria-hidden
          >
            {AMI_RABAH.avatar}
            <span className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px]">
              {AMI_RABAH.scout}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="ami-rabah-title"
              className="text-base font-bold leading-snug text-white"
            >
              {AMI_RABAH.fullTitleAr}
            </h2>
            <p className="mt-1 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              {AMI_RABAH.statusAr}
            </p>
          </div>
        </div>
      </header>

      <AmiRabahPanel
        scope={scope}
        needId={needId}
        settlementId={settlementId}
      />
    </MapInspectionShell>
  );
}
