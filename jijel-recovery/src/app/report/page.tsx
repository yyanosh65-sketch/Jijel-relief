import ReportDamageForm from "@/components/forms/ReportDamageForm";

export default function ReportPage() {
  return (
    <main className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-5">
        <h1 className="text-xl font-semibold text-zinc-900">
          تسجيل ضرر — Signaler un besoin
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          ساعد المجتمع ديال جيجل باش نعرفو فين الخدمة محتاجة.
        </p>
        <p className="text-xs text-zinc-500">
          Aidez la communauté de Jijel à cartographier les besoins de
          reconstruction.
        </p>
      </header>

      <div className="px-4 py-6">
        <ReportDamageForm />
      </div>
    </main>
  );
}
