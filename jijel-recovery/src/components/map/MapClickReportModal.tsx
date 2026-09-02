"use client";

import { useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";

import { submitDamageReport } from "@/actions/needs";
import { submitUrgentAlert } from "@/actions/emergency";
import { resolveNearestLocation } from "@/lib/locations";
import { MODAL_BACKDROP_CLASS } from "@/lib/z-index";
import { formInputClass, selectFieldClass } from "@/lib/ui-labels";
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
      className={cn(MODAL_BACKDROP_CLASS, "items-end sm:items-center")}
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MapPin className="h-5 w-5 text-emerald-700" />
              تسجيل في هذا الموقع
            </h2>
            <p className="mt-1 font-mono text-[11px] text-slate-500" dir="ltr">
              {lat.toFixed(4)}, {lng.toFixed(4)}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              أقرب بلدية: {nearest.name_ar} — {nearest.landmark}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="space-y-4 p-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("need")}
              className={cn(
                "rounded-xl border px-3 py-2 text-xs font-bold transition",
                mode === "need"
                  ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-600",
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
                  ? "border-red-600 bg-red-50 text-red-900"
                  : "border-slate-200 bg-white text-slate-600",
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
              className={selectFieldClass}
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
              className={formInputClass}
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
            className={formInputClass}
          />

          <input
            required
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="الاسم الكامل"
            className={formInputClass}
          />
          <input
            required
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="رقم الهاتف"
            className={formInputClass}
          />

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "إرسال البلاغ"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
