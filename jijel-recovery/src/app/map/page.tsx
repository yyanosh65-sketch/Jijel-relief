import { Suspense } from "react";

import { getMapIntelligence } from "@/actions/intelligence";
import { getMapNeeds } from "@/actions/needs";
import ReconstructionMapLoader from "@/components/map/ReconstructionMapLoader";

export default async function MapPage() {
  const [needsResult, intelligenceResult] = await Promise.all([
    getMapNeeds(),
    getMapIntelligence(),
  ]);

  if (!needsResult.success || !intelligenceResult.success) {
    return (
      <main
        dir="rtl"
        className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center"
      >
        <h1 className="text-lg font-semibold text-white">إغاثة جيجل</h1>
        <p className="mt-2 text-sm text-red-400">
          {needsResult.error ??
            intelligenceResult.error ??
            "تعذر تحميل بيانات الخريطة."}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          تأكد من تشغيل قاعدة البيانات المحلية.
        </p>
      </main>
    );
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
