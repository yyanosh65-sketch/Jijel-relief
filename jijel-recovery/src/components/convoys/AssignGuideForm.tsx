"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { assignWelcomingGuide } from "@/actions/convoys";
import { glassPanelClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type AssignGuideFormProps = {
  convoyId: number;
};

export default function AssignGuideForm({ convoyId }: AssignGuideFormProps) {
  const [guideName, setGuideName] = useState("");
  const [guidePhone, setGuidePhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await assignWelcomingGuide(convoyId, guideName, guidePhone);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر التعيين.");
      return;
    }

    setIsSuccess(true);
  }

  if (isSuccess) {
    return (
      <div className={cn(glassPanelClass, "border-emerald-200 bg-emerald-50/60 p-5")}>
        <p className="font-semibold text-emerald-800">
          تم تعيين المرافق المحلي بنجاح — القافلة #{convoyId} في الطريق!
        </p>
        <p className="mt-2 text-sm text-emerald-700">
          تواصل مع السائق عبر الواتساب وحدّد نقطة اللقاء عند المدخل.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(glassPanelClass, "space-y-4 border-sky-200 p-5")}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        تعيين مرافق ترحيب للقافلة #{convoyId}
      </h2>
      <p className="text-sm text-slate-600">
        أنت منسق استقبال محلي؟ عيّن مرافقاً يستقبل القافلة عند المدخل ويوجّهها
        للمستودع المناسب.
      </p>

      <input
        required
        value={guideName}
        onChange={(event) => setGuideName(event.target.value)}
        placeholder="اسم المرافق المحلي"
        className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm"
      />

      <input
        required
        type="tel"
        dir="ltr"
        value={guidePhone}
        onChange={(event) => setGuidePhone(event.target.value)}
        placeholder="05XX XX XX XX"
        className="min-h-11 w-full rounded-xl border border-slate-300 px-3 text-left text-sm"
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        تأكيد تعيين المرافق
      </button>
    </form>
  );
}
