"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, LocateFixed, X } from "lucide-react";

import { submitSosAlert } from "@/actions/intelligence";
import { getCommuneCoordinates, getCommunesByDaira, getDairas } from "@/lib/locations";
import { SOS_EMERGENCY_OPTIONS } from "@/lib/intelligence";
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

export default function SosAlertButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<SosFormState>(INITIAL_FORM);
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
        setGpsMessage("تم تحديد موقعك بدقة عبر GPS.");
        setIsCapturingGps(false);
      },
      () => {
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

    if (coordinates && !currentHasGps()) {
      setGpsMessage("تم استخدام إحداثيات البلدية كبديل.");
    }
  }

  function currentHasGps(): boolean {
    return Boolean(form.lat && form.lng);
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

    const result = await submitSosAlert({
      emergencyType: form.emergencyType,
      description: form.description,
      reporterName: form.reporterName,
      reporterPhone: form.reporterPhone || undefined,
      daira: form.daira,
      commune: form.commune,
      village: form.village || undefined,
      lat: Number(form.lat),
      lng: Number(form.lng),
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
    setError(null);
    setGpsMessage(null);
    setIsSuccess(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="sos-floating-button fixed bottom-5 left-5 z-[3000] flex max-w-[min(90vw,320px)] items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-700"
        aria-label="إرسال نداء استغاثة عاجل"
      >
        <span className="text-lg">🚨</span>
        <span>إرسال نداء استغاثة عاجل (SOS)</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[3100] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            dir="rtl"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-red-700">
                  🚨 نداء استغاثة عاجل
                </h2>
                <p className="text-xs text-red-600/80">SOS Emergency Alert</p>
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
                      <p className="text-[10px] text-zinc-500">{option.labelFr}</p>
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

                <div className="grid grid-cols-2 gap-3">
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
                    className="min-h-11 rounded-xl border border-zinc-300 px-3 text-sm"
                  >
                    <option value="">الدائرة</option>
                    {dairas.map((daira) => (
                      <option key={daira.name} value={daira.name}>
                        {daira.name_ar}
                      </option>
                    ))}
                  </select>
                  <select
                    required
                    value={form.commune}
                    onChange={(event) => handleCommuneChange(event.target.value)}
                    disabled={!form.daira}
                    className="min-h-11 rounded-xl border border-zinc-300 px-3 text-sm disabled:bg-zinc-100"
                  >
                    <option value="">البلدية</option>
                    {communes.map((commune) => (
                      <option key={commune.name} value={commune.name}>
                        {commune.name_ar}
                      </option>
                    ))}
                  </select>
                </div>

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
                  className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
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
                  className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                />

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
                  className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
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
                  className="min-h-11 w-full rounded-xl border border-zinc-300 px-3 text-sm"
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
                    "إرسال النداء فوراً"
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
