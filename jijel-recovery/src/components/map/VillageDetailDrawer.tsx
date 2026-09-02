"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Camera,
  ClipboardList,
  Droplets,
  Loader2,
  MapPin,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  createVillageFieldReport,
  getVillageFieldReports,
  type FieldReportRecord,
} from "@/actions/field-reports";
import FieldReportMediaUpload from "@/components/forms/FieldReportMediaUpload";
import type { FieldInfrastructureStatus, FieldRoadPassability } from "@/db/schema";
import {
  FIELD_INFRASTRUCTURE_OPTIONS,
  FIELD_ROAD_OPTIONS,
  getFieldInfrastructureLabel,
  getFieldRoadLabel,
  getUrgentNeedLabel,
  URGENT_NEED_OPTIONS,
  type VillageFieldReportTarget,
} from "@/lib/field-reports";
import { premiumCardClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type VillageDetailDrawerProps = {
  target: VillageFieldReportTarget | null;
  open: boolean;
  onClose: () => void;
};

type FormState = {
  reporterName: string;
  reporterPhone: string;
  affectedFamilies: string;
  populationEstimate: string;
  roadPassability: FieldRoadPassability;
  waterStatus: FieldInfrastructureStatus;
  fodderStatus: FieldInfrastructureStatus;
  electricityStatus: FieldInfrastructureStatus;
  urgentNeeds: string[];
  notes: string;
  mediaUrls: string[];
};

const INITIAL_FORM: FormState = {
  reporterName: "",
  reporterPhone: "",
  affectedFamilies: "",
  populationEstimate: "",
  roadPassability: "rough_4x4",
  waterStatus: "unknown",
  fodderStatus: "unknown",
  electricityStatus: "unknown",
  urgentNeeds: [],
  notes: "",
  mediaUrls: [],
};

function StatusPill({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "emerald" | "amber" | "red" | "slate";
}) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-200",
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    red: "bg-red-100 text-red-900 border-red-200",
    slate: "bg-slate-100 text-slate-800 border-slate-200",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-bold",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}

function infrastructureTone(
  status: FieldInfrastructureStatus,
): "emerald" | "amber" | "red" | "slate" {
  if (status === "normal") return "emerald";
  if (status === "cut_off") return "red";
  if (status === "intermittent") return "amber";
  return "slate";
}

function roadTone(
  passability: FieldRoadPassability,
): "emerald" | "amber" | "red" {
  if (passability === "paved") return "emerald";
  if (passability === "closed") return "red";
  return "amber";
}

function formatReportDate(date: Date): string {
  return new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function isVideoUrl(url: string): boolean {
  return url.startsWith("data:video/") || /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export default function VillageDetailDrawer({
  target,
  open,
  onClose,
}: VillageDetailDrawerProps) {
  const [reports, setReports] = useState<FieldReportRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!target) return;

    setIsLoading(true);
    const result = await getVillageFieldReports({
      villageAr: target.villageAr,
      communeAr: target.communeAr,
      dairaAr: target.dairaAr,
    });
    setIsLoading(false);

    if (result.success && result.data) {
      setReports(result.data);
    }
  }, [target]);

  useEffect(() => {
    if (!open || !target) {
      return;
    }

    setForm(INITIAL_FORM);
    setError(null);
    setSuccess(null);
    void loadReports();
  }, [loadReports, open, target]);

  const allMedia = reports.flatMap((report) => report.mediaUrls);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!target) return;

    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const result = await createVillageFieldReport({
      villageAr: target.villageAr,
      commune: target.commune,
      communeAr: target.communeAr,
      daira: target.daira,
      dairaAr: target.dairaAr,
      lat: target.lat,
      lng: target.lng,
      reporterName: form.reporterName.trim(),
      reporterPhone: form.reporterPhone.trim(),
      affectedFamilies: form.affectedFamilies
        ? Number(form.affectedFamilies)
        : undefined,
      populationEstimate: form.populationEstimate
        ? Number(form.populationEstimate)
        : undefined,
      roadPassability: form.roadPassability,
      waterStatus: form.waterStatus,
      fodderStatus: form.fodderStatus,
      electricityStatus: form.electricityStatus,
      urgentNeeds: form.urgentNeeds,
      notes: form.notes.trim() || undefined,
      mediaUrls: form.mediaUrls,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "تعذر إرسال التقرير.");
      return;
    }

    setSuccess("تم إرسال التقرير الميداني بنجاح.");
    setForm(INITIAL_FORM);
    await loadReports();
  }

  function toggleUrgentNeed(id: string) {
    setForm((current) => ({
      ...current,
      urgentNeeds: current.urgentNeeds.includes(id)
        ? current.urgentNeeds.filter((item) => item !== id)
        : [...current.urgentNeeds, id],
    }));
  }

  if (!open || !target) {
    return null;
  }

  const latestReport = reports[0];
  const populationDisplay =
    target.population ??
    latestReport?.populationEstimate ??
    null;
  const familiesDisplay =
    target.totalFamilies ??
    latestReport?.affectedFamilies ??
    null;

  return (
    <div className="fixed inset-0 z-[3600] flex justify-start">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-slate-200/80 bg-gradient-to-b from-white to-slate-50 shadow-2xl"
      >
        <header className="border-b border-slate-200/80 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-emerald-700">
                مركز التحديثات الميدانية والوسائط
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-slate-900">
                {target.villageAr}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-600">
                بلدية {target.communeAr} · دائرة {target.dairaAr}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {populationDisplay ? (
              <StatusPill
                label={`السكان: ${populationDisplay.toLocaleString("ar-DZ")}`}
                tone="slate"
              />
            ) : null}
            {familiesDisplay ? (
              <StatusPill
                label={`العائلات المتضررة: ${familiesDisplay.toLocaleString("ar-DZ")}`}
                tone="amber"
              />
            ) : null}
            <StatusPill
              label={
                target.roadAccessibilityLabel ??
                (latestReport
                  ? getFieldRoadLabel(latestReport.roadPassability)
                  : "حالة المسلك غير موثقة")
              }
              tone={
                latestReport
                  ? roadTone(latestReport.roadPassability)
                  : "slate"
              }
            />
          </div>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className={cn(premiumCardClass, "p-4")}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <ClipboardList className="h-4 w-4 text-emerald-700" />
              المعاينة الميدانية والاحتياجات الحالية
            </h3>

            {isLoading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تحميل التقارير...
              </p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-slate-500">
                لا توجد تقارير ميدانية بعد — كن أول متطوع يوثّق الوضع من عين
                المكان.
              </p>
            ) : (
              <ul className="space-y-3">
                {reports.map((report) => (
                  <li
                    key={report.id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {report.reporterName}
                      </p>
                      <span className="text-[11px] text-slate-500">
                        {formatReportDate(report.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p>
                        <Users className="mb-0.5 inline h-3.5 w-3.5" />{" "}
                        {report.affectedFamilies != null
                          ? `${report.affectedFamilies} عائلة متضررة`
                          : "عدد العائلات غير محدد"}
                        {report.populationEstimate != null
                          ? ` · تقدير السكان ${report.populationEstimate.toLocaleString("ar-DZ")}`
                          : ""}
                      </p>
                      <p>
                        <MapPin className="mb-0.5 inline h-3.5 w-3.5" />{" "}
                        المسلك: {getFieldRoadLabel(report.roadPassability)}
                      </p>
                      <p>
                        <Droplets className="mb-0.5 inline h-3.5 w-3.5" />{" "}
                        الماء: {getFieldInfrastructureLabel(report.waterStatus)}
                        {" · "}
                        العلف:{" "}
                        {getFieldInfrastructureLabel(report.fodderStatus)}
                      </p>
                      <p>
                        <Zap className="mb-0.5 inline h-3.5 w-3.5" />{" "}
                        الكهرباء:{" "}
                        {getFieldInfrastructureLabel(report.electricityStatus)}
                      </p>
                      {report.urgentNeeds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {report.urgentNeeds.map((needId) => (
                            <span
                              key={needId}
                              className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700"
                            >
                              {getUrgentNeedLabel(needId)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {report.notes ? (
                        <p className="pt-1 leading-relaxed text-slate-600">
                          {report.notes}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cn(premiumCardClass, "p-4")}>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
              <Camera className="h-4 w-4 text-emerald-700" />
              معرض الصور والفيديوهات الميدانية
            </h3>

            {allMedia.length === 0 ? (
              <p className="text-sm text-slate-500">
                لا توجد صور أو فيديوهات مرفوعة بعد.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {allMedia.map((url, index) => (
                  <li
                    key={`${url.slice(0, 32)}-${index}`}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    {isVideoUrl(url) ? (
                      <video
                        src={url}
                        className="h-28 w-full object-cover"
                        controls
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`ميديا ميدانية ${index + 1}`}
                        className="h-28 w-full object-cover"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={cn(premiumCardClass, "border-emerald-200/80 p-4")}>
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              استمارة تحديث من عين المكان
            </h3>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  placeholder="رقم الهاتف"
                  value={form.reporterPhone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      reporterPhone: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  min={0}
                  placeholder="عدد العائلات المتضررة"
                  value={form.affectedFamilies}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      affectedFamilies: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
                <input
                  type="number"
                  min={0}
                  placeholder="تقدير عدد السكان"
                  value={form.populationEstimate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      populationEstimate: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  حالة المسلك / الطريق
                </p>
                <div className="flex flex-wrap gap-2">
                  {FIELD_ROAD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          roadPassability: option.value,
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-bold transition",
                        form.roadPassability === option.value
                          ? "border-emerald-600 bg-emerald-700 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-emerald-300",
                      )}
                    >
                      {option.labelAr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ["waterStatus", "الماء"],
                    ["fodderStatus", "العلف"],
                    ["electricityStatus", "الكهرباء"],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block text-xs font-semibold text-slate-700">
                    {label}
                    <select
                      value={form[field]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          [field]: event.target
                            .value as FieldInfrastructureStatus,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
                    >
                      {FIELD_INFRASTRUCTURE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.labelAr}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  احتياجات عاجلة ناقصة
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {URGENT_NEED_OPTIONS.map((option) => {
                    const checked = form.urgentNeeds.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold",
                          checked
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-700",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUrgentNeed(option.id)}
                          className="accent-emerald-700"
                        />
                        {option.labelAr}
                      </label>
                    );
                  })}
                </div>
              </div>

              <textarea
                rows={3}
                placeholder="ملاحظات إضافية عن الاحتياجات أو الوضع الميداني..."
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-600"
              />

              <FieldReportMediaUpload
                value={form.mediaUrls}
                onChange={(mediaUrls) =>
                  setForm((current) => ({ ...current, mediaUrls }))
                }
              />

              {error ? <p className="text-xs text-red-600">{error}</p> : null}
              {success ? (
                <p className="text-xs font-semibold text-emerald-700">
                  {success}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                إرسال التقرير الميداني
              </button>
            </form>
          </section>
        </div>
      </aside>
    </div>
  );
}
