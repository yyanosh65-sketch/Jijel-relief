"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";

import { registerCommunityHelper } from "@/actions/helpers";
import type { HelperSkill } from "@/db/schema";
import { HELPER_SKILL_OPTIONS } from "@/lib/helpers";
import { getCommunesByDaira, getDairas } from "@/lib/locations";
import { formatAlgerianPhoneHint } from "@/lib/phone";
import { darkFormInputClass, darkSelectClass, primaryNextButtonClass } from "@/lib/ui-labels";
import {
  MODAL_BACKDROP_CLASS,
  MODAL_BODY_SCROLL_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_SHELL_CLASS,
} from "@/lib/z-index";
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
      className={MODAL_BACKDROP_CLASS}
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-helper-title"
        className={MODAL_SHELL_CLASS}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={MODAL_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <h2
                id="register-helper-title"
                className="text-lg font-bold text-white"
              >
                🤝 سجّل روحك متطوع / عارض مساعدة
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                عاون جيرانك في وقت الأزمات — التسجيل يخضع للمراجعة.
              </p>
            </div>
            <button
              onClick={handleClose}
              type="button"
              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {isSuccess ? (
          <div className={cn(MODAL_BODY_SCROLL_CLASS, "text-center")}>
            <p className="font-semibold text-emerald-300">
              تم استلام تسجيلك — شكراً على روح التعاون!
            </p>
            <p className="text-sm text-slate-300">
              غادي تتفعل بياناتك بعد المراجعة وتبان للناس اللي محتاجة مساعدة.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className={cn(primaryNextButtonClass, "w-full")}
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className={MODAL_BODY_SCROLL_CLASS}>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
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
                  className={darkFormInputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
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
                  className={darkFormInputClass}
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.whatsappSameAsPhone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        whatsappSameAsPhone: event.target.checked,
                      }))
                    }
                    className="accent-emerald-600"
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
                    className={cn("mt-2", darkFormInputClass)}
                  />
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-200">
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
                    className={darkSelectClass}
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
                  <label className="mb-1 block text-sm font-medium text-slate-200">
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
                    className={cn(darkSelectClass, "disabled:opacity-50")}
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
                <p className="mb-2 text-sm font-medium text-slate-200">
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
                            ? "border-emerald-500 bg-emerald-600/20 text-emerald-100"
                            : "border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600",
                        )}
                      >
                        {option.labelAr}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-200">
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
                  className={cn(darkFormInputClass, "min-h-[88px] resize-y")}
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-5">
              {error ? (
                <p className="mb-3 text-sm text-rose-300">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || form.skills.length === 0}
                className={cn(
                  primaryNextButtonClass,
                  "flex w-full items-center justify-center gap-2",
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "إرسال التسجيل"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
