import { Suspense } from "react";

import { getMapIntelligence } from "@/actions/intelligence";
import { getMapNeeds } from "@/actions/needs";
import ReconstructionMapLoader from "@/components/map/ReconstructionMapLoader";
import { displayHeadingClass } from "@/lib/ui-labels";

export default async function HomePage() {
  const [needsResult, intelligenceResult] = await Promise.all([
    getMapNeeds(),
    getMapIntelligence(),
  ]);

  if (!needsResult.success || !intelligenceResult.success) {
    return (
      <main
        dir="rtl"
        className="flex min-h-[calc(100dvh-4rem)] flex-col bg-slate-950"
      >
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            جيجل للتعافي
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            خريطة الإعمار ومنصة تنسيق الإغاثة في ولاية جيجل
          </p>
        </div>
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
      <header className="shrink-0 border-b border-slate-800/80 bg-slate-950 px-4 py-4">
        <div className="mx-auto max-w-6xl">
          <h1
            className={`${displayHeadingClass} text-2xl font-bold tracking-tight text-white sm:text-3xl`}
          >
            خريطة إعادة الإعمار بجيجل
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            احتياجات موثقة عبر بلديات ودواوير الولاية — ابحث، صفّي، وعاون وين
            تقدر.
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-400">
              جاري تحميل البحث والخريطة...
            </div>
          }
        >
          <ReconstructionMapLoader
            layout="stacked"
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
