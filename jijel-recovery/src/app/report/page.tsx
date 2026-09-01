import ReportDamageForm from "@/components/forms/ReportDamageForm";

export default function ReportPage() {
  return (
    <main dir="rtl" className="min-h-dvh bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-5 backdrop-blur-md">
        <h1 className="text-xl font-semibold text-slate-900">
          تسجيل ضرر
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          ساعد المجتمع ديال جيجل باش نعرفو فين الخدمة محتاجة.
        </p>
      </header>

      <div className="px-4 py-6">
        <ReportDamageForm />
      </div>
    </main>
  );
}
