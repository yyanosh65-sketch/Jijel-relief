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
        className="flex min-h-[calc(100dvh-4rem)] flex-col bg-gradient-to-b from-slate-50 to-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-8">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            جيجل للتعافي
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            خريطة الإعمار ومنصة تنسيق الإغاثة في ولاية جيجل
          </p>
        </div>
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
    <main
      dir="rtl"
      className="min-h-[calc(100dvh-4rem)] bg-gradient-to-b from-slate-50 via-white to-emerald-50/40"
    >
      <div className="mx-auto max-w-6xl border-b border-slate-200/80 px-4 py-5">
        <h1
          className={`${displayHeadingClass} text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl`}
        >
          خريطة إعادة الإعمار بجيجل
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          احتياجات موثقة عبر بلديات ودواوير الولاية — ابحث، صفّي، وعاون وين
          تقدر.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-600">
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
    </main>
  );
}
