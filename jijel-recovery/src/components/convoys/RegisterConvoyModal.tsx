"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, X } from "lucide-react";

import { registerConvoy } from "@/actions/convoys";
import type { ConvoyCargoType, ConvoyEntryPoint, ConvoyVehicleType } from "@/db/schema";
import {
  ALGERIAN_WILAYAS,
  CONVOY_CARGO_OPTIONS,
  CONVOY_ENTRY_OPTIONS,
  CONVOY_VEHICLE_OPTIONS,
} from "@/lib/convoys";
import { formatAlgerianPhoneHint } from "@/lib/phone";
import { cn } from "@/lib/utils";

type RegisterConvoyModalProps = {
  open: boolean;
  onClose: () => void;
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20";

type FormState = {
  departureWilaya: string;
  driverName: string;
  driverPhone: string;
  whatsappSameAsPhone: boolean;
  driverWhatsapp: string;
  vehicleType: ConvoyVehicleType | "";
  cargoType: ConvoyCargoType | "";
  eta: string;
  entryPoint: ConvoyEntryPoint | "";
  notes: string;
};

const INITIAL_FORM: FormState = {
  departureWilaya: "",
  driverName: "",
  driverPhone: "",
  whatsappSameAsPhone: true,
  driverWhatsapp: "",
  vehicleType: "",
  cargoType: "",
  eta: "",
  entryPoint: "",
  notes: "",
};

export default function RegisterConvoyModal({
  open,
  onClose,
}: RegisterConvoyModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [guideAssignUrl, setGuideAssignUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_FORM);
      setError(null);
      setIsSubmitting(false);
      setGuideAssignUrl(null);
      setCopied(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!form.vehicleType || !form.cargoType || !form.entryPoint) {
      setIsSubmitting(false);
      setError("أكمل جميع الحقول المطلوبة.");
      return;
    }

    const result = await registerConvoy({
      departureWilaya: form.departureWilaya,
      driverName: form.driverName,
      driverPhone: form.driverPhone,
      whatsappSameAsPhone: form.whatsappSameAsPhone,
      driverWhatsapp: form.whatsappSameAsPhone
        ? undefined
        : form.driverWhatsapp,
      vehicleType: form.vehicleType,
      cargoType: form.cargoType,
      eta: form.eta,
      entryPoint: form.entryPoint,
      notes: form.notes || undefined,
    });

    setIsSubmitting(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "تعذر التسجيل.");
      return;
    }

    const absoluteUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${result.data.guideAssignPath}`
        : result.data.guideAssignPath;

    setGuideAssignUrl(absoluteUrl);
  }

  async function copyGuideLink() {
    if (!guideAssignUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(guideAssignUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("تعذر نسخ الرابط.");
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-convoy-title"
        className="relative z-10 my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 border-b border-slate-100 pb-4 pr-10">
          <h2
            id="register-convoy-title"
            className="text-lg font-bold text-slate-900"
          >
            🚚 تسجيل قافلة إغاثة قادمة لجيجل
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            سجّل قافلتك باش نستقبلوك ونعيّنو مرافق محلي عند المدخل.
          </p>
        </div>

        {guideAssignUrl ? (
          <div className="space-y-4 text-center">
            <p className="font-semibold text-emerald-700">
              تم تسجيل القافلة بنجاح!
            </p>
            <p className="text-sm text-slate-600">
              شارك هذا الرابط مع منسق الاستقبال المحلي لتعيين مرافق ترحيب:
            </p>
            <div
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs break-all text-slate-800"
              dir="ltr"
            >
              {guideAssignUrl}
            </div>
            <button
              type="button"
              onClick={copyGuideLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-800"
            >
              <Copy className="h-4 w-4" />
              {copied ? "تم النسخ" : "نسخ رابط تعيين المرافق"}
            </button>
            <a
              href={guideAssignUrl}
              className="block w-full rounded-xl bg-sky-700 py-3 text-sm font-semibold text-white"
            >
              فتح دليل القادمين وتعيين مرافق
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-300 py-3 text-sm font-semibold text-slate-700"
            >
              إغلاق
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ولاية الانطلاق
              </label>
              <select
                required
                value={form.departureWilaya}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    departureWilaya: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
              >
                <option value="">اختر الولاية</option>
                {ALGERIAN_WILAYAS.map((wilaya) => (
                  <option key={wilaya.value} value={wilaya.value}>
                    {wilaya.labelAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                اسم السائق / مسؤول القافلة
              </label>
              <input
                required
                value={form.driverName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    driverName: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                رقم الهاتف
              </label>
              <input
                required
                type="tel"
                placeholder={formatAlgerianPhoneHint()}
                value={form.driverPhone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    driverPhone: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
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
                  value={form.driverWhatsapp}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      driverWhatsapp: event.target.value,
                    }))
                  }
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">نوع المركبة</p>
              <div className="grid grid-cols-2 gap-2">
                {CONVOY_VEHICLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        vehicleType: option.value,
                      }))
                    }
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-right text-xs font-medium transition",
                      form.vehicleType === option.value
                        ? "border-sky-600 bg-sky-50 text-sky-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    {option.labelAr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">نوع الحمولة</p>
              <div className="grid grid-cols-2 gap-2">
                {CONVOY_CARGO_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        cargoType: option.value,
                      }))
                    }
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-right text-xs font-medium transition",
                      form.cargoType === option.value
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    {option.labelAr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                وقت الوصول التقريبي (ETA)
              </label>
              <input
                required
                type="datetime-local"
                value={form.eta}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    eta: event.target.value,
                  }))
                }
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                المدخل المتوقع لجيجل
              </p>
              <div className="space-y-2">
                {CONVOY_ENTRY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        entryPoint: option.value,
                      }))
                    }
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-right text-xs font-medium transition",
                      form.entryPoint === option.value
                        ? "border-amber-600 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    )}
                  >
                    🚩 {option.labelAr}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ملاحظات إضافية (اختياري)
              </label>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="عدد المركبات، حجم الحمولة، احتياج مرافق 4x4..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !form.vehicleType ||
                !form.cargoType ||
                !form.entryPoint
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "تسجيل القافلة"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
