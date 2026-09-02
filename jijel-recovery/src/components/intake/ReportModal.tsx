"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, X } from "lucide-react";

import {
  getCommunesByDaira,
  getCommuneArabicName,
  getDairas,
} from "@/lib/locations";
import { darkFormInputClass, darkSelectClass, primaryNextButtonClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

const FOCUS_DAIRAS = [
  "El Ancer",
  "Taher",
  "El Milia",
  "Texenna",
  "Jijel",
] as const;

const URGENCY_OPTIONS = [
  { value: "critical", label: "حرجة جداً" },
  { value: "high", label: "عاجلة" },
  { value: "medium", label: "عادية" },
] as const;

type ReportModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialLat?: number;
  initialLng?: number;
};

export default function ReportModal({
  open,
  onClose,
  onSuccess,
  initialLat,
  initialLng,
}: ReportModalProps) {
  const [description, setDescription] = useState("");
  const [commune, setCommune] = useState("");
  const [village, setVillage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [urgency, setUrgency] =
    useState<(typeof URGENCY_OPTIONS)[number]["value"]>("high");
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const communeOptions = useMemo(() => {
    const dairas = getDairas().filter((d) =>
      FOCUS_DAIRAS.includes(d.name as (typeof FOCUS_DAIRAS)[number]),
    );
    return dairas.flatMap((daira) =>
      getCommunesByDaira(daira.name).map((item) => ({
        value: item.name,
        label: item.name_ar,
        daira: daira.name_ar,
      })),
    );
  }, []);

  useEffect(() => {
    if (initialLat != null) setLat(initialLat);
    if (initialLng != null) setLng(initialLng);
  }, [initialLat, initialLng]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  async function captureCurrentPosition() {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع.");
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setError("تعذر تحديد موقعك الحالي.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          commune,
          village: village.trim() || undefined,
          contactName: contactName.trim() || undefined,
          contactPhone,
          urgency,
          lat: lat ?? undefined,
          lng: lng ?? undefined,
          reportType: urgency === "critical" ? "sos" : "need",
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error ?? "تعذر إرسال النداء.");
      }

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDescription("");
        setVillage("");
        setContactPhone("");
        setContactName("");
      }, 1400);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إرسال النداء.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="relative z-[9999] max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800/80 bg-slate-900/95 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="إغلاق"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="pr-8 text-lg font-extrabold text-white">
          تسجيل نداء أو استغاثة
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          الصق نص منشور فيسبوك إغاثي أو اكتب وصفاً ميدانياً دقيقاً مع القرية
          والبلدية.
        </p>

        {success ? (
          <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
            ✅ تم تسجيل النداء ونشره في المنظومة الميدانية.
          </p>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="الصق هنا منشور فيسبوك أو اكتب تفاصيل النداء (مثال: عائلة محاصرة في بومزبرة تحتاج ماء وغذاء عاجل...)"
              className={cn(darkFormInputClass, "min-h-[120px] resize-y")}
            />

            <select
              required
              value={commune}
              onChange={(event) => setCommune(event.target.value)}
              className={darkSelectClass}
            >
              <option value="">اختر البلدية</option>
              {communeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} — {option.daira}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={village}
              onChange={(event) => setVillage(event.target.value)}
              placeholder="اسم الدشرة / الدوار (مثال: بومزبرة، بوالرماد)"
              className={darkFormInputClass}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                required
                type="tel"
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                placeholder="رقم الهاتف"
                className={darkFormInputClass}
              />
              <select
                value={urgency}
                onChange={(event) =>
                  setUrgency(
                    event.target.value as (typeof URGENCY_OPTIONS)[number]["value"],
                  )
                }
                className={darkSelectClass}
              >
                {URGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <input
              type="text"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="اسم المبلّغ (اختياري)"
              className={darkFormInputClass}
            />

            <button
              type="button"
              onClick={() => void captureCurrentPosition()}
              disabled={isLocating}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-sm font-bold text-slate-100 transition hover:bg-slate-700 disabled:opacity-60"
            >
              {isLocating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              تحديد إحداثيات موقعي الحالي
            </button>

            {lat != null && lng != null ? (
              <p className="text-center font-mono text-[11px] text-emerald-300/90" dir="ltr">
                {lat.toFixed(5)}, {lng.toFixed(5)}
                {commune ? ` — ${getCommuneArabicName(commune)}` : ""}
              </p>
            ) : null}

            {error ? (
              <p className="text-sm font-semibold text-rose-300">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(primaryNextButtonClass, "w-full")}
            >
              {isSubmitting ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : (
                "إرسال النداء للمنظومة"
              )}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
