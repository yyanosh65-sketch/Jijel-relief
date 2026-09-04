"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Truck, X } from "lucide-react";

import type { VolunteerSpecialty, VolunteerVehicleType } from "@/db/schema";
import { getAllCommunes } from "@/lib/locations";
import { formatAlgerianPhoneHint } from "@/lib/phone";
import {
  darkFormInputClass,
  darkSelectClass,
  primaryNextButtonClass,
} from "@/lib/ui-labels";
import {
  MODAL_BACKDROP_CLASS,
  MODAL_BODY_SCROLL_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_SHELL_CLASS,
} from "@/lib/z-index";
import { cn } from "@/lib/utils";

const VEHICLE_OPTIONS: Array<{
  value: VolunteerVehicleType;
  label: string;
  priority?: boolean;
}> = [
  {
    value: "suv_4x4",
    label: "سيارة دفع رباعي 4x4 🚙",
    priority: true,
  },
  { value: "truck", label: "شاحنة نقل / شاحنة صغيرة 🚚" },
  { value: "sedan", label: "سيارة سياحية عادية 🚗" },
  { value: "on_foot", label: "بدون وسيلة نقل (راجل) 🚶" },
];

const SPECIALTY_OPTIONS: Array<{
  value: VolunteerSpecialty;
  label: string;
}> = [
  { value: "general_relief", label: "إغاثة عامة وتوزيع 📦" },
  { value: "medical", label: "طبيب / ممرض / إسعاف أولي 🩺" },
  {
    value: "veterinary",
    label: "طبيب بيطري (رعاية المواشي والحيوانات) 🐾",
  },
  { value: "debris_clearing", label: "إزالة ركام وفتح مسالك 🪓" },
];

type FormState = {
  fullName: string;
  phone: string;
  commune: string;
  vehicleType: VolunteerVehicleType | "";
  specialty: VolunteerSpecialty | "";
};

const INITIAL: FormState = {
  fullName: "",
  phone: "",
  commune: "",
  vehicleType: "",
  specialty: "",
};

type VolunteerRegisterModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function VolunteerRegisterModal({
  open,
  onClose,
}: VolunteerRegisterModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const communes = useMemo(
    () =>
      getAllCommunes()
        .slice()
        .sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar")),
    [],
  );

  const handleClose = useCallback(() => {
    setForm(INITIAL);
    setError(null);
    setSuccess(false);
    setSubmitting(false);
    onClose();
  }, [onClose]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL);
      setError(null);
      setSuccess(false);
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!form.vehicleType || !form.specialty) {
      setError("اختر وسيلة النقل والتخصص الميداني.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/volunteers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          phone: form.phone,
          commune: form.commune,
          vehicleType: form.vehicleType,
          specialty: form.specialty,
        }),
      });
      const json = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "تعذر التسجيل.");
      }

      setSuccess(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر التسجيل.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className={MODAL_BACKDROP_CLASS} onClick={handleClose}>
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="volunteer-register-title"
        className={cn(MODAL_SHELL_CLASS, "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={MODAL_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="volunteer-register-title"
                className="flex items-center gap-2 text-base font-bold text-white"
              >
                <Truck className="h-5 w-5 text-emerald-400" />
                تسجيل أسطول ومتطوعين ميدانيين
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                انضم لبنك الإغاثة — خاصة مركبات 4×4 للمناطق الجبلية
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {success ? (
          <div className={MODAL_BODY_SCROLL_CLASS}>
            <p className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              تم تسجيلك في بنك الإغاثة الميداني! سيتم الاتصال بك لتوجيه التدخل
            </p>
            <button
              type="button"
              onClick={handleClose}
              className={cn(primaryNextButtonClass, "mt-4 w-full")}
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className={MODAL_BODY_SCROLL_CLASS}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  الاسم الكامل
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, fullName: e.target.value }))
                  }
                  className={darkFormInputClass}
                  placeholder="الاسم الكامل"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  رقم الهاتف
                </label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, phone: e.target.value }))
                  }
                  className={darkFormInputClass}
                  placeholder={formatAlgerianPhoneHint()}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  بلدية الإقامة أو التواجد الحالي
                </label>
                <select
                  required
                  value={form.commune}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, commune: e.target.value }))
                  }
                  className={darkSelectClass}
                >
                  <option value="">اختر البلدية</option>
                  {communes.map((commune) => (
                    <option key={commune.name} value={commune.name}>
                      {commune.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  وسيلة النقل المتاحة
                </p>
                <div className="flex flex-col gap-1.5">
                  {VEHICLE_OPTIONS.map((option) => {
                    const active = form.vehicleType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            vehicleType: option.value,
                          }))
                        }
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-right text-xs font-semibold transition",
                          active
                            ? "border-emerald-400/60 bg-emerald-600/25 text-emerald-50"
                            : "border-slate-600 bg-slate-800/70 text-slate-300 hover:border-slate-500",
                          option.priority && !active && "border-amber-500/40",
                        )}
                      >
                        {option.label}
                        {option.priority ? (
                          <span className="ms-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                            أولوية جبلية
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-300">
                  التخصص الميداني
                </p>
                <div className="flex flex-col gap-1.5">
                  {SPECIALTY_OPTIONS.map((option) => {
                    const active = form.specialty === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setForm((c) => ({
                            ...c,
                            specialty: option.value,
                          }))
                        }
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-right text-xs font-semibold transition",
                          active
                            ? "border-sky-400/60 bg-sky-600/25 text-sky-50"
                            : "border-slate-600 bg-slate-800/70 text-slate-300 hover:border-slate-500",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-5">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  primaryNextButtonClass,
                  "flex w-full items-center justify-center gap-2",
                )}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "تسجيل في بنك الإغاثة"
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
