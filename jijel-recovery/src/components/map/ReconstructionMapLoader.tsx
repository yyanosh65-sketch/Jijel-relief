"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import type { MapNeed } from "@/actions/needs";

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

  return (
    <ReconstructionMap
      needs={needs}
      onPledgeSuccess={() => router.refresh()}
    />
  );
}
