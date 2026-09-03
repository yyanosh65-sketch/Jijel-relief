"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { MapIntelligenceData } from "@/actions/intelligence";
import { getVillageDossier } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import AdvancedNeedSearch from "@/components/search/AdvancedNeedSearch";
import FloatingMapHeader from "@/components/map/FloatingMapHeader";
import MapActionDock from "@/components/map/MapActionDock";
import MapFilterRibbon from "@/components/map/MapFilterRibbon";
import NeedInspectionDrawer from "@/components/map/NeedInspectionDrawer";
import VillageDossierDrawer from "@/components/map/VillageDossierDrawer";
import VillageDetailDrawer from "@/components/map/VillageDetailDrawer";
import PledgeModal from "@/components/pledges/PledgeModal";
import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import {
  getDossierById,
  getDossierByLocation,
  getNearbyFacilities,
} from "@/lib/intelligence";
import { filterAndSortNeeds } from "@/lib/need-search";
import type { VillageFieldReportTarget } from "@/lib/field-reports";
import { cn } from "@/lib/utils";

const ReconstructionMap = dynamic(() => import("./ReconstructionMap"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-0 flex h-dvh w-screen items-center justify-center bg-slate-950 text-sm text-slate-400">
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
  fullViewportMap = true,
  showSearchBar = true,
}: ReconstructionMapLoaderProps) {
  const router = useRouter();
  const filters = useNeedSearchFilters();
  const filteredNeeds = useMemo(
    () => filterAndSortNeeds(needs, filters, intelligence),
    [filters, intelligence, needs],
  );
  const [selectedNeed, setSelectedNeed] = useState<MapNeed | null>(null);
  const [inspectNeed, setInspectNeed] = useState<MapNeed | null>(null);
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
  const [communityReportSignal, setCommunityReportSignal] = useState(0);
  const [pinDropActive, setPinDropActive] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);

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

  return (
    <>
      <div
        className={cn(
          fullViewportMap
            ? "fixed inset-0 z-0 h-dvh w-screen"
            : "relative h-full min-h-0 w-full",
        )}
      >
        {showSearchBar ? (
          <AdvancedNeedSearch variant="floating" immersive={fullViewportMap} />
        ) : null}
        <ReconstructionMap
          needs={filteredNeeds}
          intelligence={intelligence}
          selectedNeedId={selectedNeed?.id ?? inspectNeed?.id ?? null}
          onPledgeClick={openPledgeModal}
          onPledgeSuccess={() => router.refresh()}
          onVillageClick={openVillageDossier}
          onOpenFieldReport={openFieldReportDrawer}
          forceRoadTrackerCollapsed={forceRoadTrackerCollapsed}
          onModalOpenChange={setMapModalOpen}
          immersiveChrome={fullViewportMap}
          communityReportSignal={communityReportSignal}
          pinDropActive={pinDropActive}
          onPinDropActiveChange={setPinDropActive}
          layersPanelOpen={layersPanelOpen}
          onNeedInspect={fullViewportMap ? setInspectNeed : undefined}
        />
      </div>

      {fullViewportMap ? (
        <>
          <FloatingMapHeader />
          <MapFilterRibbon />
          <MapActionDock
            onUrgentReport={() =>
              setCommunityReportSignal((current) => current + 1)
            }
            onToggleLayers={() => setLayersPanelOpen((open) => !open)}
            onTogglePinDrop={() => setPinDropActive((active) => !active)}
            pinDropActive={pinDropActive}
            layersPanelOpen={layersPanelOpen}
          />
        </>
      ) : null}

      <PledgeModal
        need={selectedNeed}
        open={isPledgeModalOpen}
        onClose={closePledgeModal}
        onSuccess={() => router.refresh()}
      />

      <NeedInspectionDrawer
        need={inspectNeed}
        open={Boolean(inspectNeed)}
        onClose={() => setInspectNeed(null)}
        onPledge={openPledgeModal}
        onOpenSettlement={openDossierFromNeed}
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
