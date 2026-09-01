"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { MapNeed } from "@/actions/needs";
import NeedCard from "@/components/needs/NeedCard";
import PledgeModal from "@/components/pledges/PledgeModal";

const ReconstructionMap = dynamic(() => import("./ReconstructionMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-600">
      Loading reconstruction map...
    </div>
  ),
});

type ReconstructionMapLoaderProps = {
  needs: MapNeed[];
};

export default function ReconstructionMapLoader({
  needs,
}: ReconstructionMapLoaderProps) {
  const router = useRouter();
  const [selectedNeed, setSelectedNeed] = useState<MapNeed | null>(null);
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);

  function openPledgeModal(need: MapNeed) {
    setSelectedNeed(need);
    setIsPledgeModalOpen(true);
  }

  function closePledgeModal() {
    setIsPledgeModalOpen(false);
    setSelectedNeed(null);
  }

  return (
    <>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="h-[55vh] flex-1 lg:h-full">
          <ReconstructionMap
            needs={needs}
            selectedNeedId={selectedNeed?.id ?? null}
            onPledgeClick={openPledgeModal}
          />
        </div>

        <aside className="flex h-[45vh] flex-col border-t border-zinc-200 bg-zinc-50 lg:h-full lg:w-96 lg:border-t-0 lg:border-l">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-zinc-900">
              الحاجيات المسجلة — Besoins vérifiés
            </h2>
            <p className="text-xs text-zinc-500">{needs.length} need(s)</p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {needs.map((need) => (
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

      <PledgeModal
        need={selectedNeed}
        open={isPledgeModalOpen}
        onClose={closePledgeModal}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
