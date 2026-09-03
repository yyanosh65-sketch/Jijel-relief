import { Suspense } from "react";

import { getMapIntelligence } from "@/actions/intelligence";
import { getMapNeeds } from "@/actions/needs";
import OfflineMapRecovery from "@/components/map/OfflineMapRecovery";
import ReconstructionMapLoader from "@/components/map/ReconstructionMapLoader";

export default async function HomePage() {
  const [needsResult, intelligenceResult] = await Promise.all([
    getMapNeeds(),
    getMapIntelligence(),
  ]);

  if (!needsResult.success || !intelligenceResult.success) {
    return <OfflineMapRecovery />;
  }

  return (
    <main dir="rtl" className="relative h-dvh overflow-hidden bg-slate-950">
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-sm text-slate-400">
            جاري تحميل الخريطة...
          </div>
        }
      >
        <ReconstructionMapLoader
          fullViewportMap
          needs={needsResult.data ?? []}
          intelligence={
            intelligenceResult.data ?? {
              villagePins: [],
              facilities: [],
              roads: [],
              sosAlerts: [],
              waypoints: [],
            }
          }
        />
      </Suspense>
    </main>
  );
}
