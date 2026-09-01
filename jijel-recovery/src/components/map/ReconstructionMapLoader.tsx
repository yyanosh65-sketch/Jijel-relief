"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { MapIntelligenceData } from "@/actions/intelligence";
import { getVillageDossier } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import AdvancedNeedSearch from "@/components/search/AdvancedNeedSearch";
import RegisterHelperButton from "@/components/helpers/RegisterHelperButton";
import RegisterConvoyButton from "@/components/convoys/RegisterConvoyButton";
import NeedCard from "@/components/needs/NeedCard";
import VillageDossierDrawer from "@/components/map/VillageDossierDrawer";
import PledgeModal from "@/components/pledges/PledgeModal";
import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import { getDossierById, getNearbyFacilities } from "@/lib/intelligence";
import { filterAndSortNeeds } from "@/lib/need-search";
import { glassPanelClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

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
  layout?: "sidebar" | "stacked";
};

export default function ReconstructionMapLoader({
  needs,
  intelligence,
  layout = "sidebar",
}: ReconstructionMapLoaderProps) {
  const router = useRouter();
  const filters = useNeedSearchFilters();
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

  const needsListHeader = (
    <div className="border-b border-slate-200/80 px-4 py-3">
      <h2 className="text-sm font-semibold text-slate-900">
        حاجيات موثقة
      </h2>
      <p className="text-xs text-slate-500">
        {filteredNeeds.length} من {needs.length} احتياج
      </p>
    </div>
  );

  const needsListBody = (
    <div className="space-y-3 p-4">
      {filteredNeeds.length === 0 ? (
        <p
          className={cn(
            glassPanelClass,
            "px-4 py-6 text-center text-sm text-slate-500",
          )}
        >
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
  );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <AdvancedNeedSearch />

        {layout === "stacked" ? (
          <>
            <div className="relative h-[min(52vh,520px)] min-h-[320px] w-full">
              <RegisterHelperButton
                variant="floating"
                className="!bottom-20 !left-4 !z-[1200] sm:!bottom-6 sm:hidden"
              />
              <RegisterConvoyButton
                variant="floating"
                className="!bottom-36 !left-4 !z-[1200] sm:!bottom-20 sm:hidden"
              />
              <ReconstructionMap
                needs={filteredNeeds}
                intelligence={intelligence}
                selectedNeedId={selectedNeed?.id ?? null}
                onPledgeClick={openPledgeModal}
                onPledgeSuccess={() => router.refresh()}
                onVillageClick={openVillageDossier}
              />
            </div>

            <section
              dir="rtl"
              className="border-t border-slate-200/80 bg-slate-50/80 backdrop-blur-sm"
            >
              {needsListHeader}
              {needsListBody}
            </section>
          </>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="relative h-[55vh] flex-1 lg:h-full">
              <RegisterHelperButton
                variant="floating"
                className="!bottom-20 !left-4 !z-[1200] sm:!bottom-6 sm:hidden"
              />
              <ReconstructionMap
                needs={filteredNeeds}
                intelligence={intelligence}
                selectedNeedId={selectedNeed?.id ?? null}
                onPledgeClick={openPledgeModal}
                onPledgeSuccess={() => router.refresh()}
                onVillageClick={openVillageDossier}
              />
            </div>

            <aside
              dir="rtl"
              className="flex h-[45vh] flex-col border-t border-slate-200/80 bg-slate-50/80 backdrop-blur-sm lg:h-full lg:w-96 lg:border-t-0 lg:border-l"
            >
              {needsListHeader}
              <div className="flex-1 overflow-y-auto">{needsListBody}</div>
            </aside>
          </div>
        )}
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
