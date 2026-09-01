"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { getMapNeeds, type MapNeed } from "@/actions/needs";

const ReconstructionMap = dynamic(() => import("./ReconstructionMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-600">
      Loading reconstruction map...
    </div>
  ),
});

export default function ReconstructionMapLoader() {
  const [needs, setNeeds] = useState<MapNeed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadNeeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getMapNeeds();

    if (!result.success) {
      setError(result.error ?? "Failed to load needs.");
      setNeeds([]);
      setIsLoading(false);
      return;
    }

    setNeeds(result.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadNeeds();
  }, [loadNeeds]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-sm text-zinc-600">
        Loading verified needs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-zinc-100 px-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => void loadNeeds()}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return <ReconstructionMap needs={needs} onPledgeSuccess={loadNeeds} />;
}
