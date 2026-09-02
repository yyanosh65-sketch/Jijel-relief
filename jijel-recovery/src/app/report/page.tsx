import ReportDamageForm from "@/components/forms/ReportDamageForm";

export default function ReportPage() {
  return (
    <main dir="rtl" className="min-h-dvh bg-slate-950">
      <header className="border-b border-slate-800/80 bg-slate-950/90 px-4 py-5 backdrop-blur-md">
        <h1 className="text-xl font-bold text-white">
          تسجيل ضرر أو احتياج
        </h1>
        <p className="mt-1 text-sm text-slate-300">
          ساعد المجتمع ديال جيجل باش نعرفو فين الخدمة محتاجة.
        </p>
      </header>

      <div className="px-4 py-6">
        <ReportDamageForm />
      </div>
    </main>
  );
}
