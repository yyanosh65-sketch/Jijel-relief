"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { MapIntelligenceData } from "@/actions/intelligence";
import { getVillageDossier } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import AdvancedNeedSearch from "@/components/search/AdvancedNeedSearch";
import NeedCard from "@/components/needs/NeedCard";
import VillageDossierDrawer from "@/components/map/VillageDossierDrawer";
import VillageDetailDrawer from "@/components/map/VillageDetailDrawer";
import PledgeModal from "@/components/pledges/PledgeModal";
import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import { getDossierById, getDossierByLocation, getNearbyFacilities } from "@/lib/intelligence";
import { filterAndSortNeeds } from "@/lib/need-search";
import type { VillageFieldReportTarget } from "@/lib/field-reports";
import { glassPanelClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

const ReconstructionMap = dynamic(() => import("./ReconstructionMap"), {
  ssr: false,
  loading: () => (
    <div className="relative z-10 flex h-full w-full items-center justify-center bg-slate-950 text-sm text-slate-400">
      جاري تحميل الخريطة...
    </div>
  ),
});

type ReconstructionMapLoaderProps = {
  needs: MapNeed[];
  intelligence: MapIntelligenceData;
  layout?: "sidebar" | "stacked";
  fullViewportMap?: boolean;
  showSearchBar?: boolean;
};

export default function ReconstructionMapLoader({
  needs,
  intelligence,
  layout = "sidebar",
  fullViewportMap = false,
  showSearchBar = true,
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
  const [fieldReportTarget, setFieldReportTarget] =
    useState<VillageFieldReportTarget | null>(null);
  const [isFieldReportOpen, setIsFieldReportOpen] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  const forceRoadTrackerCollapsed = mapModalOpen || isPledgeModalOpen;

  function openPledgeModal(need: MapNeed) {
    setSelectedNeed(need);
    setIsPledgeModalOpen(true);
  }

  function closePledgeModal() {
    setIsPledgeModalOpen(false);
    setSelectedNeed(null);
  }

  function openDossierFromNeed(need: MapNeed) {
    const dossier =
      getDossierByLocation(need.location.name, "commune") ??
      getDossierByLocation(need.location.daira, "daira");

    if (!dossier) {
      return;
    }

    setSelectedDossier(dossier);
    setDossierFacilities(getNearbyFacilities(dossier));
    setIsDossierOpen(true);
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

  function openFieldReportDrawer(target: VillageFieldReportTarget) {
    setFieldReportTarget(target);
    setIsFieldReportOpen(true);
  }

  function closeFieldReportDrawer() {
    setIsFieldReportOpen(false);
    setFieldReportTarget(null);
  }

  const needsListHeader = (
    <div className="space-y-2 border-b border-slate-800/80 px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-100">حاجيات موثقة</h2>
        <p className="text-xs text-slate-400">
          {filteredNeeds.length} من {needs.length} احتياج
        </p>
      </div>
      <p className="text-[11px] leading-relaxed text-slate-500">
        استخدم زر «تسجيل نداء أو استغاثة» على الخريطة لإضافة نداء ميداني جديد.
      </p>
    </div>
  );

  const needsListBody = (
    <div className="space-y-3 p-4">
      {filteredNeeds.length === 0 ? (
        <p
          className={cn(
            glassPanelClass,
            "px-4 py-6 text-center text-sm text-slate-400",
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
          onOpenDossier={openDossierFromNeed}
          onRefresh={() => router.refresh()}
        />
      ))}
    </div>
  );

  const mapHeightClass = fullViewportMap
    ? "h-full min-h-0"
    : layout === "stacked"
      ? "h-[min(52vh,520px)] min-h-[320px]"
      : "h-[55vh] lg:h-full";

  const mapSection = (
    <div className={cn("relative w-full", mapHeightClass)}>
      {showSearchBar ? <AdvancedNeedSearch variant="floating" /> : null}
      <ReconstructionMap
        needs={needs}
        intelligence={intelligence}
        selectedNeedId={selectedNeed?.id ?? null}
        onPledgeClick={openPledgeModal}
        onPledgeSuccess={() => router.refresh()}
        onVillageClick={openVillageDossier}
        onOpenFieldReport={openFieldReportDrawer}
        forceRoadTrackerCollapsed={forceRoadTrackerCollapsed}
        onModalOpenChange={setMapModalOpen}
      />
    </div>
  );

  return (
    <>
      <div className={cn("flex min-h-0 flex-col", fullViewportMap && "h-full")}>
        {layout === "stacked" ? (
          <>
            {mapSection}

            <section
              dir="rtl"
              className="border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm"
            >
              {needsListHeader}
              {needsListBody}
            </section>
          </>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
            {mapSection}

            <aside
              dir="rtl"
              className="flex h-[45vh] flex-col border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-sm lg:h-full lg:w-96 lg:border-t-0 lg:border-l lg:border-slate-800/80"
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

      <VillageDetailDrawer
        target={fieldReportTarget}
        open={isFieldReportOpen}
        onClose={closeFieldReportDrawer}
      />
    </>
  );
}
