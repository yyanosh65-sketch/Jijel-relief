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
      <main dir="rtl" className="flex h-dvh flex-col bg-slate-950">
        <header className="border-b border-slate-800/80 bg-slate-950 px-4 py-4">
          <h1 className="text-lg font-semibold text-white">
            خريطة إعادة الإعمار بجيجل
          </h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-400">
            {needsResult.error ??
              intelligenceResult.error ??
              "تعذر تحميل بيانات الخريطة."}
          </p>
          <p className="text-xs text-slate-400">
            تأكد من تشغيل قاعدة البيانات المحلية.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="map-viewport-shell bg-slate-950">
      <header className="shrink-0 border-b border-slate-800/80 bg-slate-950 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            خريطة إعادة الإعمار بجيجل
          </h1>
          <p className="text-sm text-slate-300">
            احتياجات موثقة عبر بلديات ودواوير ولاية جيجل — عاون وين تقدر
          </p>
        </div>
      </header>
      <div className="map-viewport-canvas min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400">
              جاري تحميل البحث والخريطة...
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
      </div>
    </main>
  );
}
