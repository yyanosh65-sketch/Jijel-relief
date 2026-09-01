"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LocateFixed, X } from "lucide-react";

import { submitUrgentAlert } from "@/actions/emergency";
import NearestHelpBox from "@/components/emergency/NearestHelpBox";
import SosMediaCapture, {
  type SosMediaPayload,
} from "@/components/emergency/SosMediaCapture";
import { getCommuneCoordinates, getCommunesByDaira, getDairas, formatCommuneOptionLabel, formatDairaOptionLabel } from "@/lib/locations";
import { SOS_EMERGENCY_OPTIONS } from "@/lib/intelligence";
import {
  formInputClass,
  formTextareaClass,
  selectFieldClass,
} from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type SosFormState = {
  emergencyType: (typeof SOS_EMERGENCY_OPTIONS)[number]["value"] | "";
  description: string;
  reporterName: string;
  reporterPhone: string;
  daira: string;
  commune: string;
  village: string;
  lat: string;
  lng: string;
};

const INITIAL_FORM: SosFormState = {
  emergencyType: "",
  description: "",
  reporterName: "",
  reporterPhone: "",
  daira: "",
  commune: "",
  village: "",
  lat: "",
  lng: "",
};

const EMPTY_MEDIA: SosMediaPayload = {
  mediaUrls: [],
  voiceNoteData: null,
};

