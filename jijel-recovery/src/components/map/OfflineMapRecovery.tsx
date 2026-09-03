"use client";

import { useEffect, useState } from "react";

import type { MapIntelligenceData } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import ReconstructionMapLoader from "@/components/map/ReconstructionMapLoader";
import { getMeshRecord } from "@/lib/offline-storage";

const EMPTY_INTELLIGENCE: MapIntelligenceData = {
  villagePins: [],
  facilities: [],
  roads: [],
  sosAlerts: [],
  waypoints: [],
};

/**
 * Client recovery when SSR map data failed — hydrate from IndexedDB mesh cache.
 */
export default function OfflineMapRecovery() {
  const [needs, setNeeds] = useState<MapNeed[] | null>(null);
  const [intelligence, setIntelligence] = useState<MapIntelligenceData | null>(
    null,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const mesh = await getMeshRecord();
      if (cancelled) return;

      if (mesh?.needs?.length || mesh?.settlements?.length) {
        setNeeds((mesh.needs as MapNeed[]) ?? []);
        const intel =
          (mesh.intelligence as MapIntelligenceData | undefined) ??
          EMPTY_INTELLIGENCE;
        setIntelligence({
          ...EMPTY_INTELLIGENCE,
          ...intel,
          villagePins:
            intel.villagePins?.length > 0
              ? intel.villagePins
              : ((mesh.settlements as MapIntelligenceData["villagePins"]) ??
                []),
        });
      }
      setReady(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main
        dir="rtl"
        className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center"
      >
        <p className="text-sm text-slate-400">جاري استرجاع البيانات المحلية…</p>
      </main>
    );
  }

  if (!needs || !intelligence) {
    return (
      <main
        dir="rtl"
        className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 px-6 text-center"
      >
        <h1 className="text-2xl font-bold text-white">إغاثة جيجل</h1>
        <p className="mt-2 text-sm text-amber-300">
          🟠 وضع بدون إنترنت — لا توجد بيانات مخزّنة محلياً بعد.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          افتح الخريطة مرة وأنت متصل لتخزين الشبكة والمسالك محلياً.
        </p>
      </main>
    );
  }

  return (
    <main dir="rtl" className="relative h-dvh overflow-hidden bg-slate-950">
      <ReconstructionMapLoader
        fullViewportMap
        needs={needs}
        intelligence={intelligence}
      />
    </main>
  );
}
