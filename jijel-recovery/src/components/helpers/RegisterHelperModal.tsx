"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

import { registerCommunityHelper } from "@/actions/helpers";
import type { HelperSkill } from "@/db/schema";
import { HELPER_SKILL_OPTIONS } from "@/lib/helpers";
import { getCommunesByDaira, getDairas } from "@/lib/locations";
import { formatAlgerianPhoneHint } from "@/lib/phone";
import { formInputClass, selectFieldClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type RegisterHelperModalProps = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  fullName: string;
  phone: string;
  whatsappSameAsPhone: boolean;
  whatsappPhone: string;
  daira: string;
  commune: string;
  skills: HelperSkill[];
  availabilityNotes: string;
};

const INITIAL_FORM: FormState = {
  fullName: "",
  phone: "",
  whatsappSameAsPhone: true,
  whatsappPhone: "",
  daira: "",
  commune: "",
  skills: [],
  availabilityNotes: "",
};

const OVERLAY_CLASS =
  "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto";

const CARD_CLASS =
  "relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 border border-slate-200";

function toggleSkill(skills: HelperSkill[], skill: HelperSkill): HelperSkill[] {
  return skills.includes(skill)
    ? skills.filter((entry) => entry !== skill)
    : [...skills, skill];
}

export default function RegisterHelperModal({
  open,
  onClose,
}: RegisterHelperModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dairas = useMemo(() => getDairas(), []);
  const communes = useMemo(
    () => (form.daira ? getCommunesByDaira(form.daira) : []),
    [form.daira],
  );

  const handleClose = useCallback(() => {
    setForm(INITIAL_FORM);
    setError(null);
    setIsSubmitting(false);
    setIsSuccess(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "auto";
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setError(null);
      setIsSubmitting(false);
      setIsSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await registerCommunityHelper({
      fullName: form.fullName,
      phone: form.phone,
      whatsappSameAsPhone: form.whatsappSameAsPhone,
      whatsappPhone: form.whatsappSameAsPhone
        ? undefined
        : form.whatsappPhone,
      daira: form.daira,
      commune: form.commune,
      skills: form.skills,
      availabilityNotes: form.availabilityNotes || undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر التسجيل.");
      return;
    }

    setIsSuccess(true);
  }

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      dir="rtl"
      className={OVERLAY_CLASS}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-helper-title"
        className={CARD_CLASS}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={handleClose}
          type="button"
          className="absolute top-4 left-4 z-10 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="إغلاق"
        >
          ✕
        </button>

        <div className="mb-4 border-b border-slate-100 pb-4 pr-10">
          <h2
            id="register-helper-title"
            className="text-lg font-bold text-slate-900"
          >
            🤝 سجّل روحك متطوع / عارض مساعدة
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            عاون جيرانك في وقت الأزمات — التسجيل يخضع للمراجعة.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4 text-center">
            <p className="font-semibold text-emerald-700">
              تم استلام تسجيلك — شكراً على روح التعاون!
            </p>
            <p className="text-sm text-slate-600">
              غادي تتفعل بياناتك بعد المراجعة وتبان للناس اللي محتاجة مساعدة.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form className="flex flex-col" onSubmit={handleSubmit}>
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">
                  الاسم واللقب
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      fullName: event.target.value,
                    }))
                  }
                  className={formInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">
                  رقم الهاتف
                </label>
                <input
                  required
                  type="tel"
                  placeholder={formatAlgerianPhoneHint()}
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className={formInputClass}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.whatsappSameAsPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        whatsappSameAsPhone: event.target.checked,
                      }))
                    }
                  />
                  نفس الرقم للواتساب
                </label>
                {!form.whatsappSameAsPhone ? (
                  <input
                    type="tel"
                    placeholder="رقم الواتساب"
                    value={form.whatsappPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        whatsappPhone: event.target.value,
                      }))
                    }
                    className={cn("mt-2", formInputClass)}
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">
                    الدائرة
                  </label>
                  <select
                    required
                    value={form.daira}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        daira: event.target.value,
                        commune: "",
                      }))
                    }
                    className={selectFieldClass}
                  >
                    <option value="">اختر الدائرة</option>
                    {dairas.map((daira) => (
                      <option key={daira.name} value={daira.name}>
                        {daira.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-900">
                    البلدية
                  </label>
                  <select
                    required
                    value={form.commune}
                    disabled={!form.daira}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        commune: event.target.value,
                      }))
                    }
                    className={cn(selectFieldClass, "disabled:bg-slate-100")}
                  >
                    <option value="">اختر البلدية</option>
                    {communes.map((commune) => (
                      <option key={commune.name} value={commune.name}>
                        {commune.name_ar}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">
                  نوع المساعدة المتوفرة
                </p>
                <div className="space-y-2">
                  {HELPER_SKILL_OPTIONS.map((option) => {
                    const isSelected = form.skills.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            skills: toggleSkill(current.skills, option.value),
                          }))
                        }
                        className={cn(
                          "w-full rounded-xl border px-3 py-2.5 text-right text-xs font-medium transition",
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                        )}
                      >
                        {option.labelAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-900">
                  ملاحظات حول أوقات التوفر والإمكانيات
                </label>
                <textarea
                  rows={3}
                  value={form.availabilityNotes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      availabilityNotes: event.target.value,
                    }))
                  }
                  placeholder="مثال: متاح نهار السبت والأحد — عندي سيارة 4x4..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            {error ? (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || form.skills.length === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "إرسال التسجيل"
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