export default function SosAlertButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<SosFormState>(INITIAL_FORM);
  const [mediaPayload, setMediaPayload] = useState<SosMediaPayload>(EMPTY_MEDIA);
  const [hasGpsFix, setHasGpsFix] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const dairas = useMemo(() => getDairas(), []);
  const communes = useMemo(
    () => (form.daira ? getCommunesByDaira(form.daira) : []),
    [form.daira],
  );
  const selectedDairaAr = useMemo(
    () => dairas.find((daira) => daira.name === form.daira)?.name_ar ?? "",
    [dairas, form.daira],
  );

  const handleMediaChange = useCallback((payload: SosMediaPayload) => {
    setMediaPayload(payload);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    captureGps();
  }, [isOpen]);

  function captureGps() {
    setIsCapturingGps(true);
    setGpsMessage(null);

    if (!navigator.geolocation) {
      setGpsMessage("المتصفح لا يدعم GPS — استخدم اختيار البلدية.");
      setIsCapturingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          lat: position.coords.latitude.toFixed(6),
          lng: position.coords.longitude.toFixed(6),
        }));
        setHasGpsFix(true);
        setGpsMessage("تم تحديد موقعك بدقة عبر GPS.");
        setIsCapturingGps(false);
      },
      () => {
        setHasGpsFix(false);
        setGpsMessage("تعذر GPS — اختر البلدية والقرية أدناه.");
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function handleCommuneChange(communeName: string) {
    const coordinates = getCommuneCoordinates(communeName);

    setForm((current) => ({
      ...current,
      commune: communeName,
      lat: coordinates ? coordinates.lat.toFixed(6) : current.lat,
      lng: coordinates ? coordinates.lng.toFixed(6) : current.lng,
    }));

    if (coordinates) {
      setGpsMessage(
        hasGpsFix
          ? "تم تحديث المسافات من مركز البلدية المختارة."
          : "تم استخدام إحداثيات البلدية كبديل.",
      );
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.emergencyType) {
      setError("اختر نوع الطوارئ.");
      return;
    }

    if (!form.lat || !form.lng) {
      setError("الموقع مطلوب — فعّل GPS أو اختر بلدية.");
      return;
    }

    setIsSubmitting(true);

    const result = await submitUrgentAlert({
      emergencyType: form.emergencyType,
      description: form.description,
      reporterName: form.reporterName,
      reporterPhone: form.reporterPhone || undefined,
      daira: form.daira,
      commune: form.commune,
      village: form.village || undefined,
      lat: Number(form.lat),
      lng: Number(form.lng),
      mediaUrls: mediaPayload.mediaUrls,
      voiceNoteData: mediaPayload.voiceNoteData ?? undefined,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر الإرسال.");
      return;
    }

    setIsSuccess(true);
  }

  function handleClose() {
    setIsOpen(false);
    setForm(INITIAL_FORM);
    setMediaPayload(EMPTY_MEDIA);
    setHasGpsFix(false);
    setError(null);
    setGpsMessage(null);
    setIsSuccess(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="sos-floating-button fixed bottom-6 right-6 z-50 inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold leading-none text-white shadow-lg shadow-red-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-red-700"
        aria-label="إرسال نداء استغاثة عاجل"
      >
        <span className="text-base leading-none" aria-hidden>
          🚨
        </span>
        <span>نداء فزعة عاجل</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[3300] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            dir="rtl"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-red-700">
                  🚨 نداء فزعة عاجل
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1 text-red-600 hover:bg-red-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isSuccess ? (
              <div className="space-y-3 px-5 py-6 text-center">
                <p className="font-semibold text-emerald-700">
                  تم إرسال النداء! الفرق الميدانية ستتواصل معك.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <form className="space-y-4 px-5 py-6" onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-2">
                  {SOS_EMERGENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          emergencyType: option.value,
                        }))
                      }
                      className={cn(
                        "rounded-xl border px-2 py-3 text-right text-xs transition",
                        form.emergencyType === option.value
                          ? "border-red-600 bg-red-50 text-red-800"
                          : "border-zinc-200 hover:border-red-300",
                      )}
                    >
                      <span className="text-lg">{option.icon}</span>
                      <p className="mt-1 font-semibold">{option.labelAr}</p>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={captureGps}
                  disabled={isCapturingGps}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-medium text-red-800"
                >
                  {isCapturingGps ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                  تحديد الموقع بدقة (GPS)
                </button>

                {gpsMessage ? (
                  <p className="text-xs text-zinc-600">{gpsMessage}</p>
                ) : null}

                {form.lat && form.lng ? (
                  <p className="text-xs text-emerald-700">
                    الإحداثيات: {form.lat}, {form.lng}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
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
                      <option value="">
                        اختر الدائرة (مثل: الطاهير، العوانة...)
                      </option>
                      {dairas.map((daira) => (
                        <option key={daira.name} value={daira.name}>
                          {formatDairaOptionLabel(daira)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-600">
                      البلدية
                    </label>
                    <select
                      required
                      value={form.commune}
                      onChange={(event) =>
                        handleCommuneChange(event.target.value)
                      }
                      disabled={!form.daira}
                      className={cn(selectFieldClass, "disabled:bg-slate-100")}
                    >
                      <option value="">اختر البلدية</option>
                      {communes.map((commune) => (
                        <option
                          key={`${form.daira}-${commune.name}`}
                          value={commune.name}
                        >
                          {formatCommuneOptionLabel(commune, selectedDairaAr)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <NearestHelpBox
                  lat={form.lat}
                  lng={form.lng}
                  commune={form.commune}
                  daira={form.daira}
                  hasGps={hasGpsFix}
                />

                <input
                  type="text"
                  placeholder="القرية / الحي (اختياري)"
                  value={form.village}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      village: event.target.value,
                    }))
                  }
                  className={formInputClass}
                />

                <textarea
                  required
                  rows={3}
                  placeholder="صف الحالة الطارئة بالتفصيل..."
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={formTextareaClass}
                />

                <SosMediaCapture onChange={handleMediaChange} />

                <input
                  required
                  type="text"
                  placeholder="الاسم الكامل"
                  value={form.reporterName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reporterName: event.target.value,
                    }))
                  }
                  className={formInputClass}
                />

                <input
                  type="tel"
                  placeholder="رقم الهاتف (اختياري)"
                  value={form.reporterPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reporterPhone: event.target.value,
                    }))
                  }
                  className={formInputClass}
                />

                {error ? <p className="text-sm text-red-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "إرسال نداء الاستغاثة فوراً"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
