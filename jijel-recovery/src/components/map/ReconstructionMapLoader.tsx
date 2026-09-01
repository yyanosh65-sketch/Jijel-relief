"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import type { MapIntelligenceData } from "@/actions/intelligence";
import { getVillageDossier } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import AdvancedNeedSearch from "@/components/search/AdvancedNeedSearch";
import NeedCard from "@/components/needs/NeedCard";
import VillageDossierDrawer from "@/components/map/VillageDossierDrawer";
import PledgeModal from "@/components/pledges/PledgeModal";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import { getDossierById, getNearbyFacilities } from "@/lib/intelligence";
import {
  filterAndSortNeeds,
  parseNeedSearchParams,
} from "@/lib/need-search";

const ReconstructionMap = dynamic(() => import("./ReconstructionMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-600">
      جاري تحميل الخريطة...
    </div>
  ),
});

type ReconstructionMapLoaderProps = {
  needs: MapNeed[];
  intelligence: MapIntelligenceData;
};

export default function ReconstructionMapLoader({
  needs,
  intelligence,
}: ReconstructionMapLoaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = useMemo(
    () => parseNeedSearchParams(searchParams),
    [searchParams],
  );
  const filteredNeeds = useMemo(
    () => filterAndSortNeeds(needs, filters, intelligence),
    [filters, intelligence, needs],
  );
  const [selectedNeed, setSelectedNeed] = useState<MapNeed | null>(null);
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<VillageDossier | null>(
    null,
  );
  const [dossierFacilities, setDossierFacilities] = useState<
    EmergencyFacility[]
  >([]);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  function openPledgeModal(need: MapNeed) {
    setSelectedNeed(need);
    setIsPledgeModalOpen(true);
  }

  function closePledgeModal() {
    setIsPledgeModalOpen(false);
    setSelectedNeed(null);
  }

  async function openVillageDossier(dossierId: string) {
    const localDossier = getDossierById(dossierId);

    if (localDossier) {
      setSelectedDossier(localDossier);
      setDossierFacilities(getNearbyFacilities(localDossier));
      setIsDossierOpen(true);
      return;
    }

    const result = await getVillageDossier(dossierId);

    if (result.success && result.data) {
      setSelectedDossier(result.data.dossier);
      setDossierFacilities(result.data.facilities);
      setIsDossierOpen(true);
    }
  }

  function closeDossier() {
    setIsDossierOpen(false);
    setSelectedDossier(null);
    setDossierFacilities([]);
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <AdvancedNeedSearch />

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="h-[55vh] flex-1 lg:h-full">
          <ReconstructionMap
            needs={filteredNeeds}
            intelligence={intelligence}
            selectedNeedId={selectedNeed?.id ?? null}
            onPledgeClick={openPledgeModal}
            onPledgeSuccess={() => router.refresh()}
            onVillageClick={openVillageDossier}
          />
        </div>

        <aside className="flex h-[45vh] flex-col border-t border-zinc-200 bg-zinc-50 lg:h-full lg:w-96 lg:border-t-0 lg:border-l">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">
              الحاجيات المسجلة — Besoins vérifiés
            </h2>
            <p className="text-xs text-zinc-500">
              {filteredNeeds.length} من {needs.length} احتياج
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {filteredNeeds.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-6 text-center text-sm text-zinc-500">
                لا توجد نتائج مطابقة — جرّب توسيع نطاق البحث أو تعديل الفلاتر.
              </p>
            ) : null}
            {filteredNeeds.map((need) => (
              <NeedCard
                key={need.id}
                need={need}
                isSelected={selectedNeed?.id === need.id}
                onPledge={openPledgeModal}
              />
            ))}
          </div>
        </aside>
        </div>
      </div>

      <PledgeModal
        need={selectedNeed}
        open={isPledgeModalOpen}
        onClose={closePledgeModal}
        onSuccess={() => router.refresh()}
      />

      <VillageDossierDrawer
        dossier={selectedDossier}
        facilities={dossierFacilities}
        open={isDossierOpen}
        onClose={closeDossier}
      />
    </>
  );
}
