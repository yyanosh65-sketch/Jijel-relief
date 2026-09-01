"use client";

import { useState } from "react";
import { Droplets, MapPin, Shield, Stethoscope, X, Zap } from "lucide-react";

import ContactActionButtons from "@/components/ui/ContactActionButtons";
import type { EmergencyFacility, VillageDossier } from "@/lib/intelligence";
import {
  INFRASTRUCTURE_LABELS,
  ROAD_PASSABILITY_LABELS,
} from "@/lib/intelligence";
import { buildWhatsAppUrl } from "@/lib/phone";
import { premiumCardClass } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type VillageDossierDrawerProps = {
  dossier: VillageDossier | null;
  facilities: EmergencyFacility[];
  open: boolean;
  onClose: () => void;
};

function DamageRing({ percent }: { percent: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative mx-auto h-28 w-28">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#e4e4e7"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#dc2626"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-red-600">{percent}%</span>
        <span className="text-[10px] text-zinc-500">أضرار</span>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const tones = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone],
      )}
    >
      {label}
    </span>
  );
}

function infrastructureTone(
  status: VillageDossier["waterStatus"],
): "green" | "amber" | "red" {
  if (status === "normal") return "green";
  if (status === "cut_off") return "red";
  return "amber";
}

function roadTone(
  passability: VillageDossier["roadPassability"],
): "green" | "amber" | "red" {
  if (passability === "open") return "green";
  if (passability === "closed") return "red";
  return "amber";
}

export default function VillageDossierDrawer({
  dossier,
  facilities,
  open,
  onClose,
}: VillageDossierDrawerProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "emergency">(
    "overview",
  );

  if (!open || !dossier) {
    return null;
  }

  const roadLabel = ROAD_PASSABILITY_LABELS[dossier.roadPassability];
  const waterLabel = INFRASTRUCTURE_LABELS[dossier.waterStatus];
  const electricityLabel = INFRASTRUCTURE_LABELS[dossier.electricityStatus];
  const coordinatorWhatsApp = buildWhatsAppUrl(
    dossier.coordinator.phone,
    `السلام، نحتاج تنسيق ميداني في ${dossier.name_ar}.`,
  );

  const veterinary = facilities.filter((f) => f.type === "veterinary");
  const civilProtection = facilities.filter((f) => f.type === "civil_protection");

  return (
    <div className="fixed inset-0 z-[3500] flex justify-start">
      <button
        type="button"
        aria-label="إغلاق"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <aside
        dir="rtl"
        className="relative z-10 flex h-full w-full max-w-md flex-col rounded-l-3xl border-l border-slate-200/80 bg-gradient-to-b from-white to-slate-50 shadow-2xl transition-transform duration-300 ease-out"
      >
        <header className="border-b border-slate-200/80 px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-emerald-700">
                {dossier.type === "daira" ? "دائرة" : "بلدية"} ·{" "}
                {dossier.daira_ar}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-slate-900">
                {dossier.name_ar}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div
            className={cn(
              premiumCardClass,
              "mt-4 flex items-center justify-between gap-3 p-3",
            )}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <span className="text-sm font-semibold text-slate-800">
                حالة المسلك والطريق
              </span>
            </div>
            <StatusBadge label={roadLabel.ar} tone={roadTone(dossier.roadPassability)} />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200",
                activeTab === "overview"
                  ? "bg-emerald-700 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              نظرة عامة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("emergency")}
              className={cn(
                "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200",
                activeTab === "emergency"
                  ? "bg-emerald-700 text-white shadow-md"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              خدمات الطوارئ
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview" ? (
            <div className="space-y-5">
              <section className={cn(premiumCardClass, "p-4")}>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  إحصائيات الخسائر والأسر المتضررة
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">السكان</p>
                    <p className="text-lg font-bold text-slate-900">
                      {dossier.population.toLocaleString("ar-DZ")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">العائلات</p>
                    <p className="text-lg font-bold text-slate-900">
                      {dossier.totalFamilies.toLocaleString("ar-DZ")}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-medium text-red-600">
                      عائلات متضررة
                    </p>
                    <p className="text-lg font-bold text-red-700">
                      {dossier.affectedFamilies.toLocaleString("ar-DZ")} /{" "}
                      {dossier.totalFamilies.toLocaleString("ar-DZ")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <DamageRing percent={dossier.damagePercent} />
                </div>
              </section>

              <section className={cn(premiumCardClass, "space-y-2 p-4")}>
                <h3 className="text-sm font-semibold text-slate-800">
                  البنية التحتية
                </h3>
                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">الماء</span>
                  </div>
                  <StatusBadge
                    label={waterLabel.ar}
                    tone={infrastructureTone(dossier.waterStatus)}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">الكهرباء</span>
                  </div>
                  <StatusBadge
                    label={electricityLabel.ar}
                    tone={infrastructureTone(dossier.electricityStatus)}
                  />
                </div>
              </section>

              <section
                className={cn(
                  premiumCardClass,
                  "border-emerald-200/80 bg-emerald-50/80 p-4",
                )}
              >
                <h3 className="mb-2 text-sm font-semibold text-emerald-900">
                  جهة التنسيق المباشرة
                  {dossier.coordinator.verified ? " ✓ موثّق" : ""}
                </h3>
                <p className="font-semibold text-slate-900">
                  {dossier.coordinator.name_ar}
                </p>
                <ContactActionButtons
                  phone={dossier.coordinator.phone}
                  whatsappUrl={coordinatorWhatsApp}
                  className="mt-3"
                />
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <section className={cn(premiumCardClass, "p-4")}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Stethoscope className="h-4 w-4" />
                  عيادات بيطرية قريبة
                </h3>
                <ul className="space-y-2">
                  {veterinary.length === 0 ? (
                    <li className="text-xs text-slate-500">
                      لا توجد عيادات بيطرية مسجّلة في النطاق القريب.
                    </li>
                  ) : null}
                  {veterinary.map((facility) => (
                    <li
                      key={facility.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3"
                    >
                      <p className="font-medium text-slate-900">
                        {facility.name_ar}
                      </p>
                      <ContactActionButtons
                        phone={facility.phone}
                        whatsappUrl={buildWhatsAppUrl(
                          facility.phone,
                          `السلام، نحتاج مساعدة بيطرية في ${dossier.name_ar}.`,
                        )}
                        className="mt-2"
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section className={cn(premiumCardClass, "p-4")}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Shield className="h-4 w-4" />
                  الحماية المدنية
                </h3>
                <ul className="space-y-2">
                  {civilProtection.length === 0 ? (
                    <li className="text-xs text-slate-500">
                      لا توجد وحدات حماية مدنية قريبة مسجّلة.
                    </li>
                  ) : null}
                  {civilProtection.map((facility) => (
                    <li
                      key={facility.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3"
                    >
                      <p className="font-medium text-slate-900">
                        {facility.name_ar}
                      </p>
                      <ContactActionButtons
                        phone={facility.phone}
                        whatsappUrl={buildWhatsAppUrl(
                          facility.phone,
                          `نداء استغاثة — ${dossier.name_ar}`,
                        )}
                        className="mt-2"
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
