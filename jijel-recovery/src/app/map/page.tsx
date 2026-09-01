import { getMapNeeds } from "@/actions/needs";
import ReconstructionMapLoader from "@/components/map/ReconstructionMapLoader";

export default async function MapPage() {
  const result = await getMapNeeds();

  if (!result.success) {
    return (
      <main className="flex h-dvh flex-col">
        <header className="border-b border-zinc-200 bg-white px-4 py-3">
          <h1 className="text-lg font-semibold text-zinc-900">
            Jijel Reconstruction Map
          </h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-zinc-100 px-6 text-center">
          <p className="text-sm text-red-600">
            {result.error ?? "Failed to fetch map needs."}
          </p>
          <p className="text-xs text-zinc-500">
            تأكد من تشغيل PostgreSQL المحلي — Vérifiez que PostgreSQL local est
            démarré.
          </p>
        </div>
      </main>
    );
  }

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
        <ReconstructionMapLoader needs={result.data ?? []} />
      </div>
    </main>
  );
}
