"use client";

import { useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";

import { submitDamageReport } from "@/actions/needs";
import { submitUrgentAlert } from "@/actions/emergency";
import { resolveNearestLocation } from "@/lib/locations";
import { MODAL_BACKDROP_CLASS, MODAL_BODY_SCROLL_CLASS, MODAL_HEADER_CLASS, MODAL_SHELL_CLASS } from "@/lib/z-index";
import { darkFormInputClass, darkSelectClass, primaryNextButtonClass } from "@/lib/ui-labels";
import { SOS_EMERGENCY_OPTIONS } from "@/lib/intelligence";
import { cn } from "@/lib/utils";

type ReportMode = "need" | "sos";

type MapClickReportModalProps = {
  open: boolean;
  lat: number;
  lng: number;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function MapClickReportModal({
  open,
  lat,
  lng,
  onClose,
  onSuccess,
}: MapClickReportModalProps) {
  const [mode, setMode] = useState<ReportMode>("need");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [emergencyType, setEmergencyType] = useState<
    (typeof SOS_EMERGENCY_OPTIONS)[number]["value"]
  >("medical");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nearest = resolveNearestLocation(lat, lng);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "sos") {
        const result = await submitUrgentAlert({
          emergencyType,
          description: description.trim() || "نداء استغاثة من الخريطة",
          reporterName: contactName.trim() || "مواطن",
          reporterPhone: contactPhone.trim() || undefined,
          daira: nearest.daira,
          commune: nearest.name_ar,
          village: nearest.landmark,
          lat,
          lng,
        });

        if (!result.success) {
          throw new Error(result.error ?? "تعذر إرسال نداء SOS.");
        }
      } else {
        const formData = new FormData();
        formData.set("intakeCategory", "olive");
        formData.set("quantity", quantity);
        formData.set("unit", "وحدة");
        formData.set(
          "description",
          description.trim() || "احتياج مسجّل من نقطة على الخريطة",
        );
        formData.set("contactName", contactName.trim() || "منسق ميداني");
        formData.set("contactPhone", contactPhone.trim() || "0500000000");
        formData.set("commune", nearest.name_ar);
        formData.set("village", nearest.landmark);
        formData.set("daira", nearest.daira_ar);
        formData.set("lat", String(lat));
        formData.set("lng", String(lng));

        const result = await submitDamageReport(formData);
        if (!result.ok) {
          throw new Error(result.error);
        }
      }

      onSuccess?.();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إرسال البلاغ.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={MODAL_BACKDROP_CLASS}
      onClick={onClose}
    >
      <div
        dir="rtl"
        role="dialog"
        aria-modal="true"
        className={cn(MODAL_SHELL_CLASS, "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={MODAL_HEADER_CLASS}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-base font-bold text-white">
                <MapPin className="h-5 w-5 text-emerald-400" />
                تسجيل في هذا الموقع
              </h2>
              <p className="mt-1 font-mono text-[11px] text-slate-400" dir="ltr">
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                أقرب بلدية: {nearest.name_ar} — {nearest.landmark}
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

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className={MODAL_BODY_SCROLL_CLASS}>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("need")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  mode === "need"
                    ? "border-emerald-500 bg-emerald-600/20 text-emerald-100"
                    : "border-slate-700 bg-slate-800 text-slate-300",
                )}
              >
                📋 احتياج / ضرر
              </button>
              <button
                type="button"
                onClick={() => setMode("sos")}
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold transition",
                  mode === "sos"
                    ? "border-rose-500 bg-rose-600/20 text-rose-100"
                    : "border-slate-700 bg-slate-800 text-slate-300",
                )}
              >
                🚨 نداء SOS
              </button>
            </div>

            {mode === "sos" ? (
              <select
                value={emergencyType}
                onChange={(e) =>
                  setEmergencyType(
                    e.target.value as (typeof SOS_EMERGENCY_OPTIONS)[number]["value"],
                  )
                }
                className={darkSelectClass}
              >
                {SOS_EMERGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.labelAr}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="الكمية المطلوبة"
                className={darkFormInputClass}
              />
            )}

            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                mode === "sos"
                  ? "صف الحالة العاجلة…"
                  : "صف الضرر أو الاحتياج في هذا الموقع…"
              }
              className={darkFormInputClass}
            />

            <input
              required
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="الاسم الكامل"
              className={darkFormInputClass}
            />
            <input
              required
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="رقم الهاتف"
              className={darkFormInputClass}
            />

            {error ? (
              <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {error}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-5">
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(primaryNextButtonClass, "flex w-full items-center justify-center gap-2")}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "إرسال البلاغ"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
