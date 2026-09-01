import ReconstructionMapLoader from "@/components/map/ReconstructionMapLoader";

export default function MapPage() {
  return (
    <main className="flex h-dvh flex-col">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-lg font-semibold text-zinc-900">
          Jijel Reconstruction Map
        </h1>
        <p className="text-sm text-zinc-600">
          Verified community needs across communes and villages in Jijel
          province.
        </p>
      </header>
      <div className="flex-1">
        <ReconstructionMapLoader />
      </div>
    </main>
  );
}
