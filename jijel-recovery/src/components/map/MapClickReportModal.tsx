"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";

import { submitDamageReport } from "@/actions/needs";
import { submitUrgentAlert } from "@/actions/emergency";
import OfflineSmsFallbackModal from "@/components/emergency/OfflineSmsFallbackModal";
import {
  IncidentCoordinatesBanner,
  IncidentReportFields,
  aidTagToIntakeCategory,
  formatAidTagsForDescription,
  type IncidentAidTagId,
  type IncidentUrgency,
} from "@/components/forms/IncidentReportForm";
import { resolveNearestLocation } from "@/lib/locations";
import {
  isBrowserOffline,
  isLikelyNetworkError,
  type EmergencySmsDraft,
} from "@/lib/offline-storage";
import {
  DEFAULT_WILAYA,
  findCommuneInWilaya,
  getWilayaDefinition,
  resolveWilayaForCommune,
  type WilayaCode,
} from "@/lib/wilaya";
import {
  MODAL_BACKDROP_CLASS,
  MODAL_BODY_SCROLL_CLASS,
  MODAL_HEADER_CLASS,
  MODAL_SHELL_CLASS,
} from "@/lib/z-index";
import {
  darkFormInputClass,
  primaryNextButtonClass,
} from "@/lib/ui-labels";
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
  const [affectedFamilies, setAffectedFamilies] = useState(1);
  const [urgency, setUrgency] = useState<IncidentUrgency>("high");
  const [aidTags, setAidTags] = useState<IncidentAidTagId[]>([]);
  const [wilaya, setWilaya] = useState<WilayaCode>(DEFAULT_WILAYA);
  const [commune, setCommune] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [smsDraft, setSmsDraft] = useState<EmergencySmsDraft | null>(null);
  const [smsPayload, setSmsPayload] = useState<unknown>(null);

  const nearest = resolveNearestLocation(lat, lng);

  useEffect(() => {
    if (!open) return;
    const resolvedWilaya = resolveWilayaForCommune(
      nearest.name || nearest.name_ar,
      DEFAULT_WILAYA,
    );
    setWilaya(resolvedWilaya);
    const match =
      findCommuneInWilaya(resolvedWilaya, nearest.name) ??
      findCommuneInWilaya(resolvedWilaya, nearest.name_ar);
    setCommune(match?.name ?? "");
  }, [open, lat, lng, nearest.name, nearest.name_ar]);

  if (!open) return null;

  const communeMeta =
    findCommuneInWilaya(wilaya, commune) ??
    getWilayaDefinition(wilaya).communes[0];
  const communeLabelAr = communeMeta?.nameAr ?? nearest.name_ar;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!commune) {
      setError("اختر الولاية والبلدية.");
      return;
    }

    const locationLabel = communeLabelAr || nearest.landmark || "جيجل";
    const aidLine = formatAidTagsForDescription(aidTags);
    const urgencyLabel =
      urgency === "critical"
        ? "حرجة جداً"
        : urgency === "high"
          ? "متوسطة"
          : "عادية";
    const composedDescription = [
      description.trim() || "احتياج مسجّل من نقطة على الخريطة",
      `عدد العائلات المتضررة: ${affectedFamilies}`,
      `درجة الاستعجال: ${urgencyLabel}`,
      aidLine || null,
    ]
      .filter(Boolean)
      .join("\n");

    const offlineDraft: EmergencySmsDraft = {
      type: mode === "sos" || urgency === "critical" ? "SOS" : "ROAD",
      locationCodeOrName: locationLabel,
      urgency: urgency === "critical" ? "critical" : urgency,
      contactPhone: contactPhone.trim() || "unknown",
    };
    const offlinePayload = {
      mode,
      description: composedDescription,
      reporterName: contactName,
      contactPhone,
      daira: nearest.daira,
      commune: communeLabelAr,
      village: nearest.landmark,
      wilaya,
      lat,
      lng,
      affectedFamilies,
      urgency,
      aidTags,
    };

    if (isBrowserOffline()) {
      setSmsDraft(offlineDraft);
      setSmsPayload(offlinePayload);
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "sos" || urgency === "critical") {
        const result = await submitUrgentAlert({
          emergencyType: aidTags.includes("medical")
            ? "medical"
            : "water_cutoff",
          description: composedDescription,
          reporterName: contactName.trim() || "مواطن",
          reporterPhone: contactPhone.trim() || undefined,
          daira: nearest.daira,
          commune: communeLabelAr,
          village: nearest.landmark,
          lat,
          lng,
        });

        if (!result.success) {
          throw new Error(result.error ?? "تعذر إرسال نداء SOS.");
        }
      } else {
        const intakeCategory = aidTagToIntakeCategory(aidTags);
        const formData = new FormData();
        formData.set("intakeCategory", intakeCategory);
        formData.set("quantity", String(affectedFamilies));
        formData.set("unit", "عائلة");
        formData.set("description", composedDescription);
        formData.set("contactName", contactName.trim() || "منسق ميداني");
        formData.set("contactPhone", contactPhone.trim() || "0500000000");
        formData.set("commune", communeLabelAr);
        formData.set("village", nearest.landmark);
        formData.set("daira", nearest.daira_ar);
        formData.set("wilaya", wilaya);
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
      if (isLikelyNetworkError(submitError)) {
        setSmsDraft(offlineDraft);
        setSmsPayload(offlinePayload);
        return;
      }
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
    <>
      <div className={MODAL_BACKDROP_CLASS} onClick={onClose}>
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
                  سجل حدث طارئ جديد
                </h2>
                <p className="mt-1.5 text-xs text-slate-300">
                  أقرب نقطة: {nearest.name_ar} — {nearest.landmark}
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

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit}
          >
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

              <IncidentReportFields
                affectedFamilies={affectedFamilies}
                onAffectedFamiliesChange={setAffectedFamilies}
                urgency={urgency}
                onUrgencyChange={setUrgency}
                aidTags={aidTags}
                onAidTagsChange={setAidTags}
                wilaya={wilaya}
                onWilayaChange={setWilaya}
                commune={commune}
                onCommuneChange={setCommune}
              />

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

            <div className="shrink-0 space-y-3 border-t border-slate-800 bg-slate-900 p-5">
              <IncidentCoordinatesBanner lat={lat} lng={lng} />
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  primaryNextButtonClass,
                  "flex w-full items-center justify-center gap-2",
                )}
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

      {smsDraft ? (
        <OfflineSmsFallbackModal
          open
          draft={smsDraft}
          payload={smsPayload}
          onClose={() => {
            setSmsDraft(null);
            setSmsPayload(null);
          }}
        />
      ) : null}
    </>
  );
}
