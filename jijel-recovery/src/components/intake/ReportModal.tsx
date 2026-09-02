"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, X } from "lucide-react";

import {
  getCommunesByDaira,
  getCommuneArabicName,
  getDairas,
} from "@/lib/locations";
import { MODAL_BACKDROP_CLASS, MODAL_BODY_SCROLL_CLASS, MODAL_HEADER_CLASS, MODAL_SHELL_CLASS } from "@/lib/z-index";
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
      className={MODAL_BACKDROP_CLASS}
      dir="rtl"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(MODAL_SHELL_CLASS, "max-w-lg")}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={MODAL_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-2">
              <h2 className="text-lg font-extrabold text-white">
                تسجيل نداء أو استغاثة
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                الصق نص منشور فيسبوك إغاثي أو اكتب وصفاً ميدانياً دقيقاً مع القرية
                والبلدية.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {success ? (
          <div className={MODAL_BODY_SCROLL_CLASS}>
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
              ✅ تم تسجيل النداء ونشره في المنظومة الميدانية.
            </p>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
            <div className={MODAL_BODY_SCROLL_CLASS}>
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
            </div>

            <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-5">
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
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
