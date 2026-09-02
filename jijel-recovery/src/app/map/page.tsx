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
      <main dir="rtl" className="flex h-dvh flex-col bg-gradient-to-b from-slate-50 to-white">
        <header className="border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-md">
          <h1 className="text-lg font-semibold text-slate-900">
            خريطة إعادة الإعمار بجيجل
          </h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-sm text-red-600">
            {needsResult.error ??
              intelligenceResult.error ??
              "تعذر تحميل بيانات الخريطة."}
          </p>
          <p className="text-xs text-slate-500">
            تأكد من تشغيل قاعدة البيانات المحلية.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="dashboard-page flex flex-1 flex-col">
      <header className="border-b border-slate-800/80 bg-slate-950/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            خريطة إعادة الإعمار بجيجل
          </h1>
          <p className="text-sm text-slate-400">
            احتياجات موثقة عبر بلديات ودواوير ولاية جيجل — عاون وين تقدر
          </p>
        </div>
      </header>
      <div className="flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-zinc-50 text-sm text-zinc-600">
              جاري تحميل البحث والخريطة...
            </div>
          }
        >
          <ReconstructionMapLoader
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
