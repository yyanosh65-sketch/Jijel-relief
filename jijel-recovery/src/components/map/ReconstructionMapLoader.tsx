"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { MapIntelligenceData } from "@/actions/intelligence";
import { getVillageDossier } from "@/actions/intelligence";
import type { MapNeed } from "@/actions/needs";
import MapActionDock from "@/components/map/MapActionDock";
import MapTopHud from "@/components/map/MapTopHud";
import GlobalAgentDrawer from "@/components/map/GlobalAgentDrawer";
import NeedInspectionDrawer from "@/components/map/NeedInspectionDrawer";
import PointInspectionPanel, {
  type PointInspectionData,
} from "@/components/map/PointInspectionPanel";
import TrailDetailPanel from "@/components/map/TrailDetailPanel";
import VillageDossierDrawer from "@/components/map/VillageDossierDrawer";
import VillageDetailDrawer from "@/components/map/VillageDetailDrawer";
import PledgeModal from "@/components/pledges/PledgeModal";
import BarterModal from "@/components/inventory/BarterModal";
import AgroRecoveryPanel, {
  type AgroFocusTag,
} from "@/components/agro/AgroRecoveryPanel";
import { useNeedSearchFilters } from "@/hooks/useNeedSearchFilters";
import { flushPendingOfflineSubmissions } from "@/hooks/useOnlineStatus";
import { useResponderStream } from "@/hooks/useResponderStream";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import {
  getDossierById,
  getDossierByLocation,
  getNearbyFacilities,
} from "@/lib/intelligence";
import { filterAndSortNeeds } from "@/lib/need-search";
import type { VillageFieldReportTarget } from "@/lib/field-reports";
import {
  cacheSettlementsAndNeeds,
  getCachedSettlementsAndNeeds,
  getMeshRecord,
  isBrowserOffline,
} from "@/lib/offline-storage";
import { verifiedReliefContacts } from "@/lib/relief-contacts";
import { JIJEL_ENTRY_CORRIDORS } from "@/lib/road-corridors";
import type { SerializedMountainTrail } from "@/lib/trail-clearance";
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
  needs: initialNeeds,
  intelligence: initialIntelligence,
  fullViewportMap = true,
  showSearchBar = true,
}: ReconstructionMapLoaderProps) {
  const router = useRouter();
  const filters = useNeedSearchFilters();
  const [needs, setNeeds] = useState<MapNeed[]>(initialNeeds);
  const [intelligence, setIntelligence] =
    useState<MapIntelligenceData>(initialIntelligence);
  const filteredNeeds = useMemo(
    () => filterAndSortNeeds(needs, filters, intelligence),
    [filters, intelligence, needs],
  );
  const [selectedNeed, setSelectedNeed] = useState<MapNeed | null>(null);
  const [inspectNeed, setInspectNeed] = useState<MapNeed | null>(null);
  const [inspectPoint, setInspectPoint] = useState<PointInspectionData | null>(
    null,
  );
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
  const [isGlobalAgentOpen, setIsGlobalAgentOpen] = useState(false);
  const [isBarterOpen, setIsBarterOpen] = useState(false);
  const [agroFocusTag, setAgroFocusTag] = useState<AgroFocusTag | undefined>();
  const [isAgroOpen, setIsAgroOpen] = useState(false);
  const [inspectTrail, setInspectTrail] =
    useState<SerializedMountainTrail | null>(null);
  const [trailRefreshKey, setTrailRefreshKey] = useState(0);
  const { badgesByNeedId } = useResponderStream();

  useEffect(() => {
    setNeeds(initialNeeds);
    setIntelligence(initialIntelligence);
  }, [initialNeeds, initialIntelligence]);

  useEffect(() => {
    if (
      initialNeeds.length === 0 &&
      initialIntelligence.villagePins.length === 0
    ) {
      return;
    }

    void cacheSettlementsAndNeeds(
      initialIntelligence.villagePins,
      initialNeeds,
      {
        phones: verifiedReliefContacts.map((contact) => ({
          name: contact.name,
          phone: contact.phone,
          commune: contact.commune,
          category: contact.category,
        })),
        roadStatuses: JIJEL_ENTRY_CORRIDORS.map((corridor) => ({
          route: corridor.route,
          labelAr: corridor.labelAr,
          status: corridor.status,
          noteAr: corridor.noteAr,
        })),
        intelligence: initialIntelligence,
      },
    );
  }, [initialNeeds, initialIntelligence]);

  useEffect(() => {
    if (initialNeeds.length > 0) return;

    void (async () => {
      const cached = await getCachedSettlementsAndNeeds();
      const mesh = await getMeshRecord();
      if (!cached && !mesh) return;

      if (cached?.needs?.length) {
        setNeeds(cached.needs as MapNeed[]);
      }
      if (mesh?.intelligence) {
        setIntelligence(mesh.intelligence as MapIntelligenceData);
      } else if (cached?.settlements?.length) {
        setIntelligence((current) => ({
          ...current,
          villagePins:
            cached.settlements as MapIntelligenceData["villagePins"],
        }));
      }
    })();
  }, [initialNeeds.length]);

  useEffect(() => {
    function onOnline() {
      void flushPendingOfflineSubmissions();
    }

    window.addEventListener("online", onOnline);
    if (!isBrowserOffline()) {
      void flushPendingOfflineSubmissions();
    }
    return () => window.removeEventListener("online", onOnline);
  }, []);

  const sheetOpen =
    isDossierOpen ||
    Boolean(inspectNeed) ||
    Boolean(inspectPoint) ||
    Boolean(inspectTrail) ||
    isFieldReportOpen ||
    isPledgeModalOpen ||
    mapModalOpen ||
    isGlobalAgentOpen ||
    isBarterOpen ||
    isAgroOpen;

  const layoutEpoch = sheetOpen;
  const forceRoadTrackerCollapsed = sheetOpen;

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

  function openGlobalAgent() {
    setInspectNeed(null);
    setInspectPoint(null);
    setIsGlobalAgentOpen(true);
  }

  function closeGlobalAgent() {
    setIsGlobalAgentOpen(false);
  }

  function openBarter() {
    setIsBarterOpen(true);
  }

  function closeBarter() {
    setIsBarterOpen(false);
  }

  function openAgro(tag: AgroFocusTag) {
    setAgroFocusTag(tag);
    setIsAgroOpen(true);
  }

  function closeAgro() {
    setIsAgroOpen(false);
    setAgroFocusTag(undefined);
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
          onPointInspect={fullViewportMap ? setInspectPoint : undefined}
          onTrailInspect={fullViewportMap ? setInspectTrail : undefined}
          trailRefreshKey={trailRefreshKey}
          layoutEpoch={layoutEpoch}
          responderBadgesByNeedId={badgesByNeedId}
        />
      </div>

      {fullViewportMap ? (
        <>
          <MapTopHud
            showSearch={showSearchBar}
            onOpenGlobalAgent={openGlobalAgent}
            onOpenAgroOlive={() => openAgro("olive")}
            onOpenAgroLivestock={() => openAgro("livestock")}
          />
          <MapActionDock
            hidden={sheetOpen}
            onUrgentReport={() =>
              setCommunityReportSignal((current) => current + 1)
            }
            onToggleLayers={() => setLayersPanelOpen((open) => !open)}
            onTogglePinDrop={() => setPinDropActive((active) => !active)}
            onOpenGlobalAgent={openGlobalAgent}
            onOpenBarter={openBarter}
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

      <GlobalAgentDrawer
        open={isGlobalAgentOpen}
        onClose={closeGlobalAgent}
      />

      <PointInspectionPanel
        point={inspectPoint}
        open={Boolean(inspectPoint)}
        onClose={() => setInspectPoint(null)}
      />

      <TrailDetailPanel
        trail={inspectTrail}
        open={Boolean(inspectTrail)}
        onClose={() => setInspectTrail(null)}
        onUpdated={(trail) => {
          setInspectTrail(trail);
          setTrailRefreshKey((key) => key + 1);
        }}
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

      <BarterModal open={isBarterOpen} onClose={closeBarter} />

      <AgroRecoveryPanel
        open={isAgroOpen}
        onClose={closeAgro}
        focusTag={agroFocusTag}
      />
    </>
  );
}
